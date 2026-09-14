import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { isContentEqual } from './content-utils';
import { CONFIG } from '../src/config';

dotenv.config();

export interface MunicipalityInfo {
  id: string;
  natcode: string;
  kuntatunnus?: number;
  nameFin: string;
  nameSwe?: string;
  numberOfDetailedPlansInRyhti?: number;
}

export interface MunicipalityFeature {
  id: string;
  type: 'Feature';
  geometry: any;
  properties: {
    kuntatunnus?: number;
    NATCODE?: string;
    NAMEFIN?: string;
    NAMESWE?: string;
    [key: string]: any;
  };
}

export interface MunicipalityFeatureCollection {
  type: 'FeatureCollection';
  numberMatched?: number;
  numberReturned?: number;
  features: MunicipalityFeature[];
  [key: string]: any;
}

export interface MunicipalityNameMap {
  [code: string]: {
    fi: string;
    sv?: string;
    en?: string;
  };
}

export interface FetchMunicipalitiesOptions {
  outputBaseDir?: string;
  codelistPath?: string;
  apiKey?: string;
  testRawPath?: string;
}

/**
 * Extracts and maps municipality code names from a Suomi.fi codelist JSON or codes array.
 */
export function extractMunicipalityNamesFromCodelist(codelistData: any): MunicipalityNameMap {
  const nameMap: MunicipalityNameMap = {};
  if (!codelistData) return nameMap;

  const codes = Array.isArray(codelistData)
    ? codelistData
    : Array.isArray(codelistData.codes)
    ? codelistData.codes
    : Array.isArray(codelistData.results)
    ? codelistData.results
    : [];

  codes.forEach((item: any) => {
    const rawCode = String(item.codeValue || item.id || '').trim();
    if (!rawCode) return;

    const padCode = rawCode.padStart(3, '0');
    const fi = typeof item.prefLabel?.fi === 'string'
      ? item.prefLabel.fi
      : typeof item.names?.fi === 'string'
      ? item.names.fi
      : typeof item.prefLabel === 'string'
      ? item.prefLabel
      : typeof item.names === 'string'
      ? item.names
      : typeof item.name === 'string'
      ? item.name
      : typeof item.name?.fi === 'string'
      ? item.name.fi
      : '';

    const sv = typeof item.prefLabel?.sv === 'string'
      ? item.prefLabel.sv
      : typeof item.names?.sv === 'string'
      ? item.names.sv
      : typeof item.name?.sv === 'string'
      ? item.name.sv
      : undefined;

    const en = typeof item.prefLabel?.en === 'string'
      ? item.prefLabel.en
      : typeof item.names?.en === 'string'
      ? item.names.en
      : typeof item.name?.en === 'string'
      ? item.name.en
      : undefined;

    if (fi || sv) {
      const entry = { fi: fi || sv || '', sv: sv || fi, en };
      nameMap[padCode] = entry;
      const unpadded = String(parseInt(padCode, 10));
      nameMap[unpadded] = entry;
      nameMap[rawCode] = entry;
    }
  });

  return nameMap;
}

/**
 * Enriches raw NLS municipality features with padded NATCODE and localized names.
 */
