import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  transformCodelistData,
  getLaterDate,
  fetchAndTransformKoodistot,
  sortCodelistCodes
} from './fetch-koodistot';

describe('fetch-koodistot script', () => {
  describe('transformCodelistData', () => {
    it('transforms metaData and codesData into target JSON structure', () => {
      const metaData = {
        id: 'meta-uuid-1234',
        codeValue: 'Test',
        codeRegistry: { codeValue: 'rytj' },
        prefLabel: { fi: 'Testi Koodisto', en: 'Test Codelist' },
        definition: { fi: 'Määritelmä' },
        description: { fi: 'Kuvaus' },
        created: '2026-01-01T00:00:00Z',
        modified: '2026-01-02T00:00:00Z',
        statusModified: '2026-01-01T00:00:00Z',
        status: 'VALID'
      };

      const codesData = {
        results: [
          {
            id: 'code-uuid-2',
            uri: 'http://uri.suomi.fi/codelist/rytj/Test/code/02',
            codeValue: '02',
            prefLabel: { fi: 'Koodi 2' },
            hierarchyLevel: 1,
            status: 'VALID',
            created: '2026-01-01T00:00:00Z',
            modified: '2026-01-01T00:00:00Z',
            statusModified: '2026-01-01T00:00:00Z',
            shortName: 'Lyhyt nimi 2'
          },
          {
            id: 'code-uuid-1',
            uri: 'http://uri.suomi.fi/codelist/rytj/Test/code/01',
            codeValue: '01',
            prefLabel: { fi: 'Koodi 1' },
            hierarchyLevel: 1,
            status: 'VALID',
            created: '2026-01-01T00:00:00Z',
            modified: '2026-01-01T00:00:00Z',
            statusModified: '2026-01-01T00:00:00Z',
            description: { fi: 'Kuvaus 1' }
          }
        ]
      };

      const uri = 'http://uri.suomi.fi/codelist/rytj/Test';
      const timestamp = '2026-07-28T12:00:00.000Z';
      const result = transformCodelistData(metaData, codesData, uri, timestamp);

      expect(result.id).toBe('meta-uuid-1234');
      expect(result.technicalName).toBe('Test');
      expect(result.uri).toBe(uri);
      expect(result.vocabulary).toBe(uri);
      expect(result.documentationUrl).toBe('https://koodistot.suomi.fi/codescheme;registryCode=rytj;schemeCode=Test');
      expect(result.names).toEqual({ fi: 'Testi Koodisto', en: 'Test Codelist' });
      expect(result.definitions).toEqual({ fi: 'Määritelmä' });
      expect(result.descriptions).toEqual({ fi: 'Kuvaus' });
      expect(result.status).toBe('VALID');
      expect(result.originSyncTime).toBe(timestamp);

      expect(result.codes.length).toBe(2);
      // Verify codes sorted alphabetically by URI
      expect(result.codes[0].codeValue).toBe('01');
      expect(result.codes[0].description).toEqual({ fi: 'Kuvaus 1' });

      expect(result.codes[1].codeValue).toBe('02');
      expect(result.codes[1].description).toEqual({ fi: 'Lyhyt nimi 2' });
    });
  });

  describe('sortCodelistCodes', () => {
    it('sorts codes hierarchically where narrower codes follow broader codes, ordered by order property', () => {
      const mockCodes = [
        { codeValue: 'A', broaderCode: null, order: 2 },
        { codeValue: 'B', broaderCode: null, order: 1 },
        { codeValue: 'C', broaderCode: 'B', order: 2 },
        { codeValue: 'D', broaderCode: 'B', order: 1 },
        { codeValue: 'E', broaderCode: 'A', order: 1 }
      ];

      const sorted = sortCodelistCodes(mockCodes);

      // Expected order:
      // B (root, order 1)
      // D (child of B, order 1)
      // C (child of B, order 2)
      // A (root, order 2)
      // E (child of A, order 1)
      expect(sorted.map(c => c.codeValue)).toEqual(['B', 'D', 'C', 'A', 'E']);
    });

    it('falls back to alphabetical sorting of codeValue if order is identical or missing', () => {
      const mockCodes = [
        { codeValue: 'Y', broaderCode: null },
        { codeValue: 'X', broaderCode: null }
      ];

      const sorted = sortCodelistCodes(mockCodes);
      expect(sorted.map(c => c.codeValue)).toEqual(['X', 'Y']);
    });
  });

  describe('getLaterDate', () => {
    it('returns the later date when both statusModified and modified are provided', () => {
      expect(getLaterDate('2026-01-01T00:00:00Z', '2026-01-05T00:00:00Z')).toBe('2026-01-05T00:00:00Z');
      expect(getLaterDate('2026-01-10T00:00:00Z', '2026-01-05T00:00:00Z')).toBe('2026-01-10T00:00:00Z');
    });

    it('returns single available date when one is missing', () => {
      expect(getLaterDate('2026-01-01T00:00:00Z', null)).toBe('2026-01-01T00:00:00Z');
      expect(getLaterDate(null, '2026-01-02T00:00:00Z')).toBe('2026-01-02T00:00:00Z');
    });

    it('returns null if both dates are missing', () => {
      expect(getLaterDate(null, null)).toBeNull();
    });
  });

  describe('fetchAndTransformKoodistot', () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches and writes codelist JSON files according to index.json config', async () => {
      const mockConfig = {
        remote: {
          api: 'https://test-api.suomi.fi/codelist-api/v1/',
          name: 'Test Registry'
        },
        registries: [
          {
            name: 'testreg',
            codelists: [
              {
                name: 'testcode'
              },
              {
                name: 'secondcode'
              }
            ]
          }
        ]
      };

      const mockMetaData = {
        id: 'meta-123',
        prefLabel: { fi: 'Testikoodisto' },
        allVersions: [
          {
            id: 'v1-id',
            codeValue: 'testcode_v1',
            uri: 'http://uri.suomi.fi/codelist/testreg/testcode_v1'
          }
        ]
      };
      const mockCodesData = [
        {
          id: 'code-1',
          codeValue: 'C1',
          uri: 'http://uri.suomi.fi/codelist/testreg/testcode/code/C1'
        }
      ];

      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

      // 1st pair of fetches (testcode)
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockMetaData });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockCodesData });

      // 2nd pair of fetches (secondcode)
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockMetaData });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => mockCodesData });

      await fetchAndTransformKoodistot('/data-index/suomi.fi/koodistot/index.json', '/public/data/suomi.fi/koodistot', 0);

      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://test-api.suomi.fi/codelist-api/v1/coderegistries/testreg/codeschemes/testcode/'
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://test-api.suomi.fi/codelist-api/v1/coderegistries/testreg/codeschemes/testcode/codes/'
      );

      expect(mockFetch).toHaveBeenNthCalledWith(
        3,
        'https://test-api.suomi.fi/codelist-api/v1/coderegistries/testreg/codeschemes/secondcode/'
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        4,
        'https://test-api.suomi.fi/codelist-api/v1/coderegistries/testreg/codeschemes/secondcode/codes/'
      );

      expect(writeSpy).toHaveBeenCalledWith(
        path.join('/public/data/suomi.fi/koodistot', 'testreg', 'testcode.json'),
        expect.stringContaining('Testikoodisto'),
        'utf-8'
      );

      expect(writeSpy).toHaveBeenCalledWith(
        path.join('/public/data/suomi.fi/koodistot', 'testreg', 'secondcode.json'),
        expect.stringContaining('Testikoodisto'),
        'utf-8'
      );

      expect(writeSpy).toHaveBeenCalledWith(
        path.join('/public/data/suomi.fi/koodistot', 'index.json'),
        expect.stringContaining('"path": "testreg/testcode.json"'),
        'utf-8'
      );

      existsSpy.mockRestore();
      readSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
    });
  });
});
