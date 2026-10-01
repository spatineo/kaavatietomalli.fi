/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Plan Validator utilities for robust JSON line indexing,
 * path normalization, error pinpointing, and plain-language explanation generation.
 */

export interface ParsedJsonLine {
  lineNum: number;
  text: string;
  path: string;
  key?: string;
  startLine?: number;
  endLine?: number;
}

export interface GeometryInfo {
  path: string;
  typePath: string;
  lineNum: number;
  type?: string;
  coordinatesDepth?: number;
}

export interface JsonIndex {
  lines: ParsedJsonLine[];
  pathToLine: Map<string, number>;
  keyToLines: Map<string, number[]>;
  guidToLine: Map<string, number>;
  geometries: GeometryInfo[];
}

export interface RawValidationError {
  ruleId?: string;
  message?: string;
  localizedMessage?: {
    fi?: string;
    sv?: string;
    en?: string;
  };
  instance?: string;
  classKey?: string;
  severity?: 'Error' | 'Warning';
  [key: string]: any;
}

export interface EnrichedValidationError {
  ruleId?: string;
  field: string;
  message: string;
  friendlyMessage: string;
  explanation?: string;
  suggestion?: string;
  severity: 'Error' | 'Warning';
  resolvedLineNum: number;
  resolvedField: string;
  isFallback: boolean;
  originalMessage: string;
}

/** Known Ryhti schema properties per class for typo detection */
const KNOWN_CLASS_PROPERTIES: Record<string, string[]> = {
  ValidatePlan: [
    'planKey',
    'lifeCycleStatus',
    'planDescription',
    'geographicalArea',
    'planObjects',
    'planRegulationGroups',
    'planRegulationGroupRelations',
    'periodOfValidity',
    'administrativeAreaIdentifiers'
  ],
  RyhtiGeometry: ['srid', 'geometry'],
  Geometry: ['type', 'coordinates'],
  GeometryType: ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'],
  PlanObject: [
    'planObjectKey',
    'lifeCycleStatus',
    'name',
    'undergroundStatus',
    'geometry',
    'intendedUse',
    'description',
    'periodOfValidity',
    'sourceInformation'
  ],
  PlanRegulationGroup: [
    'planRegulationGroupKey',
    'titleOfPlanRegulation',
    'letterIdentifier',
    'colorCode',
    'planRegulations'
  ],
  PlanRegulation: [
    'planRegulationKey',
    'lifeCycleStatus',
    'type',
    'value',
    'additionalInformations',
    'verbalRegulations',
    'subjectIdentifiers'
  ],
  PlanRegulationGroupRelation: ['planObjectKey', 'planRegulationGroupKey'],
  LanguageString: ['fin', 'swe', 'eng', 'smn', 'sms', 'sme'],
  AdditionalInformation: ['type', 'value']
};

/**
 * Standard rule catalog based on official Ryhti validation rules (Suomen ympäristökeskus).
 * Maps normalized rule IDs to plain-language descriptions and suggestions.
 */
