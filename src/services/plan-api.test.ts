import { describe, it, expect } from 'vitest';
import {
  buildWfsUrl,
  buildWfsCqlFilter,
  getWfsTypesForPlanType,
  getPlanMunicipalityCodes,
  ryhtiPlanWfsService,
  WFS_API_URL,
  WFS_TYPE_DETAILED_PLAN,
  WFS_TYPE_MASTER_PLAN,
  PlanFeature
} from './plan-api';

const mockPlanFeature: PlanFeature = {
  id: 'pub_valid_ld_plan_ix_gs.test-123',
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]]
  },
  properties: {
    id: 'pub_valid_ld_plan_ix_gs.test-123',
    permanent_plan_identifier: 'AK-001234',
    name_fin: 'Testiasemakaava',
    administrative_area_identifiers: '["091"]'
  }
};

describe('plan-api service', () => {
  describe('getWfsTypesForPlanType', () => {
    it('returns both detailed and master plan types for empty, null, or ALL planType', () => {
      expect(getWfsTypesForPlanType(null)).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      expect(getWfsTypesForPlanType('')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      expect(getWfsTypesForPlanType('ALL')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: WFS_TYPE_MASTER_PLAN
      });
    });

    it('returns only detailed plan type for Asemakaava and sub-types (3, 31, 32, etc.)', () => {
      expect(getWfsTypesForPlanType('3')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: null
      });
      expect(getWfsTypesForPlanType('33')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: null
      });
      expect(getWfsTypesForPlanType('http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/31')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: null
      });
    });

    it('returns only master plan type for Yleiskaava and sub-types (2, 21, 22, etc.)', () => {
      expect(getWfsTypesForPlanType('2')).toEqual({
        typeA: null,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      expect(getWfsTypesForPlanType('24')).toEqual({
        typeA: null,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      expect(getWfsTypesForPlanType('http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/21')).toEqual({
        typeA: null,
        typeB: WFS_TYPE_MASTER_PLAN
      });
    });
  });

  describe('buildWfsCqlFilter', () => {
    it('returns null when no filter criteria are provided', () => {
      expect(buildWfsCqlFilter()).toBeNull();
      expect(buildWfsCqlFilter('', '', '')).toBeNull();
      expect(buildWfsCqlFilter(undefined, undefined, 'ALL')).toBeNull();
    });

    it('builds municipality identifier filter with 3-digit zero padding', () => {
      expect(buildWfsCqlFilter('91')).toBe('administrative_area_identifiers=\'["091"]\'');
      expect(buildWfsCqlFilter('091')).toBe('administrative_area_identifiers=\'["091"]\'');
    });

    it('builds case-insensitive name filter and escapes single quotes', () => {
      expect(buildWfsCqlFilter(undefined, 'Espoo')).toBe("name_fin ILIKE '%Espoo%'");
      expect(buildWfsCqlFilter(undefined, "O'Learys")).toBe("name_fin ILIKE '%O''Learys%'");
    });

    it('builds plan_type filter using full codelist URI', () => {
      expect(buildWfsCqlFilter(undefined, undefined, '33')).toBe(
        "plan_type='http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33'"
      );
      expect(buildWfsCqlFilter(undefined, undefined, 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33')).toBe(
        "plan_type='http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33'"
      );
    });

    it('combines multiple conditions with AND', () => {
      const filter = buildWfsCqlFilter('91', 'Keskusta', '33');
      expect(filter).toBe(
        'administrative_area_identifiers=\'["091"]\' AND name_fin ILIKE \'%Keskusta%\' AND plan_type=\'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33\''
      );
    });
  });

  describe('buildWfsUrl', () => {
    it('constructs basic WFS 2.0 URL with srsName EPSG:4326, sortby=approval_date DESC and count=50', () => {
      const url = buildWfsUrl('', '', 50, 0);
      expect(url).toContain(WFS_API_URL);
      expect(url).toContain('service=WFS');
      expect(url).toContain('version=2.0.0');
      expect(url).toContain('request=GetFeature');
      expect(url).toContain('typeNames=ryhti_plan%3Apub_valid_ld_plan_ix_gs');
      expect(url).toContain('outputFormat=application%2Fjson');
      expect(url).toContain('srsName=EPSG%3A4326');
      expect(url).toContain('sortby=approval_date+DESC');
      expect(url).toContain('count=50');
      expect(url).not.toContain('cql_filter');
    });

    it('adds exact match cql_filter for administrative_area_identifiers', () => {
      const url = buildWfsUrl('091', '', 50, 0);
      expect(url).toContain('cql_filter=administrative_area_identifiers%3D%27%5B%22091%22%5D%27');
    });

    it('pads 1 or 2-digit municipality codes to 3 digits', () => {
      const url = buildWfsUrl('91', '', 50, 0);
      expect(url).toContain('cql_filter=administrative_area_identifiers%3D%27%5B%22091%22%5D%27');
    });

    it('adds case-insensitive ILIKE cql_filter for name_fin', () => {
      const url = buildWfsUrl('', 'helsinki', 50, 0);
      expect(url).toContain('cql_filter=name_fin+ILIKE+%27%25helsinki%25%27');
    });

    it('escapes single quotes in search query', () => {
      const url = buildWfsUrl('', "O'Learys", 50, 0);
      expect(url).toContain("name_fin+ILIKE+%27%25O%27%27Learys%25%27");
    });

    it('combines municipality code and name_fin with AND logic', () => {
      const url = buildWfsUrl('091', 'helsinki', 50, 0);
      expect(url).toContain('administrative_area_identifiers');
      expect(url).toContain('AND');
      expect(url).toContain('name_fin+ILIKE');
    });

    it('supports startIndex parameter for pagination', () => {
      const url = buildWfsUrl('091', '', 50, 50);
      expect(url).toContain('startIndex=50');
    });

    it('adds plan_type cql_filter when full URL planType is provided', () => {
      const url = buildWfsUrl('', '', 50, 0, 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33');
      expect(url).toContain('cql_filter=plan_type%3D%27http%3A%2F%2Furi.suomi.fi%2Fcodelist%2Frytj%2FRY_Kaavalaji%2Fcode%2F33%27');
    });

    it('expands short code planType to full URI', () => {
      const url = buildWfsUrl('', '', 50, 0, '33');
      expect(url).toContain('cql_filter=plan_type%3D%27http%3A%2F%2Furi.suomi.fi%2Fcodelist%2Frytj%2FRY_Kaavalaji%2Fcode%2F33%27');
    });

    it('combines municipality code, search query, and plan_type with AND logic', () => {
      const url = buildWfsUrl('091', 'helsinki', 50, 0, 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33');
      expect(url).toContain('administrative_area_identifiers');
      expect(url).toContain('AND');
      expect(url).toContain('name_fin+ILIKE');
      expect(url).toContain('plan_type%3D%27http%3A%2F%2Furi.suomi.fi%2Fcodelist%2Frytj%2FRY_Kaavalaji%2Fcode%2F33%27');
    });
  });

  describe('getWfsTypesForPlanType', () => {
    it('returns both detailed and master plan types for ALL or missing planType', () => {
      expect(getWfsTypesForPlanType(null)).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      expect(getWfsTypesForPlanType('ALL')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: WFS_TYPE_MASTER_PLAN
      });
    });

    it('returns detailed plan type only for Asemakaava codes or URIs (31, 32, 33, etc.)', () => {
      expect(getWfsTypesForPlanType('31')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: null
      });
      expect(getWfsTypesForPlanType('http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: null
      });
      expect(getWfsTypesForPlanType('https://tietomallit.suomi.fi/codelist/RY_Kaavalaji/code/35')).toEqual({
        typeA: WFS_TYPE_DETAILED_PLAN,
        typeB: null
      });
     
    });

    it('returns master plan type only for Yleiskaava codes or URIs (21, 22, 23, etc.)', () => {
      expect(getWfsTypesForPlanType('21')).toEqual({
        typeA: null,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      expect(getWfsTypesForPlanType('http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/23')).toEqual({
        typeA: null,
        typeB: WFS_TYPE_MASTER_PLAN
      });
      
    });
  });

  describe('getPlanMunicipalityCodes', () => {
    it('parses JSON string array', () => {
      const plan = {
        ...mockPlanFeature,
        properties: { ...mockPlanFeature.properties, administrative_area_identifiers: '["091", "749"]' }
      };
      expect(getPlanMunicipalityCodes(plan)).toEqual(['091', '749']);
    });

    it('handles direct string array', () => {
      const plan = {
        ...mockPlanFeature,
        properties: { ...mockPlanFeature.properties, administrative_area_identifiers: ['091', '749'] as any }
      };
      expect(getPlanMunicipalityCodes(plan)).toEqual(['091', '749']);
    });

    it('handles comma separated string fallback', () => {
      const plan = {
        ...mockPlanFeature,
        properties: { ...mockPlanFeature.properties, administrative_area_identifiers: '091, 749' }
      };
      expect(getPlanMunicipalityCodes(plan)).toEqual(['091', '749']);
    });

    it('returns empty array when missing', () => {
      const plan = {
        ...mockPlanFeature,
        properties: { ...mockPlanFeature.properties, administrative_area_identifiers: undefined }
      };
      expect(getPlanMunicipalityCodes(plan)).toEqual([]);
    });
  });

  describe('ryhtiPlanWfsService sortFeatures', () => {
    const planNull = {
      id: 'plan-1',
      type: 'Feature' as const,
      geometry: null,
      properties: { id: 'plan-1', approval_date: undefined, name_fin: 'Null date' }
    };
    const plan2024 = {
      id: 'plan-2',
      type: 'Feature' as const,
      geometry: null,
      properties: { id: 'plan-2', approval_date: '2024-05-15T00:00:00Z', name_fin: '2024 plan' }
    };
    const plan2025 = {
      id: 'plan-3',
      type: 'Feature' as const,
      geometry: null,
      properties: { id: 'plan-3', approval_date: '2025-01-01T00:00:00Z', name_fin: '2025 plan' }
    };

    it('sorts features placing null approval_dates at the top (NULLS FIRST) followed by descending dates', () => {
      const list = [plan2024, planNull, plan2025];
      const sorted = [...list].sort(ryhtiPlanWfsService.sortFeatures);
      expect(sorted[0].id).toBe('plan-1');
      expect(sorted[1].id).toBe('plan-3');
      expect(sorted[2].id).toBe('plan-2');
    });
  });
});
