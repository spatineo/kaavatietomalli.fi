/**
 * WFS 2.0 API Service for Ryhti Plan Data
 */

import { WFSResultFeature, WFSService } from '../lib/double-feature-wfs-reader';

export const WFS_API_URL = 'https://paikkatiedot.ymparisto.fi/geoserver/ryhti_plan/wfs';

export const WFS_TYPE_DETAILED_PLAN = 'ryhti_plan:pub_valid_ld_plan_ix_gs';
export const WFS_TYPE_MASTER_PLAN = 'ryhti_plan:pub_valid_lm_plan_ix_gs';

export interface PlanDocument {
  name_fin?: string;
  name_swe?: string;
  uri?: string;
  file_content_type?: string;
  type_of_attachment?: string;
}

export interface PlanFeature extends WFSResultFeature {
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
 * Implementation of WFSService for the Ryhti Plan WFS service.
 */
export const ryhtiPlanWfsService: WFSService<PlanFeature> = {
  baseUrl: WFS_API_URL,
  version: '2.0.0',
  srsName: 'EPSG:4326',
  outputFormat: 'application/json',
  sortBy: 'approval_date DESC',
  sortFeatures: (a: PlanFeature, b: PlanFeature) => {
    const valA = a.properties?.approval_date;
    const valB = b.properties?.approval_date;
    const tA = valA ? new Date(valA).getTime() : null;
    const tB = valB ? new Date(valB).getTime() : null;
    const validA = tA !== null && !isNaN(tA);
    const validB = tB !== null && !isNaN(tB);
    if (!validA && !validB) return 0;
    if (!validA) return -1; // nulls first for descending order
    if (!validB) return 1;
    return tB - tA;
  }
};

export interface WfsTypesSelection {
  typeA: string | null;
  typeB: string | null;
}

/**
 * Determines whether WFS request should query detailed plans (typeA),
 * master plans (typeB), or both in parallel based on RY_Kaavalaji planType.
 *
 * 1) Asemakaava sub-types (broaderCode === '3' or code '3*'): only 'ryhti_plan:pub_valid_ld_plan_ix_gs'
 * 2) Yleiskaava sub-types (broaderCode === '2' or code '2*'): only 'ryhti_plan:pub_valid_lm_plan_ix_gs'
 * 3) No planType or 'ALL': query both in parallel
 */
export function getWfsTypesForPlanType(planType?: string | null): WfsTypesSelection {
  if (!planType || planType === 'ALL') {
    return {
      typeA: WFS_TYPE_DETAILED_PLAN,
      typeB: WFS_TYPE_MASTER_PLAN
    };
  }

  const raw = planType.trim();

  // Extract code value or numeric part if present
  let code = raw;
  if (raw.includes('/code/')) {
    code = raw.split('/code/').pop() || raw;
  } else if (raw.includes('/')) {
    code = raw.split('/').pop() || raw;
  }
  const digits = code.replace(/[^0-9]/g, '');

  // Asemakaava and sub-types start with '3' (3, 31, 32, 33, 34, 35, 39)
  if (digits.startsWith('3') || code === '3') {
    return {
      typeA: WFS_TYPE_DETAILED_PLAN,
      typeB: null
    };
  }

  // Yleiskaava and sub-types start with '2' (2, 21, 22, 23, 24, 25)
  if (digits.startsWith('2') || code === '2') {
    return {
      typeA: null,
      typeB: WFS_TYPE_MASTER_PLAN
    };
  }
  return {
    typeA: WFS_TYPE_DETAILED_PLAN,
    typeB: WFS_TYPE_MASTER_PLAN
  };
}

/**
 * Builds standard CQL filter for WFS 2.0 GetFeature queries.
 */
export function buildWfsCqlFilter(
  municipalityCode?: string,
  searchQuery?: string,
  planType?: string
): string | null {
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
  if (typeStr && typeStr !== 'ALL') {
    const fullPlanTypeUri = typeStr.startsWith('http')
      ? typeStr
      : `http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/${typeStr}`;
    const escapedType = fullPlanTypeUri.replace(/'/g, "''");
    conditions.push(`plan_type='${escapedType}'`);
  }

  return conditions.length > 0 ? conditions.join(' AND ') : null;
}

/**
 * Builds WFS 2.0 GetFeature URL with CQL filtering and descending sort by approval_date.
 */
export function buildWfsUrl(
  municipalityCode?: string,
  searchQuery?: string,
  count = 50,
  startIndex = 0,
  planType?: string,
  typeName = WFS_TYPE_DETAILED_PLAN
): string {
  const params = new URLSearchParams({
    service: 'WFS',
    version: '2.0.0',
    request: 'GetFeature',
    typeNames: typeName,
    outputFormat: 'application/json',
    srsName: 'EPSG:4326',
    sortby: 'approval_date DESC',
    count: String(count)
  });

  if (startIndex > 0) {
    params.set('startIndex', String(startIndex));
  }

  const cql = buildWfsCqlFilter(municipalityCode, searchQuery, planType);
  if (cql) {
    params.set('cql_filter', cql);
  }

  return `${WFS_API_URL}?${params.toString()}`;
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