export function enrichMunicipalityFeatures(
  rawFeatures: any[],
  nameMap: MunicipalityNameMap
): MunicipalityFeature[] {
  if (!Array.isArray(rawFeatures)) return [];

  const enriched: MunicipalityFeature[] = rawFeatures.map((feat) => {
    const rawCode = String(
      feat.properties?.kuntatunnus ??
      feat.properties?.NATCODE ??
      feat.id?.replace(/^kunta\./, '') ??
      ''
    ).trim();

    const natcode = rawCode ? rawCode.padStart(3, '0') : '';
    const nameInfo = natcode ? nameMap[natcode] || nameMap[rawCode] : undefined;

    const nameFin =
      (typeof nameInfo?.fi === 'string' && nameInfo.fi) ||
      (typeof feat.properties?.NAMEFIN === 'string' && feat.properties.NAMEFIN) ||
      (typeof feat.properties?.nimi_fi === 'string' && feat.properties.nimi_fi) ||
      (typeof feat.properties?.name === 'string' && feat.properties.name) ||
      (natcode ? `Kunta ${natcode}` : 'Tuntematon kunta');

    const nameSwe =
      (typeof nameInfo?.sv === 'string' && nameInfo.sv) ||
      (typeof feat.properties?.NAMESWE === 'string' && feat.properties.NAMESWE) ||
      (typeof feat.properties?.nimi_se === 'string' && feat.properties.nimi_se) ||
      undefined;

    const kuntatunnusNum = natcode ? parseInt(natcode, 10) : undefined;

    return {
      id: feat.id || (natcode ? `kunta.${natcode}` : `kunta.${Math.random()}`),
      type: 'Feature' as const,
      geometry: feat.geometry,
      properties: {
        ...feat.properties,
        kuntatunnus: kuntatunnusNum !== undefined && !isNaN(kuntatunnusNum) ? kuntatunnusNum : feat.properties?.kuntatunnus,
        NATCODE: natcode,
        NAMEFIN: nameFin,
        ...(nameSwe ? { NAMESWE: nameSwe } : {})
      }
    };
  });

  // Sort alphabetically by Finnish name
  enriched.sort((a, b) =>
    String(a.properties?.NAMEFIN || '').localeCompare(String(b.properties?.NAMEFIN || ''), 'fi')
  );

  return enriched;
}

const RYHTI_PLAN_ITEMS_URL = 'https://paikkatiedot.ymparisto.fi/geoserver/ryhti_plan/ogc/features/v1/collections/pub_valid_ld_plan_ix_gs/items';

export async function fetchPlanCountForMunicipality(natcode: string): Promise<number> {
  const code = natcode.trim();
  if (!code) return 0;
  const filterExpr = `administrative_area_identifiers = '["${code}"]'`;
  const params = new URLSearchParams({
    filter: filterExpr,
    'filter-lang': 'cql2-text',
    limit: '1',
    f: 'json'
  });
  const url = `${RYHTI_PLAN_ITEMS_URL}?${params.toString()}`;

  try {
    const res = await fetch(url, { ...CONFIG.remoteFetchOptions });
    if (!res.ok) {
      console.warn(`Ryhti plan count fetch for ${code} returned status ${res.status}`);
      return 0;
    }
    const json = await res.json();
    return typeof json.numberMatched === 'number' ? json.numberMatched : 0;
  } catch (err) {
    console.warn(`Error fetching Ryhti plan count for municipality ${code}:`, err);
    return 0;
  }
}

