import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  extractMunicipalityNamesFromCodelist,
  enrichMunicipalityFeatures,
  fetchAndTransformMunicipalities
} from './fetch-municipality-data';

describe('fetch-municipality-data script', () => {
  describe('extractMunicipalityNamesFromCodelist', () => {
    it('extracts and maps codes correctly from codelist JSON structure', () => {
      const codelist = {
        id: 'kunta-1',
        technicalName: 'kunta_1_20240101',
        codes: [
          {
            codeValue: '091',
            names: {
              fi: 'Helsinki',
              sv: 'Helsingfors',
              en: 'Helsinki'
            }
          },
          {
            codeValue: '49',
            names: {
              fi: 'Espoo',
              sv: 'Esbo'
            }
          }
        ]
      };

      const map = extractMunicipalityNamesFromCodelist(codelist);
      expect(map['091']).toBeDefined();
      expect(map['091'].fi).toBe('Helsinki');
      expect(map['091'].sv).toBe('Helsingfors');
      expect(map['91'].fi).toBe('Helsinki');

      expect(map['049']).toBeDefined();
      expect(map['049'].fi).toBe('Espoo');
      expect(map['49'].fi).toBe('Espoo');
    });

    it('handles prefLabel format from API results array', () => {
      const results = [
        {
          codeValue: '749',
          prefLabel: {
            fi: 'Siilinjärvi',
            sv: 'Siilinjärvi'
          }
        }
      ];

      const map = extractMunicipalityNamesFromCodelist(results);
      expect(map['749']).toBeDefined();
      expect(map['749'].fi).toBe('Siilinjärvi');
    });
  });

  describe('enrichMunicipalityFeatures', () => {
    it('enriches raw features with padded NATCODE and mapped names and sorts alphabetically', () => {
      const rawFeatures = [
        {
          id: 'kunta.749',
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { kuntatunnus: 749 }
        },
        {
          id: 'kunta.091',
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { kuntatunnus: 91 }
        },
        {
          id: 'kunta.049',
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [] },
          properties: { kuntatunnus: 49 }
        }
      ];

      const nameMap = {
        '091': { fi: 'Helsinki', sv: 'Helsingfors' },
        '91': { fi: 'Helsinki', sv: 'Helsingfors' },
        '749': { fi: 'Siilinjärvi', sv: 'Siilinjärvi' },
        '049': { fi: 'Espoo', sv: 'Esbo' },
        '49': { fi: 'Espoo', sv: 'Esbo' }
      };

      const enriched = enrichMunicipalityFeatures(rawFeatures, nameMap);
      expect(enriched.length).toBe(3);

      // Alphabetical order in Finnish: Espoo, Helsinki, Siilinjärvi
      expect(enriched[0].properties.NAMEFIN).toBe('Espoo');
      expect(enriched[0].properties.NATCODE).toBe('049');
      expect(enriched[0].properties.NAMESWE).toBe('Esbo');
      expect(enriched[0].properties.kuntatunnus).toBe(49);

      expect(enriched[1].properties.NAMEFIN).toBe('Helsinki');
      expect(enriched[1].properties.NATCODE).toBe('091');
      expect(enriched[1].properties.NAMESWE).toBe('Helsingfors');

      expect(enriched[2].properties.NAMEFIN).toBe('Siilinjärvi');
      expect(enriched[2].properties.NATCODE).toBe('749');
    });
  });

  describe('fetchAndTransformMunicipalities', () => {
    const testOutputDir = path.join(process.cwd(), 'test-public', 'data', 'nls.fi');

    beforeEach(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    afterEach(() => {
      if (fs.existsSync(testOutputDir)) {
        fs.rmSync(testOutputDir, { recursive: true, force: true });
      }
    });

    it('processes test mode fixture and saves municipalities index and individual files to test-public', async () => {
      const prevContentMode = process.env.CONTENT_MODE;
      process.env.CONTENT_MODE = 'test';

      try {
        const res = await fetchAndTransformMunicipalities({
          outputBaseDir: testOutputDir
        });

        expect(res.totalProcessed).toBeGreaterThan(0);
        expect(res.changedCount).toBeGreaterThan(0);

        const indexFile = path.join(testOutputDir, 'municipalities.json');
        expect(fs.existsSync(indexFile)).toBe(true);

        const indexContent = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        expect(Array.isArray(indexContent)).toBe(true);
        expect(indexContent.length).toBe(res.totalProcessed);
        expect(indexContent[0].natcode).toBeDefined();
        expect(indexContent[0].nameFin).toBeDefined();
        expect(indexContent[0].numberOfDetailedPlansInRyhti).toBeDefined();
        expect(typeof indexContent[0].numberOfDetailedPlansInRyhti).toBe('number');

        // Check that individual municipality files were created
        const firstMuniCode = indexContent[0].natcode;
        const individualFile = path.join(testOutputDir, 'municipalities', `${firstMuniCode}.json`);
        expect(fs.existsSync(individualFile)).toBe(true);

        const individualContent = JSON.parse(fs.readFileSync(individualFile, 'utf-8'));
        expect(individualContent.type).toBe('Feature');
        expect(individualContent.geometry).toBeDefined();
        expect(individualContent.properties).toBeDefined();

        // Second run with same data should detect unchanged content
        const res2 = await fetchAndTransformMunicipalities({
          outputBaseDir: testOutputDir
        });
        expect(res2.changedCount).toBe(0);
      } finally {
        process.env.CONTENT_MODE = prevContentMode;
      }
    });
  });
});
