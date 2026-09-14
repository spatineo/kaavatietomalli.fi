/**
 * WFS 2.0 API Service for Ryhti Plan Data
 */

export const WFS_API_URL = 'https://paikkatiedot.ymparisto.fi/geoserver/ryhti_plan/wfs';

export interface PlanDocument {
  name_fin?: string;
  name_swe?: string;
  uri?: string;
  file_content_type?: string;
  type_of_attachment?: string;
}

export interface PlanFeature {
  id: string;
  type: 'Feature';
  geometry: any;
  properties: {
    id: string;
    plan_key?: string;
    permanent_plan_identifier?: string;
    producer_plan_identifier?: string;
    digital_origin?: string;
    plan_type?: string;
    plan_type_name_fin?: string;
    administrative_area_identifiers?: string;
    original_administrative_area_identifiers?: string;
    name_fin?: string;
    name_swe?: string;
    description_fin?: string;
    approval_date?: string;
    time_of_initiation?: string;
    date_of_validity?: string;
    period_of_validity_begin?: string;
    period_of_validity_end?: string;
    plan_life_cycle_status?: string;
    documents?: string | PlanDocument[];
    [key: string]: any;
  };
}

export interface WfsFeatureCollectionResponse {
  type: 'FeatureCollection';
  features: PlanFeature[];
  numberMatched?: number;
  numberReturned?: number;
  [key: string]: any;
}

/**
 * Builds WFS 2.0 GetFeature URL with CQL filtering and descending sort by approval_date.
 */
export function buildWfsUrl(
  municipalityCode?: string,
  searchQuery?: string,
  count = 50,
  startIndex = 0,
  planType?: string
): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: 'ryhti_plan:pub_valid_ld_plan_ix_gs',
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    sortby: 'approval_date DESC',
    count: String(count)
  });

  if (startIndex > 0) {
    params.set('startIndex', String(startIndex));
  }

  const conditions: string[] = [];

  const code = (municipalityCode || '').trim();
  if (code) {
    const padCode = code.padStart(3, '0');
    conditions.push(`administrative_area_identifiers='["${padCode}"]'`);
  }

  const text = (searchQuery || '').trim();
  if (text) {
    const escapedText = text.replace(/'/g, "''");
    conditions.push(`name_fin ILIKE '%${escapedText}%'`);
  }

  const typeStr = (planType || '').trim();
  if (typeStr) {
    const fullPlanTypeUri = typeStr.startsWith('http')
      ? typeStr
      : `http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/${typeStr}`;
    const escapedType = fullPlanTypeUri.replace(/'/g, "''");
    conditions.push(`plan_type='${escapedType}'`);
  }

  if (conditions.length > 0) {
    params.set('cql_filter', conditions.join(' AND '));
  }

  return `${WFS_API_URL}?${params.toString()}`;
}

/**
 * Fetches plans from WFS 2.0 endpoint.
 */
export async function fetchPlans(
  municipalityCode?: string,
  searchQuery?: string,
  count = 50,
  startIndex = 0,
  planType?: string
): Promise<WfsFeatureCollectionResponse> {
  const url = buildWfsUrl(municipalityCode, searchQuery, count, startIndex, planType);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${res.statusText}`);
  }
  return res.json();
}

/**
 * Helper to extract municipality codes from plan property
 */
export const getPlanMunicipalityCodes = (plan: PlanFeature): string[] => {
  const raw = plan.properties?.administrative_area_identifiers;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {
      const cleaned = raw.replace(/[\[\]"'\s]/g, '');
      if (cleaned) return cleaned.split(',');
    }
  }
  return [];
};
