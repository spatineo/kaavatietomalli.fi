import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  getAllLabels,
  getClassTargetId,
  transformJsonLdToModel,
  fetchAndTransformTietomallit
} from './fetch-tietomallit';

describe('fetch-tietomallit script', () => {
  describe('getClassTargetId', () => {
    it('returns targetClass @id if present in array', () => {
      const cls = {
        '@id': 'http://example.org/ShapeA',
        'sh:targetClass': [{ '@id': 'http://example.org/ClassA' }]
      };
      expect(getClassTargetId(cls)).toBe('http://example.org/ClassA');
    });

    it('returns targetClass @id if present as object', () => {
      const cls = {
        '@id': 'http://example.org/ShapeA',
        'sh:targetClass': { '@id': 'http://example.org/ClassA' }
      };
      expect(getClassTargetId(cls)).toBe('http://example.org/ClassA');
    });

    it('returns fallback @id when sh:targetClass is missing', () => {
      const cls = {
        '@id': 'http://example.org/ShapeA'
      };
      expect(getClassTargetId(cls)).toBe('http://example.org/ShapeA');
    });
  });
  describe('getAllLabels', () => {
    it('returns empty object when input is falsy', () => {
      expect(getAllLabels(null)).toEqual({});
      expect(getAllLabels(undefined)).toEqual({});
    });

    it('extracts language labels from array', () => {
      const input = [
        { '@language': 'fi', '@value': 'Suomi' },
        { '@language': 'en', '@value': 'English' }
      ];
      expect(getAllLabels(input)).toEqual({ fi: 'Suomi', en: 'English' });
    });

    it('extracts language label from single object', () => {
      const input = { '@language': 'sv', '@value': 'Svenska' };
      expect(getAllLabels(input)).toEqual({ sv: 'Svenska' });
    });

    it('handles string input', () => {
      expect(getAllLabels('Direct Label')).toEqual({ unknown: 'Direct Label' });
    });
  });

  describe('transformJsonLdToModel', () => {
    it('transforms JSON-LD graph into target JSON structure', () => {
      const jsonldContent = {
        '@graph': [
          {
            '@id': 'https://iri.suomi.fi/model/test-model/',
            '@type': 'owl:Ontology',
            'rdfs:label': [{ '@language': 'fi', '@value': 'Testimalli' }],
            'owl:versionInfo': '1.0.0',
            'dcterms:modified': '2026-01-01T00:00:00Z',
            'suomi-meta:publicationStatus': 'VALID',
            'rdfs:comment': [{ '@language': 'fi', '@value': 'Kuvaus' }],
            'suomi-meta:documentation': [{ '@language': 'fi', '@value': 'Dokumentaatio' }]
          },
          {
            '@id': 'https://iri.suomi.fi/model/test-model/ClassA',
            '@type': 'sh:NodeShape',
            'rdfs:label': [{ '@language': 'fi', '@value': 'Luokka A' }],
            'sh:property': [
              { '@id': 'https://iri.suomi.fi/model/test-model/attr1' },
              { '@id': 'https://iri.suomi.fi/model/test-model/assoc1' }
            ]
          },
          {
            '@id': 'https://iri.suomi.fi/model/test-model/ClassB',
            '@type': 'sh:NodeShape',
            'rdfs:label': [{ '@language': 'fi', '@value': 'Luokka B' }],
            'sh:targetClass': [{ '@id': 'https://iri.suomi.fi/model/test-model/TargetB' }]
          },
          {
            '@id': 'https://iri.suomi.fi/model/test-model/attr1',
            'rdfs:label': [{ '@language': 'fi', '@value': 'Attribuutti 1' }],
            'sh:minCount': { '@value': 1 },
            'sh:maxCount': { '@value': 1 },
            'sh:datatype': 'http://www.w3.org/2001/XMLSchema#string',
            'suomi-meta:codeList': [{ '@id': 'http://uri.suomi.fi/codelist/test' }]
          },
          {
            '@id': 'https://iri.suomi.fi/model/test-model/assoc1',
            '@type': 'owl:ObjectProperty',
            'rdfs:label': [{ '@language': 'fi', '@value': 'Assosiaatio 1' }],
            'sh:minCount': 0,
            'sh:maxCount': '*',
            'sh:class': { '@id': 'https://iri.suomi.fi/model/test-model/TargetB' }
          }
        ]
      };

      const result = transformJsonLdToModel(jsonldContent, 'test-model', '1.0.0', '2026-07-28T10:00:00.000Z');

      expect(result.metadata.id).toBe('https://iri.suomi.fi/model/test-model/');
      expect(result.metadata.name).toEqual({ fi: 'Testimalli' });
      expect(result.metadata.version).toBe('1.0.0');
      expect(result.metadata.status).toBe('VALID');
      expect(result.metadata.lastModified).toBe('2026-01-01T00:00:00Z');
      expect(result.metadata.originSyncTime).toBe('2026-07-28T10:00:00.000Z');

      expect(result.classes.length).toBe(2);

      const classA = result.classes.find((c: any) => c.id.endsWith('ClassA'));
      expect(classA).toBeDefined();
      expect(classA.uri).toBe('https://iri.suomi.fi/model/test-model/ClassA');
      expect(classA.name).toEqual({ fi: 'Luokka A' });

      expect(classA.attributes.length).toBe(1);
      expect(classA.attributes[0].id).toBe('https://iri.suomi.fi/model/test-model/attr1');
      expect(classA.attributes[0].cardinality).toBe('[1..1]');
      expect(classA.attributes[0].type).toBe('string');

      expect(classA.associations.length).toBe(1);
      expect(classA.associations[0].id).toBe('https://iri.suomi.fi/model/test-model/assoc1');
      expect(classA.associations[0].cardinality).toBe('[0..*]');
      expect(classA.associations[0].targetClassId).toBe('https://iri.suomi.fi/model/test-model/TargetB');
      expect(classA.associations[0].targetClassName).toEqual({ fi: 'Luokka B' });

      const classB = result.classes.find((c: any) => c.id.endsWith('TargetB'));
      expect(classB).toBeDefined();
      expect(classB.id).toBe('https://iri.suomi.fi/model/test-model/TargetB');

      expect(classA.codelists).toEqual(['http://uri.suomi.fi/codelist/test']);
      expect(classA.codelistIds).toBeUndefined();
    });
  });

  describe('fetchAndTransformTietomallit', () => {
    let mockFetch: any;

    beforeEach(() => {
      mockFetch = vi.fn();
      global.fetch = mockFetch;
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('fetches and writes JSON files according to index.json config', async () => {
      const mockConfig = {
        remote: {
          api: 'https://test-api.suomi.fi/getModel',
          name: 'Test Platform'
        },
        models: [
          {
            name: 'mock-model',
            versions: ['2.0.0']
          }
        ]
      };

      const mockJsonLd = {
        '@graph': [
          {
            '@id': 'https://iri.suomi.fi/model/mock-model/',
            '@type': 'owl:Ontology',
            'rdfs:label': [{ '@language': 'fi', '@value': 'Mock Malli' }]
          }
        ]
      };

      const existsSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const readSpy = vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));
      const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockJsonLd
      });

      await fetchAndTransformTietomallit('/data-index/suomi.fi/tietomallit/index.json', '/public/data/suomi.fi/tietomallit', 0);

      expect(mockFetch).toHaveBeenCalledWith('https://test-api.suomi.fi/getModel?modelId=mock-model&fileType=JSON-LD&version=2.0.0');
      expect(writeSpy).toHaveBeenCalledWith(
        path.join('/public/data/suomi.fi/tietomallit', 'mock-model-2.0.0.json'),
        expect.stringContaining('Mock Malli'),
        'utf-8'
      );

      existsSpy.mockRestore();
      readSpy.mockRestore();
      mkdirSpy.mockRestore();
      writeSpy.mockRestore();
    });
  });
});