export const RYHTI_RULE_CATALOG: Record<string, { title: string; summary: string; hint?: string }> = {
  'quality__req_geom_spatialplan_area_reservation_cover': {
    title: 'Kaavan aluerajauksen kattavuus',
    summary: 'Lisätiedonlajiltaan pääkäyttötarkoituksen mukaiset aluevaraukset tulee peittää Kaava-luokan aluerajaus.',
    hint: 'Tarkista, että pääkäyttötarkoitusten alueet eivät ulotu kaavan ulkorajan ulkopuolelle.'
  },
  'quality__req_geom_codelist_additionalinfotype_mainuseclass_section_area': {
    title: 'Pääkäyttötarkoituksen liittäminen kohteeseen',
    summary: 'Vain Kaavakohde-luokan aluemaiseen geometriaan voi liittää kaavamääräyksen, jonka lisätiedonlaji on pääkäyttötarkoitus tai osa-alue.',
    hint: 'Varmista, että kaavakohteen geometria on Polygon tai MultiPolygon.'
  },
  'lifecycle__req_geom_spatialplancase_spatialplan_geographicarea_unity': {
    title: 'Kaava-asian ja kaavan aluerajausten yhtenevyys',
    summary: 'KaavaAsia-luokan ja Kaava-luokan aluerajaus tulee olla yhtenevä Hyväksytty kaava -elinkaaritilassa.'
  },
  'lifecycle__req_approval_date_mandatory': {
    title: 'Hyväksymispäivämäärä pakollinen',
    summary: 'Kaavan hyväksymispäivämäärä on pakollinen hyväksytyssä, lainvoimaisessa ja voimassa olevassa elinkaaritilassa.',
    hint: 'Lisää approvalDate / hyväksymispäivämäärä.'
  },
  'lifecycle__req_planusecase_spatialplan_lifecycles_unity': {
    title: 'Elinkaaritilojen yhtenevyys',
    summary: 'Kaavan alaisten kohteiden tulee olla samassa elinkaaritilassa kaavan kanssa.'
  },
  'lifecycle__req_spatialplan_lifecycles_unity': {
    title: 'Kohteiden elinkaaritila',
    summary: 'Kaavakohteiden ja määräysten elinkaaritilan tulee vastata kaavan elinkaaritilaa.'
  },
  'lifecycle__req_spatialplanreport_mandatory': {
    title: 'Kaavaselostus pakollinen',
    summary: 'Kaavaselostus on pakollinen hyväksytyssä, lainvoimaisessa ja voimassa olevassa kaavassa.'
  },
  'quality__req_property_not_empty': {
    title: 'Pakollinen kenttä puuttuu',
    summary: 'Pakolliset skeeman mukaiset attribuutit eivät saa olla tyhjiä sanomassa.',
    hint: 'Tarkista, että kaikilla pakollisilla kentillä on ei-tyhjä arvo.'
  },
  'quality__req_property_datatype_not_allowed': {
    title: 'Virheellinen tietotyyppi',
    summary: 'Attribuutin tietotyyppi ei ole skeeman mukainen.',
    hint: 'Tarkista, että arvo vastaa skeeman odottamaa tyyppiä (esim. merkkijono, luku tai objekti).'
  },
  'quality__req_geom_area_prohibited_cutting': {
    title: 'Aluegeometrian itseleikkaavuus',
    summary: 'Aluemaisen geometrian reunaviivat eivät saa leikata itseään tai toisiaan.',
    hint: 'Korjaa monikulmion reunaviivat siten, etteivät ne risteä keskenään.'
  },
  'quality__req_geom_area_edge_line_closure': {
    title: 'Geometrian reunaviiva ei sulkeudu',
    summary: 'Aluemaisen geometrian reunaviivan on oltava suljettu (ensimmäisen ja viimeisen koordinaattipisteen on oltava identtiset).',
    hint: 'Varmista, että rengasviivan ensimmäinen ja viimeinen piste ovat täsmälleen samat.'
  },
  'quality__req_geom_not_allowed': {
    title: 'Virheellinen geometria',
    summary: 'Geometria on virheellinen. Tarkista koordinaatit ja geometrian rakenne.'
  },
  'quality__req_geom_spatialplan_spatialplanobject_prohibited_cutting': {
    title: 'Kaavakohde ulottuu kaavarajan ulkopuolelle',
    summary: 'Kaavakohteet eivät saa mennä Kaavan aluerajauksen (geographicalArea) ulkopuolelle.',
    hint: 'Tarkista kaavakohteen koordinaatit suhteessa kaavan ulkorajaan.'
  },
  'quality__req_geom_spatialplanobject_spatialplanregulationtype_area_reservation_prohibited_cutting': {
    title: 'Pääkäyttötarkoitusten päällekkäisyys',
    summary: 'Lisätiedonlajiltaan pääkäyttötarkoitus olevat aluevaraukset eivät saa leikata toisiaan. Aluevarausten tulee muodostaa eheä yhtenäinen pinta.',
    hint: 'Varmista, että vierekkäisten pääkäyttötarkoitus-alueiden rajat eivät mene toistensa päälle.'
  },
  'quality__req_geom_coord_system_not_allowed': {
    title: 'Virheellinen koordinaatisto (SRID)',
    summary: 'Koordinaatiston (SRID) tulee olla sallittu (EPSG:3067 valtakunnallinen tai EPSG:3873-3885 kuntakohtaiset tasokoordinaatistot).',
    hint: 'Käytä srid-kentässä arvoa "3067" tai asianmukaista ETRS-GK-kaistaa (esim. "3880").'
  },
  'quality__req_geom_plansrid_mismatch': {
    title: 'Kaavakohteen koordinaatisto ei vastaa kaavan koordinaatistoa',
    summary: 'Kaikkien kaavakohteiden geometrioiden SRID:n on oltava sama kuin kaavan aluerajauksen SRID.',
    hint: 'Varmista, että kaikilla kaavakohteilla ja aluerajauksella on sama srid.'
  },
  'quality__req_geom_location_administrativearea': {
    title: 'Geometria ei sijaitse valitussa kunnassa',
    summary: 'Aluerajauksen geometrian tulee sijaita valitun kunnan tai hallinnollisen alueen rajojen sisällä.',
    hint: 'Tarkista, että olet valinnut oikean kunnan ja että koordinaatit ovat oikeassa koordinaatistossa ja järjestyksessä (itä, pohjoinen).'
  },
  'quality__req_geom_type_coordinates_mismatch': {
    title: 'Geometriatyyppi ja koordinaatit eivät vastaa toisiaan',
    summary: 'Geometrian koordinaattitaulukon syvyystaso ei vastaa ilmoitettua tyyppiä (esim. Point vaatii 1 tason [x, y], LineString 2 tasoa, Polygon 3 tasoa [[[x, y]...]], MultiPolygon 4 tasoa).',
    hint: 'Tarkista geometrian "type" ja "coordinates"-taulukon hakasulkujen määrä.'
  },
  'quality__req_geom_type_2d_polygon': {
    title: 'Virheellinen 2D-monikulmio',
    summary: '2D-aluegeometria (Polygon) ei ole kelvollinen.'
  },
  'quality__req_geom_type_2d_multipolygon': {
    title: 'Virheellinen 2D-monialuegeometria',
    summary: '2D-monialuegeometria (MultiPolygon) ei ole kelvollinen.'
  },
  'quality__req_spatialplanmap_mandatory': {
    title: 'Kaavakartta pakollinen',
    summary: 'Kaavan sisältäessä kaavakohteita kyseessä on tietomallimuotoinen kaava, jolloin kaavakartta on pakollinen.'
  },
  'quality__req_spatialplanregulationtype_reference_spatialplanobject': {
    title: 'Aluevarausviittaus puuttuu',
    summary: 'Kaavakohteen (rakennusala, ohjeellinen tontti tai sitova tontti) tulee viitata liittyvään pääkäyttötarkoituksen kaavakohteeseen.',
    hint: 'Aseta liittyväKohde-viittaus pääkäyttötarkoituksen kohteeseen.'
  },
  'quality__req_spatialplanregulationgroup_colorcode_form': {
    title: 'Virheellinen värikoodi',
    summary: 'Kaavamääräysryhmän värikoodin tulee olla heksamuodossa #123456.',
    hint: 'Käytä 6-merkkistä heksakoodia risuaidalla, esim. "#FFAF00".'
  },
  'quality__req_codelist_property_codevalue_not_allowed': {
    title: 'Koodiarvo ei kuulu koodistoon',
    summary: 'Attribuutille annettu koodiarvo ei ole sallittu kyseisessä Suomi.fi-koodistossa.',
    hint: 'Tarkista koodiston sallitut URI-koodiarvot koodistosivulta.'
  },
  'quality__req_codelist_property_codevalue_not_null': {
    title: 'Koodiarvo ei saa olla tyhjä',
    summary: 'Koodiarvoattribuutti on pakollinen eikä se saa olla tyhjä.'
  },
  'quality__req_spatialplanregulationtype_one_without_quantity_mandatory': {
    title: 'Määräysryhmästä puuttuu laadullinen määräys',
    summary: 'Kaavakohteeseen täytyy liittyä aina vähintään yksi kaavamääräys, joka ei ole pelkkä numeerinen suure.',
    hint: 'Liitä määräysryhmään pääkäyttötarkoitus tai muu laadullinen määräys.'
  },
  'quality__req_codelist_spatialplanregulation_verbal_regulation_codevalue': {
    title: 'Sanallisen määräyksen laji puuttuu',
    summary: 'Kun määräyslajiksi on valittu sanallinenMaarays, tulee sanallisen määräyksen lajikoodi (verbalRegulations) olla valittuna.'
  },
  'quality__req_codelist_spatialplanregulationtype_quantity_value_not_zero': {
    title: 'Suurearvon oltava nollaa suurempi',
    summary: 'Määräyksen numeerisen suurearvon tulee olla suurempi kuin 0.'
  },
  'quality__req_codelist_spatialplanregulationtype_quantity_value_not_null': {
    title: 'Suurearvo ei saa olla tyhjä',
    summary: 'Suureellisella määräyksellä tulee olla arvo.'
  },
  'quality__req_codelist_spatialplanregulationtype_quantity_value_number': {
    title: 'Suurearvon oltava luku',
    summary: 'Määräyksen suurearvon tulee olla numero.'
  },
  'quality__req_codelist_spatialplanregulationtype_quantity_value_text': {
    title: 'Suurearvon oltava tekstiä',
    summary: 'Määräyksen arvon tulee olla tekstimuotoinen.'
  },
  'quality__req_spatialplanid_plantype_conformity': {
    title: 'Kaavatunnus ei vastaa kaavalajia',
    summary: 'Pysyvän kaavatunnuksen etuliitteen (AK, YK, MK) tulee vastata valittua kaavalajia.',
    hint: 'Asemakaavoissa etuliite on AK, yleiskaavoissa YK ja maakuntakaavoissa MK.'
  },
  'quality__req_spatialplanid_form': {
    title: 'Virheellinen kaavatunnuksen muoto',
    summary: 'Pysyvän kaavatunnuksen tulee olla muotoa AK-123456, YK-123456 tai MK-123456.',
    hint: 'Tarkista, että etuliitteen jälkeen on väliviiva ja kuusi numeroa.'
  },
  'quality__req_spatialplanid_unique': {
    title: 'Kaavatunnus on jo käytössä',
    summary: 'Pysyvän kaavatunnuksen tulee olla uniikki koko maassa.',
    hint: 'Hae Ryhti-järjestelmästä uusi käyttämätön pysyvä kaavatunnus.'
  },
  'quality__req_future_date_not_allowed': {
    title: 'Päivämäärä tulevaisuudessa',
    summary: 'Päivämäärä ei voi olla tulevaisuudessa, vaan sen tulee olla tallennuspäivämäärä tai aiempi.'
  },
  'quality__req_generalregulationgroup_spatialplanregulation_not_empty': {
    title: 'Määräysryhmä on tyhjä',
    summary: 'Kaavamääräysryhmän tulee sisältää vähintään yksi kaavamääräys.'
  },
  'quality__req_codelist_additionalinfotype_mainuseclass_areareservation': {
    title: 'Pääkäyttötarkoituksen lisätieto',
    summary: 'Pääkäyttötarkoitus-lisätieto voidaan liittää vain aluevaraus-laajennuksen mukaiseen määräykseen.'
  },
  'quality__req_codelist_spatialplanregulation_additionalinfotype_only_one_mainuseclass': {
    title: 'Vain yksi pääkäyttötarkoitus sallittu',
    summary: 'Yhteen kaavamääräykseen saa liittyä enintään yksi pääkäyttötarkoituksen lisätieto.'
  },
  'quality__req_languagestring_not_empty': {
    title: 'Kielitetty teksti puuttuu',
    summary: 'Tekstimuotoinen arvo on annettava vähintään yhdellä kielellä (esim. fin).'
  },
  'quality__req_spatialplanobject_spatialplanregulationgroup_not_empty': {
    title: 'Kaavakohteelta puuttuu määräysryhmä',
    summary: 'Kaavakohteeseen tulee liittyä vähintään yksi kaavamääräysryhmä relaatioiden kautta.',
    hint: 'Lisää planRegulationGroupRelations-taulukkoon relaatio kaavakohteen ja määräysryhmän välille.'
  },
  'quality__req_spatialplanregulationgroup_spatialplanobject_not_empty': {
    title: 'Määräysryhmältä puuttuu kaavakohde',
    summary: 'Kaavamääräysryhmään tulee liittyä vähintään yksi kaavakohde (paitsi yleismääräyksissä).'
  },
  'quality__req_codelist_spatialplanregulationtype_allowed_datatypes': {
    title: 'Arvon tietotyyppi ei ole sallittu määräykselle',
    summary: 'Annettu arvo ei ole sallittua tietotyyppiä valitulle kaavamääräyslajille.'
  },
  'quality__req_geom_invalid': {
    title: 'Virheellinen geometria',
    summary: 'Geometria on virheellinen. Tarkista geometrian koordinaatit ja sulkeutuvuus.'
  },
  'quality__req_geom_outofbounds_finland': {
    title: 'Geometria Suomen rajojen ulkopuolella',
    summary: 'Geometria ei sijaitse Suomen rajojen sisällä. Tarkista koordinaatisto (SRID) sekä koordinaattien järjestys (X ja Y).',
    hint: 'Suomalaisissa koordinaatistoissa itäkoordinaatti (E) on yleensä ensimmäisenä ja pohjoiskoordinaatti (N) toisena.'
  },
  'quality__req_json_unknown_property': {
    title: 'Tuntematon kenttä',
    summary: 'JSON-sanoma sisältää kentän, jota ei ole määritelty Ryhti-tietomallissa.',
    hint: 'Tarkista kentän nimen kirjoitusasu ja poista ylimääräiset kentät.'
  },
  'quality__req_json_deserialization_failure': {
    title: 'JSON-muodostusvirhe',
    summary: 'JSON-sanoman rakenne tai tietotyyppi ei vastaa rajapinnan odottamaa mallia.',
    hint: 'Tarkista kenttien tietotyypit ja varmista, ettei pakollisia tietoja puutu.'
  },
  'quality__req_geom_block_not_allowed': {
    title: 'Korttelialuemääräys vain aluemaiselle kohteelle',
    summary: 'Korttelialue tai korttelialueen osa voidaan liittää ainoastaan kaavakohteeseen, joka on aluemainen (Polygon).'
  },
  'quality__req_geom_2d_z_value_not_allowed': {
    title: 'Z-arvot kielletty 2D-geometriassa',
    summary: '2D-geometria ei saa sisältää Z-korkeusarvoja. Käytä vain kaksiulotteisia pisteitä [x, y].'
  },
  'quality__req_geom_secondary_coordinates_not_allowed': {
    title: 'Toisteiset koordinaatit',
    summary: 'Peräkkäiset identtiset koordinaattipisteet eivät ole sallittuja geometriassa.'
  },
  'quality__req_geom_self_intersection_prohibited': {
    title: 'Geometrian itseleikkaavuus',
    summary: 'Geometrian reunaviiva ei saa leikata itseään.'
  },
  'quality__req_planregulationgroup_only_one_quantity_planregulation_is_valid': {
    title: 'Enintään yksi suureellinen määräys',
    summary: 'Kaavamääräysryhmässä voi olla enintään yksi suureellinen määräys (esim. kerrosala tai tehokkuusluku).'
  },
  'quality__req_regulationgroupkey_not_found': {
    title: 'Määräysryhmäavainta ei löydy',
    summary: 'Relaation määräysryhmäavaimelle (planRegulationGroupKey) ei löydy vastaavaa ryhmää.'
  },
  'quality__req_one_of_relations': {
    title: 'Kohteiden ja määräysten relaatiot puuttuvat',
    summary: 'Vähintään yksi kaavakohteen ja määräysryhmän välinen relaatio (planRegulationGroupRelations) on oltava mukana.'
  },
  'quality__req_municipality_codevalue_not_found': {
    title: 'Tuntematon kuntakoodi',
    summary: 'Annettu kuntakoodi ei ole voimassa oleva Suomen kuntanumero.'
  },
  'quality__req_planregulationgroup_letteridentifier_not_null': {
    title: 'Kirjaintunnus pakollinen',
    summary: 'Kaavamääräysryhmän kirjaintunnus (letterIdentifier) on pakollinen, kun ryhmään kuuluu pääkäyttötarkoitus.',
    hint: 'Anna kaavakartan mukainen merkintä, esim. "AK", "P", "A-1".'
  }
};

