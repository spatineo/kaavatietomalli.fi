import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildWfsUrl,
  fetchPlans,
  getPlanMunicipalityCodes,
  WFS_API_URL,
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

  describe('fetchPlansFromWfs', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('fetches and returns feature collection data successfully with planType filter', async () => {
      const mockResponseData = {
        type: 'FeatureCollection',
        numberMatched: 100,
        numberReturned: 1,
        features: [mockPlanFeature]
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponseData)
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await fetchPlans('091', 'Test', 50, 0, 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33');
      expect(result).toEqual(mockResponseData);
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('plan_type'));
    });

    it('throws error when response is not ok', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(fetchPlans('091')).rejects.toThrow('HTTP 500 - Internal Server Error');
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
});
