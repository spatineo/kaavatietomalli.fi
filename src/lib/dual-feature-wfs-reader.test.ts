import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DualFeatureWfsReader, WFSResultFeature, WFSService } from './dual-feature-wfs-reader';
import { PlanFeature } from '../services/plan-api';

const createMockPlan = (id: string, approvalDate: string, name = 'Test Plan'): PlanFeature => ({
  id,
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [[[24.0, 60.0], [25.0, 60.0], [25.0, 61.0], [24.0, 61.0], [24.0, 60.0]]]
  },
  properties: {
    id,
    name_fin: name,
    approval_date: approvalDate
  }
});

describe('DualFeatureWfsReader', () => {
  const baseUrl = 'https://paikkatiedot.ymparisto.fi/geoserver/ryhti_plan/wfs';
  const typeA = 'ryhti_plan:pub_valid_ld_plan_ix_gs';
  const typeB = 'ryhti_plan:pub_valid_lm_plan_ix_gs';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with default values and reset state', () => {
    const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, 'some_cql', 25);
    expect(reader.baseUrl).toBe(baseUrl);
    expect(reader.typeA).toBe(typeA);
    expect(reader.typeB).toBe(typeB);
    expect(reader.cqlFilter).toBe('some_cql');
    expect(reader.pageSize).toBe(25);
    expect(reader.offsetA).toBe(0);
    expect(reader.offsetB).toBe(0);
    expect(reader.matchedA).toBeNull();
    expect(reader.matchedB).toBeNull();
    expect(reader.isClosed).toBe(false);
  });

  it('fetches both streams in parallel, merges, sorts by approval_date DESC, and tracks totalMatched', async () => {
    const planA1 = createMockPlan('plan-A1', '2024-05-10T00:00:00Z', 'A1 Older');
    const planA2 = createMockPlan('plan-A2', '2024-06-10T00:00:00Z', 'A2 Newer');
    const planB1 = createMockPlan('plan-B1', '2024-05-20T00:00:00Z', 'B1 Mid');

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent(typeA))) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 2,
            features: [planA2, planA1]
          })
        });
      }
      if (url.includes(encodeURIComponent(typeB))) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 1,
            features: [planB1]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    vi.stubGlobal('fetch', mockFetch);

    const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, null, 10);
    const result = await reader.next();

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.totalMatched).toBe(3);
    expect(result.features).toHaveLength(3);
    // Sort descending by approval date: planA2 (June), planB1 (May 20), planA1 (May 10)
    expect(result.features[0].id).toBe('plan-A2');
    expect(result.features[1].id).toBe('plan-B1');
    expect(result.features[2].id).toBe('plan-A1');
    expect(result.done).toBe(true);
  });

  it('deduplicates features with identical IDs', async () => {
    const plan1 = createMockPlan('duplicate-plan-1', '2024-05-10T00:00:00Z', 'Duplicate 1');
    const plan2 = createMockPlan('duplicate-plan-1', '2024-05-10T00:00:00Z', 'Duplicate 1 Copy');
    const plan3 = createMockPlan('unique-plan-2', '2024-06-01T00:00:00Z', 'Unique 2');

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent(typeA))) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 2,
            features: [plan3, plan1]
          })
        });
      }
      if (url.includes(encodeURIComponent(typeB))) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 1,
            features: [plan2]
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    vi.stubGlobal('fetch', mockFetch);

    const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, null, 10);
    const result = await reader.next();

    expect(result.features).toHaveLength(2);
    expect(result.features.map(f => f.id)).toEqual(['unique-plan-2', 'duplicate-plan-1']);
  });

  it('paginates accurately across multiple .next() calls and updates stream offsets', async () => {
    const planA1 = createMockPlan('plan-A1', '2024-06-01T00:00:00Z');
    const planA2 = createMockPlan('plan-A2', '2024-04-01T00:00:00Z');
    const planB1 = createMockPlan('plan-B1', '2024-05-01T00:00:00Z');
    const planB2 = createMockPlan('plan-B2', '2024-03-01T00:00:00Z');

    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent(typeA))) {
        const match = url.match(/startIndex=(\d+)/);
        const startIndex = match ? parseInt(match[1], 10) : 0;
        const allA = [planA1, planA2];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 2,
            features: allA.slice(startIndex)
          })
        });
      }
      if (url.includes(encodeURIComponent(typeB))) {
        const match = url.match(/startIndex=(\d+)/);
        const startIndex = match ? parseInt(match[1], 10) : 0;
        const allB = [planB1, planB2];
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 2,
            features: allB.slice(startIndex)
          })
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
    vi.stubGlobal('fetch', mockFetch);

    // Page size = 2
    const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, null, 2);

    // Page 1
    const page1 = await reader.next();
    expect(page1.features).toHaveLength(2);
    expect(page1.features[0].id).toBe('plan-A1'); // June
    expect(page1.features[1].id).toBe('plan-B1'); // May
    expect(page1.done).toBe(false);
    expect(reader.offsetA).toBe(1);
    expect(reader.offsetB).toBe(1);

    // Page 2
    const page2 = await reader.next();
    expect(page2.features).toHaveLength(2);
    expect(page2.features[0].id).toBe('plan-A2'); // April
    expect(page2.features[1].id).toBe('plan-B2'); // March
    expect(page2.done).toBe(true);
    expect(reader.offsetA).toBe(2);
    expect(reader.offsetB).toBe(2);

    // Page 3 (after done)
    const page3 = await reader.next();
    expect(page3.features).toHaveLength(0);
    expect(page3.done).toBe(true);
  });

  it('handles single stream query when typeB is null', async () => {
    const planA = createMockPlan('plan-A1', '2024-01-01T00:00:00Z');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        numberMatched: 1,
        features: [planA]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const reader = new DualFeatureWfsReader(baseUrl, typeA, null, 'administrative_area_identifiers=[\"091\"]', 10);
    const result = await reader.next();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.totalMatched).toBe(1);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('plan-A1');
    expect(result.done).toBe(true);
  });

  it('handles single stream query when typeA is null', async () => {
    const planB = createMockPlan('plan-B1', '2024-01-01T00:00:00Z');

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        type: 'FeatureCollection',
        numberMatched: 1,
        features: [planB]
      })
    });
    vi.stubGlobal('fetch', mockFetch);

    const reader = new DualFeatureWfsReader(baseUrl, null, typeB, null, 10);
    const result = await reader.next();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.totalMatched).toBe(1);
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('plan-B1');
    expect(result.done).toBe(true);
  });

  it('handles both streams being null gracefully', async () => {
    const reader = new DualFeatureWfsReader(baseUrl, null, null, null, 10);
    const result = await reader.next();

    expect(result.features).toEqual([]);
    expect(result.totalMatched).toBe(0);
    expect(result.done).toBe(true);
  });

  it('throws error if server returns non-ok status', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway'
    });
    vi.stubGlobal('fetch', mockFetch);

    const reader = new DualFeatureWfsReader(baseUrl, typeA, null, null, 10);
    await expect(reader.next()).rejects.toThrow('HTTP 502 - Bad Gateway');
  });

  it('returns empty result when closed or aborted', async () => {
    const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, null, 10);
    reader.close();
    expect(reader.isClosed).toBe(true);

    const result = await reader.next();
    expect(result.features).toEqual([]);
    expect(result.done).toBe(true);
  });

  it('handles AbortError quietly during next() execution', async () => {
    const abortErr = new Error('The operation was aborted');
    abortErr.name = 'AbortError';

    const mockFetch = vi.fn().mockRejectedValue(abortErr);
    vi.stubGlobal('fetch', mockFetch);

    const reader = new DualFeatureWfsReader(baseUrl, typeA, null, null, 10);
    const result = await reader.next();

    expect(result.features).toEqual([]);
    expect(result.done).toBe(true);
  });

  it('resets offsets, matched counts, and abort controller upon reset()', () => {
    const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, null, 10);
    reader.offsetA = 5;
    reader.offsetB = 3;
    reader.matchedA = 100;
    reader.matchedB = 50;
    reader.isClosed = true;

    reader.reset();

    expect(reader.offsetA).toBe(0);
    expect(reader.offsetB).toBe(0);
    expect(reader.matchedA).toBeNull();
    expect(reader.matchedB).toBeNull();
    expect(reader.isClosed).toBe(false);
  });

  it('works with a custom WFSService object implementation', async () => {
    interface CustomFeature extends WFSResultFeature {
      id: string | number;
      properties?: Record<string, any>;
    }

    const customService: WFSService = {
      baseUrl: 'https://custom-wfs.example.com/geoserver/wfs',
      sortFeatures: (a: CustomFeature, b: CustomFeature) =>
        new Date(b.properties.date).getTime() - new Date(a.properties.date).getTime(),
      fetchChunk: vi.fn().mockImplementation((typeName: string) => {
        if (typeName === 'custom:layer_a') {
          return Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 1,
            features: [{ id: 'feat-1', properties: { name: 'Feat 1', date: '2025-01-01' } }]
          });
        }
        return Promise.resolve({
          type: 'FeatureCollection',
          numberMatched: 0,
          features: []
        });
      })
    };

    const reader = new DualFeatureWfsReader<CustomFeature>(customService,'custom:layer_a', 'custom:layer_b');
    const result = await reader.next();

    expect(customService.fetchChunk).toHaveBeenCalled();
    expect(result.features).toHaveLength(1);
    expect(result.features[0].id).toBe('feat-1');
  });

  describe('approval_date sorting order (NULLS FIRST descending)', () => {
    const planNull = {
      id: 'plan-null',
      properties: { approval_date: null, name_fin: 'Plan Null' }
    };
    const plan2025 = {
      id: 'plan-2025',
      properties: { approval_date: '2025-06-01T00:00:00Z', name_fin: 'Plan 2025' }
    };
    const plan2020 = {
      id: 'plan-2020',
      properties: { approval_date: '2020-01-01T00:00:00Z', name_fin: 'Plan 2020' }
    };

    it('sorts master plans (typeB only) placing null approval_dates at the top', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 3,
            features: [plan2020, planNull, plan2025]
          })
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const reader = new DualFeatureWfsReader(baseUrl, null, typeB, null, 10);
      const res = await reader.next();

      expect(res.features).toHaveLength(3);
      expect(res.features[0].id).toBe('plan-null');
      expect(res.features[1].id).toBe('plan-2025');
      expect(res.features[2].id).toBe('plan-2020');
    });

    it('sorts detailed plans (typeA only) placing null approval_dates at the top', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 3,
            features: [plan2020, plan2025, planNull]
          })
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const reader = new DualFeatureWfsReader(baseUrl, typeA, null, null, 10);
      const res = await reader.next();

      expect(res.features).toHaveLength(3);
      expect(res.features[0].id).toBe('plan-null');
      expect(res.features[1].id).toBe('plan-2025');
      expect(res.features[2].id).toBe('plan-2020');
    });

    it('sorts merged detailed and master plans placing null approval_dates at the top', async () => {
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes(encodeURIComponent(typeA))) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              type: 'FeatureCollection',
              numberMatched: 2,
              features: [plan2020]
            })
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 2,
            features: [planNull, plan2025]
          })
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const reader = new DualFeatureWfsReader(baseUrl, typeA, typeB, null, 10);
      const res = await reader.next();

      expect(res.features).toHaveLength(3);
      expect(res.features[0].id).toBe('plan-null');
      expect(res.features[1].id).toBe('plan-2025');
      expect(res.features[2].id).toBe('plan-2020');
    });
  });

  describe('bbox spatial filtering via cql_filter', () => {
    it('formats bbox array into cql_filter expression when bbox array is provided', async () => {
      let requestedUrls: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 0,
            features: []
          })
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const bbox: [number, number, number, number] = [24.0, 60.0, 25.0, 61.0];
      const reader = new DualFeatureWfsReader(baseUrl, typeA, null, null, 10, bbox);
      await reader.next();

      expect(requestedUrls).toHaveLength(1);
      const url = requestedUrls[0];
      expect(url).not.toContain('&bbox=');
      expect(url).toContain(`cql_filter=${encodeURIComponent('BBOX(geom, 24, 60, 25, 61, \'EPSG:4326\')')}`);
    });

    it('formats bbox string into cql_filter expression when bbox string is provided', async () => {
      let requestedUrls: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 0,
            features: []
          })
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const bboxStr = '24.5,60.2,25.5,61.2';
      const reader = new DualFeatureWfsReader(baseUrl, typeA, null, null, 10, bboxStr);
      await reader.next();

      expect(requestedUrls).toHaveLength(1);
      const url = requestedUrls[0];
      expect(url).not.toContain('&bbox=');
      expect(url).toContain(`cql_filter=${encodeURIComponent('BBOX(geom, 24.5, 60.2, 25.5, 61.2)')}`);
    });

    it('combines existing cqlFilter and bbox into a single cql_filter using AND', async () => {
      let requestedUrls: string[] = [];
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        requestedUrls.push(url);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            type: 'FeatureCollection',
            numberMatched: 0,
            features: []
          })
        });
      });
      vi.stubGlobal('fetch', mockFetch);

      const baseCql = "administrative_area_identifiers='[\"091\"]'";
      const bbox: [number, number, number, number] = [24.0, 60.0, 25.0, 61.0];
      const reader = new DualFeatureWfsReader(baseUrl, typeA, null, baseCql, 10, bbox);
      await reader.next();

      expect(requestedUrls).toHaveLength(1);
      const url = requestedUrls[0];
      expect(url).not.toContain('&bbox=');
      const expectedCombined = `${baseCql} AND BBOX(geom, 24, 60, 25, 61, \'EPSG:4326\')`;
      expect(url).toContain(`cql_filter=${encodeURIComponent(expectedCombined)}`);
    });
  });
});