/**
 * Calculates Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Finds the closest candidate string for a suspected typo.
 */
export function findTypoSuggestion(suspectedProp: string, className?: string): string | null {
  const candidates: string[] = [];
  if (className && KNOWN_CLASS_PROPERTIES[className]) {
    candidates.push(...KNOWN_CLASS_PROPERTIES[className]);
  } else {
    Object.values(KNOWN_CLASS_PROPERTIES).forEach(list => {
      list.forEach(item => {
        if (!candidates.includes(item)) candidates.push(item);
      });
    });
  }

  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  const lowerSuspect = suspectedProp.toLowerCase();

  for (const candidate of candidates) {
    const dist = levenshteinDistance(lowerSuspect, candidate.toLowerCase());
    if (dist <= 3 && dist < bestDistance) {
      bestDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * Recursively measures coordinate array depth for GeoJSON coordinates.
 * Point: 1 ([x, y])
 * LineString / MultiPoint: 2 ([[x, y], ...])
 * Polygon / MultiLineString: 3 ([[[x, y], ...], ...])
 * MultiPolygon: 4 ([[[[x, y], ...], ...], ...])
 */
export function getCoordinatesDepth(coords: any): number {
  if (!Array.isArray(coords)) return 0;
  if (coords.length === 0) return 1;
  return 1 + getCoordinatesDepth(coords[0]);
}

/**
 * Parses JSON into an AST-like line index mapping every path, property, and GUID to exact line numbers.
 */
export function buildJsonIndex(jsonStr: string): JsonIndex {
  const lines = jsonStr.split('\n');
  const pathToLine = new Map<string, number>();
  const keyToLines = new Map<string, number[]>();
  const guidToLine = new Map<string, number>();
  const geometries: GeometryInfo[] = [];

  const addKeyLine = (k: string, line: number) => {
    const arr = keyToLines.get(k) || [];
    arr.push(line);
    keyToLines.set(k, arr);
  };

  const lineObjects: ParsedJsonLine[] = lines.map((text, idx) => ({
    lineNum: idx + 1,
    text,
    path: ''
  }));

  // Parse token by token to build exact path & line mapping
  interface StackFrame {
    type: 'object' | 'array';
    path: string;
    index: number;
    startLine: number;
  }

  const stack: StackFrame[] = [];
  let inString = false;
  let escapeNext = false;
  let currentString = '';
  let pendingKey: string | null = null;
  let pendingKeyLine: number = 1;
  let currentLine = 1;

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (ch === '\n') {
      currentLine++;
      continue;
    }

    if (inString) {
      if (escapeNext) {
        currentString += ch;
        escapeNext = false;
      } else if (ch === '\\') {
        escapeNext = true;
      } else if (ch === '"') {
        inString = false;
        // String token finished

        // Check if string is a GUID
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentString)) {
          guidToLine.set(currentString, currentLine);
        }

        // Peek next non-whitespace character
        let nextChar = '';
        for (let k = i + 1; k < jsonStr.length; k++) {
          if (!/\s/.test(jsonStr[k])) {
            nextChar = jsonStr[k];
            break;
          }
        }

        const top = stack[stack.length - 1];
        if (top && top.type === 'object' && nextChar === ':') {
          // This string was an object property key!
          pendingKey = currentString;
          pendingKeyLine = currentLine;
          addKeyLine(currentString, currentLine);
        } else if (top && top.type === 'array') {
          // Primitive string inside array
          const elemPath = `${top.path}[${top.index}]`;
          if (!pathToLine.has(elemPath)) {
            pathToLine.set(elemPath, currentLine);
          }
        } else if (pendingKey) {
          // Value of property
          const fullPath = top && top.path ? `${top.path}.${pendingKey}` : pendingKey;
          if (!pathToLine.has(fullPath)) {
            pathToLine.set(fullPath, currentLine);
          }
          pendingKey = null;
        }
      } else {
        currentString += ch;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      currentString = '';
      continue;
    }

    if (ch === '{') {
      const top = stack[stack.length - 1];
      let newPath = '';
      if (top) {
        if (top.type === 'array') {
          top.index++;
          newPath = `${top.path}[${top.index}]`;
        } else if (pendingKey) {
          newPath = top.path ? `${top.path}.${pendingKey}` : pendingKey;
          pendingKey = null;
        }
      } else if (pendingKey) {
        newPath = pendingKey;
        pendingKey = null;
      }

      stack.push({
        type: 'object',
        path: newPath,
        index: -1,
        startLine: currentLine
      });

      if (newPath && !pathToLine.has(newPath)) {
        pathToLine.set(newPath, currentLine);
      }
      continue;
    }

    if (ch === '}') {
      const popped = stack.pop();
      if (popped && popped.path) {
        // Tag corresponding lines
        for (let l = popped.startLine - 1; l < currentLine; l++) {
          if (!lineObjects[l].path) {
            lineObjects[l].path = popped.path;
          }
        }
      }
      pendingKey = null;
      continue;
    }

    if (ch === '[') {
      const top = stack[stack.length - 1];
      let newPath = '';
      if (top) {
        if (top.type === 'array') {
          top.index++;
          newPath = `${top.path}[${top.index}]`;
        } else if (pendingKey) {
          newPath = top.path ? `${top.path}.${pendingKey}` : pendingKey;
          pendingKey = null;
        }
      } else if (pendingKey) {
        newPath = pendingKey;
        pendingKey = null;
      }

      stack.push({
        type: 'array',
        path: newPath,
        index: -1,
        startLine: currentLine
      });

      if (newPath && !pathToLine.has(newPath)) {
        pathToLine.set(newPath, currentLine);
      }
      continue;
    }

    if (ch === ']') {
      const popped = stack.pop();
      if (popped && popped.path) {
        for (let l = popped.startLine - 1; l < currentLine; l++) {
          if (!lineObjects[l].path) {
            lineObjects[l].path = popped.path;
          }
        }
      }
      pendingKey = null;
      continue;
    }

    if (ch === ',') {
      pendingKey = null;
      continue;
    }

    // Number or boolean value handling
    if (!inString && pendingKey && (ch === '-' || (ch >= '0' && ch <= '9') || ch === 't' || ch === 'f' || ch === 'n')) {
      const top = stack[stack.length - 1];
      const fullPath = top && top.path ? `${top.path}.${pendingKey}` : pendingKey;
      if (!pathToLine.has(fullPath)) {
        pathToLine.set(fullPath, currentLine);
      }
      pendingKey = null;
    }
  }

  // Scan parsed JSON structure to extract geometry depths and types
  try {
    const doc = JSON.parse(jsonStr);
    const seenPaths = new Set<string>();

    const inspectGeom = (geomObj: any, path: string) => {
      if (!geomObj || typeof geomObj !== 'object' || seenPaths.has(path)) return;
      seenPaths.add(path);

      const type = geomObj.type || geomObj.Type;
      const coords = geomObj.coordinates || geomObj.Coordinates;
      const typePath = `${path}.type`;
      const lineNum = pathToLine.get(typePath) || pathToLine.get(path) || 1;
      const depth = getCoordinatesDepth(coords);

      geometries.push({
        path,
        typePath,
        lineNum,
        type,
        coordinatesDepth: depth
      });
    };

    const traverse = (obj: any, currentPath: string) => {
      if (!obj || typeof obj !== 'object') return;

      const hasType = typeof obj.type === 'string' || typeof obj.Type === 'string';
      const hasCoords = 'coordinates' in obj || 'Coordinates' in obj;
      if (hasType && hasCoords) {
        inspectGeom(obj, currentPath);
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, idx) => traverse(item, `${currentPath}[${idx}]`));
      } else {
        Object.keys(obj).forEach(key => {
          const childPath = currentPath ? `${currentPath}.${key}` : key;
          traverse(obj[key], childPath);
        });
      }
    };

    traverse(doc, '');
  } catch {
    // Non-JSON input
  }

  // Assign path for each line that does not have one
  lineObjects.forEach(l => {
    if (!l.path) {
      // Find matching path by looking for property declaration on that line
      const match = l.text.match(/"([^"]+)"\s*:/);
      if (match) {
        const key = match[1];
        l.key = key;
        // Search pathToLine for entries ending with this key
        for (const [p, line] of pathToLine.entries()) {
          if (line === l.lineNum) {
            l.path = p;
            break;
          }
        }
      }
    }
  });

  return {
    lines: lineObjects,
    pathToLine,
    keyToLines,
    guidToLine,
    geometries
  };
}