export async function fetchAndTransformMunicipalities(
  options: FetchMunicipalitiesOptions = {}
): Promise<{ totalProcessed: number; changedCount: number }> {
  const isTestMode = process.env.CONTENT_MODE === 'test';
  const resolvedOutputDir =
    options.outputBaseDir ||
    (isTestMode
      ? path.join(process.cwd(), 'test-public', 'data', 'nls.fi')
      : path.join(process.cwd(), 'public', 'data', 'nls.fi'));

  const outputPath = path.join(resolvedOutputDir, 'municipalities.json');
  const apiKey = options.apiKey || process.env.MML_API_KEY || process.env.NLS_API_KEY || '';

  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  // 1. Load kunta_1_20240101 Codelist for name enrichment
  let nameMap: MunicipalityNameMap = {};
  const possibleCodelistPaths = [
    options.codelistPath,
    isTestMode
      ? path.join(process.cwd(), 'test-public', 'data', 'suomi.fi', 'koodistot', 'jhs', 'kunta_1_20240101.json')
      : path.join(process.cwd(), 'public', 'data', 'suomi.fi', 'koodistot', 'jhs', 'kunta_1_20240101.json'),
    path.join(process.cwd(), 'public', 'data', 'suomi.fi', 'koodistot', 'jhs', 'kunta_1_20240101.json'),
    path.join(process.cwd(), 'test-data', 'codelist', 'coderegistries', 'jhs', 'codeschemes', 'kunta_1_20240101', 'codes', 'index.json'),
  ].filter(Boolean) as string[];

  let codelistLoaded = false;
  for (const cPath of possibleCodelistPaths) {
    if (fs.existsSync(cPath)) {
      try {
        console.log(`Loading municipality codelist from: ${cPath}`);
        const raw = fs.readFileSync(cPath, 'utf-8');
        const json = JSON.parse(raw);
        nameMap = extractMunicipalityNamesFromCodelist(json);
        codelistLoaded = true;
        break;
      } catch (err) {
        console.warn(`Could not parse codelist at ${cPath}:`, err);
      }
    }
  }

  if (!codelistLoaded && !isTestMode) {
    try {
      console.log('Fetching municipality codelist kunta_1_20240101 from suomi.fi api...');
      const codelistUrl = 'https://koodistot.suomi.fi/codelist-api/api/v1/coderegistries/jhs/codeschemes/kunta_1_20240101/codes/';
      const res = await fetch(codelistUrl, CONFIG.remoteFetchOptions);
      if (res.ok) {
        const json = await res.json();
        nameMap = extractMunicipalityNamesFromCodelist(json);
        codelistLoaded = true;
      }
    } catch (err) {
      console.warn('Failed to fetch codelist from suomi.fi API:', err);
    }
  }

  // 2. Fetch or load raw municipality GeoJSON features
  let rawFeatures: any[] = [];
  let totalProcessed = 0;
  let changedCount = 0;

  if (isTestMode) {
    const testRawPath =
      options.testRawPath ||
      path.join(process.cwd(), 'test-data', 'nls.fi', 'kunta-raw.json');

    if (fs.existsSync(testRawPath)) {
      console.log(`[TEST MODE] Loading raw municipality test fixture from: ${testRawPath}`);
      const raw = fs.readFileSync(testRawPath, 'utf-8');
      const json = JSON.parse(raw);
      rawFeatures = json.features || [];
    } else {
      console.log('[TEST MODE] Using default test municipality feature fixtures');
      rawFeatures = [
        {
          id: 'kunta.091',
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[24.8, 60.1], [25.2, 60.1], [25.2, 60.3], [24.8, 60.3], [24.8, 60.1]]] },
          properties: { kuntatunnus: 91 }
        },
        {
          id: 'kunta.749',
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [[[27.5, 63.0], [27.8, 63.0], [27.8, 63.2], [27.5, 63.2], [27.5, 63.0]]] },
          properties: { kuntatunnus: 749 }
        }
      ];
    }
  } else {
    const nlsUrl = 'https://avoin-paikkatieto.maanmittauslaitos.fi/maastotiedot/features/v1/collections/kunta/items?f=json&limit=500';
    console.log(`Fetching municipality admin areas from NLS API: ${nlsUrl}...`);

    const headers: Record<string, string> = {};
    if (apiKey) {
      const basicAuth = Buffer.from(`${apiKey}:`).toString('base64');
      headers['Authorization'] = `Basic ${basicAuth}`;
    }

    try {
      const res = await fetch(nlsUrl, {
        ...CONFIG.remoteFetchOptions,
        headers: {
          ...(CONFIG.remoteFetchOptions as any)?.headers,
          ...headers
        }
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const json = await res.json();
      rawFeatures = json.features || [];
      console.log(`Successfully fetched ${rawFeatures.length} municipality features from NLS OGC API.`);
    } catch (err) {
      console.warn(`Could not fetch from NLS API:`, err);
      if (fs.existsSync(outputPath)) {
        console.log(`Preserving existing ${outputPath}`);
        return { totalProcessed: 0, changedCount: 0 };
      }
      throw err;
    }
  }

  // 3. Enrich features
  const enrichedFeatures = enrichMunicipalityFeatures(rawFeatures, nameMap);
  totalProcessed = enrichedFeatures.length;

  // 3.5 Fetch number of plans from Ryhti OGC API for each municipality
  const planCounts: Record<string, number> = {};
  if (isTestMode) {
    for (const feat of enrichedFeatures) {
      const natcode = String(feat.properties?.NATCODE || feat.properties?.kuntatunnus || '').padStart(3, '0');
      planCounts[natcode] = natcode === '091' ? 15 : natcode === '749' ? 3 : 1;
    }
  } else {
    console.log(`Fetching plan counts from Ryhti OGC API for ${enrichedFeatures.length} municipalities...`);
    const chunkSize = 15;
    const natcodes = enrichedFeatures.map(f => String(f.properties?.NATCODE || f.properties?.kuntatunnus || '').padStart(3, '0'));
    for (let i = 0; i < natcodes.length; i += chunkSize) {
      const chunk = natcodes.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (code) => {
          planCounts[code] = await fetchPlanCountForMunicipality(code);
        })
      );
    }
  }

  const outputIndex: MunicipalityInfo[] = enrichedFeatures.map((feat) => {
    const natcode = String(feat.properties?.NATCODE || feat.properties?.kuntatunnus || '').padStart(3, '0');
    const planCount = planCounts[natcode] ?? 0;
    feat.properties.numberOfDetailedPlansInRyhti = planCount;
    return {
      id: feat.id,
      natcode,
      kuntatunnus: feat.properties?.kuntatunnus,
      nameFin: feat.properties?.NAMEFIN || `Kunta ${natcode}`,
      ...(feat.properties?.NAMESWE ? { nameSwe: feat.properties.NAMESWE } : {}),
      numberOfDetailedPlansInRyhti: planCount
    };
  });

  // 4. Save index file (municipalities.json)
  let indexChanged = true;
  if (fs.existsSync(outputPath)) {
    try {
      const existingContent = fs.readFileSync(outputPath, 'utf-8');
      const existingJson = JSON.parse(existingContent);
      indexChanged = !isContentEqual(existingJson, outputIndex);
    } catch {
      indexChanged = true;
    }
  }

  if (indexChanged) {
    changedCount++;
    fs.writeFileSync(outputPath, JSON.stringify(outputIndex, null, 2), 'utf-8');
    console.log(`Saved enriched municipality index (CONTENT CHANGED) to ${outputPath} (${outputIndex.length} municipalities)`);
  } else {
    console.log(`Skipped municipality index (content unchanged) at ${outputPath}`);
  }

  // 5. Save individual municipality files (municipalities/<natcode>.json)
  const individualOutputDir = path.join(resolvedOutputDir, 'municipalities');
  if (!fs.existsSync(individualOutputDir)) {
    fs.mkdirSync(individualOutputDir, { recursive: true });
  }

  let individualChangedCount = 0;
  for (const feat of enrichedFeatures) {
    const natcode = String(feat.properties?.NATCODE || feat.properties?.kuntatunnus || '').padStart(3, '0');
    if (!natcode) continue;

    const singleMuniPath = path.join(individualOutputDir, `${natcode}.json`);
    let singleChanged = true;

    if (fs.existsSync(singleMuniPath)) {
      try {
        const existingContent = fs.readFileSync(singleMuniPath, 'utf-8');
        const existingJson = JSON.parse(existingContent);
        singleChanged = !isContentEqual(existingJson, feat);
      } catch {
        singleChanged = true;
      }
    }

    if (singleChanged) {
      fs.writeFileSync(singleMuniPath, JSON.stringify(feat, null, 2), 'utf-8');
      individualChangedCount++;
    }
  }

  if (individualChangedCount > 0) {
    changedCount += individualChangedCount;
    console.log(`Saved ${individualChangedCount} individual municipality feature files to ${individualOutputDir}`);
  } else {
    console.log(`All individual municipality feature files up to date in ${individualOutputDir}`);
  }

  return { totalProcessed, changedCount };
}

if (process.env.NODE_ENV !== 'test') {
  if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    fetchAndTransformMunicipalities().catch((err) => {
      console.error('Failed to fetch municipality data:', err);
      process.exit(1);
    });
  }
}