/**
 * Backwards compatible parseJsonToLines wrapper
 */
export function parseJsonToLines(jsonStr: string): { text: string; path: string; lineNum: number }[] {
  const index = buildJsonIndex(jsonStr);
  return index.lines.map(l => ({
    text: l.text,
    path: l.path,
    lineNum: l.lineNum
  }));
}

/**
 * Normalizes JSON path representation:
 * - strips leading "$." or "$"
 * - strips leading "plan." or "plan"
 * - converts "$[0]" array prefixes
 */
export function normalizePath(p: string): string {
  if (!p) return '';
  let cleaned = p.trim();

  // Strip leading "$" or "$."
  if (cleaned.startsWith('$.')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('$[')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned === '$') {
    cleaned = '';
  }

  // Strip leading "plan." or "plan"
  if (cleaned.startsWith('plan.')) {
    cleaned = cleaned.slice(5);
  } else if (cleaned === 'plan') {
    cleaned = '';
  }

  return cleaned;
}

/**
 * Returns parent path of a dot or bracket-indexed property path.
 */
export function getParentPath(path: string): string {
  if (!path) return '';

  if (path.endsWith(']')) {
    const lastOpenBracket = path.lastIndexOf('[');
    if (lastOpenBracket !== -1) {
      return path.slice(0, lastOpenBracket);
    }
  }

  const lastDot = path.lastIndexOf('.');
  if (lastDot !== -1) {
    return path.slice(0, lastDot);
  }

  return '';
}

/**
 * Filters out secondary/cascade noise errors like `instance: "planDto"`
 * when more specific schema/validation errors are already present.
 */
export function filterValidationErrors<T extends RawValidationError>(errors: T[]): T[] {
  if (!Array.isArray(errors) || errors.length <= 1) {
    return errors;
  }

  // Check if there are specific errors present
  const hasSpecificErrors = errors.some(
    e => e.instance !== 'planDto' && e.ruleId !== 'quality__req_json_deserialization_failure'
  );

  const hasSpecificDeserialization = errors.some(
    e => e.instance !== 'planDto' && e.ruleId === 'quality__req_json_deserialization_failure'
  );

  if (hasSpecificErrors || hasSpecificDeserialization) {
    return errors.filter(e => e.instance !== 'planDto');
  }

  return errors;
}

/**
 * Pinpoints the exact line number of an error using multi-strategy resolution:
 * 1. Normalized path match
 * 2. Array prefix expansion ($[0].field -> planObjects[0].field)
 * 3. classKey GUID match
 * 4. Quoted field name search from message
 * 5. Geometry coordinates/type mismatch detection
 * 6. Parent path fallback
 */
export function resolveErrorLocation(
  err: RawValidationError,
  index: JsonIndex,
  doc?: any
): { lineNum: number; field: string; isFallback: boolean } {
  const rawInstance = err.instance || '';
  const message = err.message || '';
  const ruleId = (err.ruleId || '').replace(/[\/\-]/g, '_');
  const classKey = err.classKey;

  let normalized = normalizePath(rawInstance);

  // Check if message specifically points out an invalid value (e.g. Provided 'Type' value Polygin)
  const typeValMatch = message.match(/Provided 'Type' value ([A-Za-z0-9_-]+)/);
  if (typeValMatch) {
    const invalidVal = typeValMatch[1];
    const matchLine = index.lines.find(l => l.text.includes(invalidVal));
    if (matchLine) {
      return {
        lineNum: matchLine.lineNum,
        field: `${normalized || 'geometry'}.type`,
        isFallback: false
      };
    }
  }

  // Strategy 1: Exact normalized path match in index
  if (normalized && index.pathToLine.has(normalized)) {
    return {
      lineNum: index.pathToLine.get(normalized)!,
      field: normalized,
      isFallback: false
    };
  }

  // Strategy 2: Array prefix expansion ($[i].prop or [i].prop)
  if (normalized.startsWith('[')) {
    // The validator reported an array index without the parent array property name
    const arrayMatch = normalized.match(/^\[(\d+)\](.*)$/);
    if (arrayMatch) {
      const idx = arrayMatch[1];
      const rest = arrayMatch[2]; // e.g. ".planObjectKea" or ".name.fun"

      // Check which array in the document contains this subpath or matches class in message
      const candidateArrays = ['planObjects', 'planRegulationGroups', 'planRegulationGroupRelations'];

      if (/PlanObject/i.test(message)) {
        candidateArrays.unshift('planObjects');
      } else if (/PlanRegulationGroupRelation/i.test(message)) {
        candidateArrays.unshift('planRegulationGroupRelations');
      } else if (/PlanRegulation/i.test(message)) {
        candidateArrays.unshift('planRegulationGroups');
      }

      for (const arrName of candidateArrays) {
        const fullCandidate = `${arrName}[${idx}]${rest}`;
        if (index.pathToLine.has(fullCandidate)) {
          return {
            lineNum: index.pathToLine.get(fullCandidate)!,
            field: fullCandidate,
            isFallback: false
          };
        }
      }

      // If specific subpath not found, check the array element itself
      for (const arrName of candidateArrays) {
        const elemCandidate = `${arrName}[${idx}]`;
        if (index.pathToLine.has(elemCandidate)) {
          return {
            lineNum: index.pathToLine.get(elemCandidate)!,
            field: elemCandidate,
            isFallback: true
          };
        }
      }
    }
  }

  // Strategy 3: Quoted property extraction from error message if path wasn't exact
  const unknownFieldMatch =
    message.match(/'([^']+)'\s*$/) ||
    message.match(/kentän:\s*'([^']+)'/) ||
    message.match(/field\s*:\s*'([^']+)'/) ||
    message.match(/field that does not belong to class '[^']+':\s*'([^']+)'/);

  if (unknownFieldMatch) {
    const propName = unknownFieldMatch[1];
    const matchingLines = index.keyToLines.get(propName);
    if (matchingLines && matchingLines.length > 0) {
      return {
        lineNum: matchingLines[0],
        field: propName,
        isFallback: false
      };
    }
  }

  // Strategy 3: classKey GUID matching
  if (classKey && index.guidToLine.has(classKey)) {
    const guidLine = index.guidToLine.get(classKey)!;

    // If an attribute was named in instance (e.g. undergroundStatus), look for it nearby
    const attrMatch = normalized.match(/([a-zA-Z0-9_]+)$/);
    if (attrMatch) {
      const attr = attrMatch[1];
      const keyLines = index.keyToLines.get(attr) || [];
      // Find line closest to guidLine (usually within the same object block)
      const closest = keyLines.find(l => Math.abs(l - guidLine) < 50);
      if (closest) {
        return {
          lineNum: closest,
          field: `${normalized}`,
          isFallback: false
        };
      }
    }

    return {
      lineNum: guidLine,
      field: normalized || classKey,
      isFallback: false
    };
  }

  // Strategy 5: Geometry coordinate / type mismatch detection
  if (
    ruleId.includes('geom_type_coordinates_mismatch') ||
    normalized.toLowerCase() === 'type' ||
    /GeometryType/i.test(message)
  ) {
    // Check all geometries in index for coordinates depth mismatch
    for (const geom of index.geometries) {
      const geomType = (geom.type || '').toLowerCase();
      const depth = geom.coordinatesDepth || 0;

      let mismatch = false;
      if (geomType === 'point' && depth !== 1) mismatch = true;
      if ((geomType === 'linestring' || geomType === 'multipoint') && depth !== 2) mismatch = true;
      if ((geomType === 'polygon' || geomType === 'multilinestring') && depth !== 3) mismatch = true;
      if (geomType === 'multipolygon' && depth !== 4) mismatch = true;

      if (mismatch) {
        return {
          lineNum: geom.lineNum,
          field: geom.typePath,
          isFallback: false
        };
      }
    }

    // Check if an invalid geometry type was provided (e.g. "Polygin")
    const typeValMatch = message.match(/Provided 'Type' value ([A-Za-z0-9_-]+)/);
    if (typeValMatch) {
      const invalidVal = typeValMatch[1];
      const matchLine = index.lines.find(l => l.text.includes(invalidVal));
      if (matchLine) {
        return {
          lineNum: matchLine.lineNum,
          field: `${normalized || 'geometry'}.type`,
          isFallback: false
        };
      }
    }

    // Default to first geometry type line if available
    if (index.geometries.length > 0) {
      return {
        lineNum: index.geometries[0].lineNum,
        field: index.geometries[0].typePath,
        isFallback: false
      };
    }
  }

  // Strategy 6: Hierarchical parent path fallback
  let parentPath = getParentPath(normalized);
  while (parentPath) {
    if (index.pathToLine.has(parentPath)) {
      return {
        lineNum: index.pathToLine.get(parentPath)!,
        field: parentPath,
        isFallback: true
      };
    }
    parentPath = getParentPath(parentPath);
  }

  // Strategy 7: Fallback to root (line 1)
  return {
    lineNum: 1,
    field: normalized || 'plan',
    isFallback: true
  };
}

/**
 * Generates tailored explanation and suggestion for geometry type & coordinate structure mismatches.
 */
export function getGeometryMismatchExplanation(
  actualType?: string,
  actualDepth?: number
): { friendlyMessage: string; explanation: string; suggestion: string } {
  const normType = actualType ? actualType.toLowerCase() : '';

  switch (normType) {
    case 'point': {
      const friendlyMessage = 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä (Point).';
      let explanation = 'Point-geometria (piste) vaatii yhden koordinaattiparin muodossa [x, y] (1 taulukkotaso).';
      let suggestion = 'Määritä koordinaatit muodossa [x, y] (yksi taso) tai valitse koordinaattirakennetta vastaava geometriatyyppi.';

      if (actualDepth === 2) {
        explanation =
          'Point-geometria (piste) vaatii koordinaattiparin muodossa [x, y] (1 taulukkotaso), mutta koordinaatit on annettu 2 tason taulukkorakenteena (kuten LineString tai MultiPoint [[x, y], ...]).';
        suggestion =
          'Poista ylimääräiset hakasulkeet niin että koordinaatit ovat muodossa [x, y], tai vaihda geometriatyypiksi "LineString" tai "MultiPoint".';
      } else if (actualDepth && actualDepth > 2) {
        explanation = `Point-geometria (piste) vaatii koordinaattiparin muodossa [x, y] (1 taulukkotaso), mutta koordinaatit on annettu ${actualDepth} tason sisäkkäisenä taulukkorakenteena.`;
        suggestion =
          'Poista ylimääräiset hakasulkeet niin että koordinaatit ovat muodossa [x, y], tai vaihda geometriatyyppiä.';
      }
      return { friendlyMessage, explanation, suggestion };
    }

    case 'linestring': {
      const friendlyMessage = 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä (LineString).';
      let explanation = 'LineString-geometria (viiva) vaatii pistelistan muodossa [[x, y], [x, y], ...] (2 taulukkotasoa).';
      let suggestion = 'Tarkista "coordinates"-taulukon hakasulkujen syvyys (odotettu: 2 tasoa [[x, y], ...]).';

      if (actualDepth === 1) {
        explanation =
          'LineString-geometria (viiva) vaatii pistelistan muodossa [[x, y], [x, y], ...] (2 taulukkotasoa), mutta koordinaatit on annettu yksittäisenä pisteparina [x, y] (1 taso).';
        suggestion =
          'Lisää vähintään toinen koordinaattipari ja ympäröivät hakasulkeet muodossa [[x1, y1], [x2, y2]], tai vaihda geometriatyypiksi "Point".';
      } else if (actualDepth === 3) {
        explanation =
          'LineString-geometria (viiva) vaatii 2 taulukkotasoa [[x, y], ...], mutta koordinaatit on annettu 3 tason taulukkorakenteena (kuten Polygon [[[x, y], ...]]).';
        suggestion =
          'Poista ylimääräiset hakasulkeet tai vaihda geometriatyypiksi "Polygon" tai "MultiLineString".';
      } else if (actualDepth === 4) {
        explanation =
          'LineString-geometria (viiva) vaatii 2 taulukkotasoa [[x, y], ...], mutta koordinaatit on annettu 4 tason taulukkorakenteena (MultiPolygon).';
        suggestion =
          'Poista ylimääräiset hakasulkeet tai vaihda geometriatyypiksi "MultiPolygon".';
      }
      return { friendlyMessage, explanation, suggestion };
    }

    case 'multipoint': {
      const friendlyMessage = 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä (MultiPoint).';
      let explanation =
        'MultiPoint-geometria (pistekokoelma) vaatii taulukon pistepareista muodossa [[x, y], ...] (2 taulukkotasoa).';
      let suggestion = 'Tarkista "coordinates"-taulukon hakasulkujen syvyys (odotettu: 2 tasoa [[x, y], ...]).';

      if (actualDepth === 1) {
        explanation =
          'MultiPoint-geometria (pistekokoelma) vaatii taulukon pistepareista [[x, y], ...] (2 taulukkotasoa), mutta koordinaatit on annettu yksittäisenä pisteenä [x, y] (1 taso).';
        suggestion = 'Kääri pistepari hakasulkeisiin [[x, y]] tai vaihda geometriatyypiksi "Point".';
      }
      return { friendlyMessage, explanation, suggestion };
    }

    case 'polygon': {
      const friendlyMessage = 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä (Polygon).';
      let explanation =
        'Polygon-geometria (monikulmio) vaatii 3 sisäkkäistä taulukkotasoa [[[x, y], ...]] (ulkoreuna ja mahdolliset sisäreiät).';
      let suggestion = 'Tarkista "coordinates"-taulukon hakasulkujen syvyys (odotettu: 3 tasoa [[[x, y], ...]]).';

      if (actualDepth === 4) {
        explanation =
          'Polygon-geometria (monikulmio) vaatii 3 sisäkkäistä taulukkotasoa [[[x, y], ...]], mutta koordinaatit on annettu 4 tason monialueena (MultiPolygon [[[[x, y], ...]]]]).';
        suggestion = 'Tarkista "coordinates"-taulukon hakasulkujen syvyys tai vaihda geometriatyypiksi "MultiPolygon".';
      } else if (actualDepth === 2) {
        explanation =
          'Polygon-geometria (monikulmio) vaatii 3 sisäkkäistä taulukkotasoa [[[x, y], ...]] (rengasviivat), mutta koordinaatit on annettu 2 tason pistelistana [[x, y], ...].';
        suggestion =
          'Lisää puuttuvat rengasviivan hakasulkeet [[[x, y], ...]] tai vaihda geometriatyypiksi "LineString".';
      } else if (actualDepth === 1) {
        explanation =
          'Polygon-geometria (monikulmio) vaatii 3 sisäkkäistä taulukkotasoa [[[x, y], ...]], mutta koordinaatit on annettu 1 tason pisteenä [x, y].';
        suggestion = 'Määritä monikulmion rengasviiva muodossa [[[x, y], ...]] tai vaihda geometriatyypiksi "Point".';
      }
      return { friendlyMessage, explanation, suggestion };
    }

    case 'multipolygon': {
      const friendlyMessage = 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä (MultiPolygon).';
      let explanation =
        'MultiPolygon-geometria (monialue) vaatii 4 sisäkkäistä taulukkotasoa [[[[x, y], ...]]]].';
      let suggestion = 'Tarkista "coordinates"-taulukon hakasulkujen syvyys (odotettu: 4 tasoa [[[[x, y], ...]]]]).';

      if (actualDepth === 3) {
        explanation =
          'MultiPolygon-geometria (monialue) vaatii 4 sisäkkäistä taulukkotasoa [[[[x, y], ...]]]], mutta koordinaatit on annettu 3 tason yksittäisenä monikulmiona (Polygon [[[x, y], ...]]).';
        suggestion = 'Vaihda geometriatyypiksi "Polygon" tai lisää monialueen hakasulkeet [[[[x, y], ...]]]].';
      } else if (actualDepth === 2) {
        explanation =
          'MultiPolygon-geometria (monialue) vaatii 4 sisäkkäistä taulukkotasoa [[[[x, y], ...]]]], mutta koordinaatit on annettu 2 tason pistelistana.';
        suggestion = 'Varmista koordinaattien rakenne tai vaihda geometriatyypiksi "LineString" tai "MultiPoint".';
      } else if (actualDepth === 1) {
        explanation =
          'MultiPolygon-geometria (monialue) vaatii 4 sisäkkäistä taulukkotasoa [[[[x, y], ...]]]], mutta koordinaatit on annettu 1 tason pisteenä.';
        suggestion = 'Varmista koordinaattien rakenne tai vaihda geometriatyypiksi "Point".';
      }
      return { friendlyMessage, explanation, suggestion };
    }

    case 'multilinestring': {
      const friendlyMessage = 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä (MultiLineString).';
      let explanation =
        'MultiLineString-geometria (moniviiva) vaatii 3 sisäkkäistä taulukkotasoa [[[x, y], ...]].';
      let suggestion = 'Tarkista "coordinates"-taulukon hakasulkujen syvyys (odotettu: 3 tasoa [[[x, y], ...]]).';

      if (actualDepth === 2) {
        explanation =
          'MultiLineString-geometria (moniviiva) vaatii 3 sisäkkäistä taulukkotasoa [[[x, y], ...]], mutta koordinaatit on annettu 2 tason yksittäisenä viivana [[x, y], ...].';
        suggestion = 'Vaihda geometriatyypiksi "LineString" tai kääri viivat hakasulkeisiin [[[x, y], ...]].';
      }
      return { friendlyMessage, explanation, suggestion };
    }

    default:
      return {
        friendlyMessage: 'Geometrian koordinaattien rakenne ei vastaa ilmoitettua geometriatyyppiä.',
        explanation:
          'GeoJSON-geometriatyypeillä on eri vaatimukset koordinaattien hakasulkujen tasoille: Point vaatii 1 tason [x, y], LineString ja MultiPoint 2 tasoa [[x, y], ...], Polygon ja MultiLineString 3 tasoa [[[x, y], ...]], ja MultiPolygon 4 tasoa [[[[x, y], ...]]].',
        suggestion: 'Tarkista "coordinates"-taulukon hakasulkujen syvyys suhteessa valittuun "type"-arvoon.'
      };
  }
}

/**
 * Formats user-friendly Finnish explanation and helpful suggestions for any validation error.
 */
export function formatFriendlyErrorMessage(
  err: RawValidationError,
  resolvedField: string,
  index?: JsonIndex,
  doc?: any
): { friendlyMessage: string; explanation?: string; suggestion?: string } {
  const ruleId = (err.ruleId || '').replace(/[\/\-]/g, '_');
  const message = err.message || '';
  const localizedMsg = err.localizedMessage?.fi || err.localizedMessage?.en || message;

  // 1. Unknown Property Errors
  if (ruleId.includes('unknown_property') || /does not belong to class/i.test(message)) {
    const classMatch = message.match(/class '([^']+)'/);
    const fieldMatch = message.match(/'([^']+)'\s*$/) || message.match(/kentän:\s*'([^']+)'/);
    const cls = classMatch ? classMatch[1] : '';
    const prop = fieldMatch ? fieldMatch[1] : resolvedField;

    const typoSuggestion = prop ? findTypoSuggestion(prop, cls) : null;
    const suggestionText = typoSuggestion ? `Tarkoititko mahdollisesti kenttää "${typoSuggestion}"?` : undefined;

    return {
      friendlyMessage: `Tuntematon kenttä "${prop}"${cls ? ` luokassa ${cls}` : ''}.`,
      explanation: `Ryhti-tietomallissa ei ole määritelty kenttää "${prop}". Varmista, että kentän nimi on kirjoitettu oikein ja poista tarpeettomat kentät.`,
      suggestion: suggestionText
    };
  }

  // 2. Geometry Type / Coordinate Mismatch
  if (
    ruleId.includes('geom_type_coordinates_mismatch') ||
    /coordinates do not correspond to the geometry type/i.test(message)
  ) {
    let geomInfo: GeometryInfo | undefined;

    if (index?.geometries && index.geometries.length > 0) {
      geomInfo = index.geometries.find(
        g => g.typePath === resolvedField || g.path === resolvedField || resolvedField.startsWith(g.path)
      );

      if (!geomInfo) {
        geomInfo = index.geometries.find(g => {
          const gt = (g.type || '').toLowerCase();
          const d = g.coordinatesDepth || 0;
          if (gt === 'point' && d !== 1) return true;
          if ((gt === 'linestring' || gt === 'multipoint') && d !== 2) return true;
          if ((gt === 'polygon' || gt === 'multilinestring') && d !== 3) return true;
          if (gt === 'multipolygon' && d !== 4) return true;
          return false;
        });
      }

      if (!geomInfo) {
        geomInfo = index.geometries[0];
      }
    }

    // Check if type is found directly in doc if available
    let actualType = geomInfo?.type;
    let actualDepth = geomInfo?.coordinatesDepth;

    if (!actualType && doc) {
      const typeMatch = resolvedField.includes('geographicalArea')
        ? doc.geographicalArea?.geometry?.type
        : undefined;
      if (typeMatch) actualType = typeMatch;
    }

    return getGeometryMismatchExplanation(actualType, actualDepth);
  }

  // 3. Invalid GeometryType String (e.g. Polygin)
  if (/Provided 'Type' value ([A-Za-z0-9_-]+) was not valid GeometryType/i.test(message)) {
    const match = message.match(/Provided 'Type' value ([A-Za-z0-9_-]+)/);
    const val = match ? match[1] : '';
    const suggestion = findTypoSuggestion(val, 'Geometry');
    return {
      friendlyMessage: `Virheellinen geometriatyyppi "${val}".`,
      explanation: 'Sallittuja geometriatyyppejä ovat Point, MultiPoint, LineString, MultiLineString, Polygon ja MultiPolygon.',
      suggestion: suggestion ? `Tarkoititko: "${suggestion}"?` : 'Käytä tyyppinä esimerkiksi "Polygon".'
    };
  }

  // 3.5. Invalid Codelist value error inside deserialization failure message
  const codelistValueMatch = message.match(/'(http:\/\/uri\.suomi\.fi\/codelist\/[^']+)'\s+is\s+not\s+valid\s+value\s+for\s+E([A-Za-z0-9_-]+)/i);
  if (codelistValueMatch) {
    const fullUri = codelistValueMatch[1];
    const typeName = codelistValueMatch[2]; // e.g., PlanRegulationAdditionalInfoType
    
    const uriParts = fullUri.split('/');
    const invalidValue = uriParts[uriParts.length - 1] || '';
    
    let codelistName = 'koodisto';
    const codeIdx = uriParts.lastIndexOf('code');
    const codesIdx = uriParts.lastIndexOf('codes');
    const splitIdx = codeIdx !== -1 ? codeIdx : codesIdx;
    
    if (splitIdx !== -1 && splitIdx > 0) {
      codelistName = uriParts[splitIdx - 1];
    } else {
      const codelistIdx = uriParts.indexOf('codelist');
      if (codelistIdx !== -1 && uriParts.length > codelistIdx + 2) {
        codelistName = uriParts[codelistIdx + 2];
      }
    }

    return {
      friendlyMessage: `Virheellinen koodistoarvo "${invalidValue}" kentässä "${resolvedField}".`,
      explanation: `Annettu arvo "${invalidValue}" ei vastaa sallittuja koodistoarvoja tietomalliluokassa "${typeName}" vaaditusta koodistosta "${codelistName}".`,
      suggestion: `Varmista, että käytät sallittua koodistoarvoa koodistosta "${codelistName}". Voit tarkistaa sallitut arvot koodiston URI-osoitteesta.`
    };
  }

  // 4. Deserialization failure with type conversion
  if (/could not be converted to/i.test(message)) {
    const pathMatch = message.match(/Path:\s*(\S+)/);
    const targetPath = pathMatch ? pathMatch[1] : resolvedField;
    return {
      friendlyMessage: `Kentän "${targetPath}" arvo on väärää tietotyyppiä.`,
      explanation: 'Kentän arvo ei vastaa skeeman vaatimaa muotoa (esim. merkkijonon tilalle on annettu taulukko tai luku).',
      suggestion: 'Tarkista kentän arvon tyyppi ja muotoilu.'
    };
  }

  // 5. Codelist codevalue not allowed
  if (ruleId.includes('codelist_property_codevalue_not_allowed')) {
    const codelistMatch = message.match(/code list\s+(\S+)/) || message.match(/koodistoon\s+(\S+)/);
    const codelistUri = codelistMatch ? codelistMatch[1].replace(/\.$/, '') : '';
    const codelistName = codelistUri.split('/').pop() || 'koodisto';

    return {
      friendlyMessage: `Virheellinen koodiarvo kentässä "${resolvedField}".`,
      explanation: `Annettu koodiarvo ei kuulu sallittuun koodistoon (${codelistName}).`,
      suggestion: codelistUri ? `Tarkista sallitut koodiarvot osoitteesta ${codelistUri}` : undefined
    };
  }

  // 6. Geometry not in administrative area
  if (ruleId.includes('geom_location_administrativearea')) {
    return {
      friendlyMessage: 'Kaavan aluerajaus ei sijaitse valitun kunnan tai maakunnan alueella.',
      explanation:
        'Kaavan geometrian tulee sijaita kokonaan sen kunnan rajojen sisällä, jolle kaava on osoitettu. Huomaa, että koordinaattien tulee olla oikeassa koordinaatistossa (esim. EPSG:3067 tai EPSG:3880) ja järjestyksessä (itäkoordinaatti ensin, sitten pohjoiskoordinaatti).',
      suggestion: 'Tarkista alasvetovalikosta valittu kunta sekä geometrian SRID ja koordinaattipisteet.'
    };
  }

  // 7. Check official Ryhti Rule Catalog for standard explanations
  const catalogEntry = RYHTI_RULE_CATALOG[ruleId];
  if (catalogEntry) {
    return {
      friendlyMessage: catalogEntry.title,
      explanation: catalogEntry.summary,
      suggestion: catalogEntry.hint
    };
  }

  // 8. Default fallback to localized message from API
  return {
    friendlyMessage: localizedMsg || message,
    explanation: message !== localizedMsg ? message : undefined
  };
}
