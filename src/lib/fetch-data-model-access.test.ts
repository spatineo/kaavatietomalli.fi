/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FetchDataModelAccess } from './fetch-data-model-access';

describe('FetchDataModelAccess', () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('getDataModel', () => {
    it('fetches model by name and version and caches result', async () => {
      const mockData = { metadata: { id: 'test-model' } };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const access = new FetchDataModelAccess('/data/suomi.fi');
      const res1 = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res1).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/data/suomi.fi/tietomallit/rytj-kaava-1.0.5.json');

      // Second call should return cached data without fetching again
      const res2 = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res2).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('falls back to non-versioned url when version url fails', async () => {
      const mockData = { metadata: { id: 'fallback-model' } };
      fetchMock
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      const access = new FetchDataModelAccess('/data/suomi.fi');
      const res = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/data/suomi.fi/tietomallit/rytj-kaava-1.0.5.json');
      expect(fetchMock).toHaveBeenCalledWith('/data/suomi.fi/tietomallit/rytj-kaava.json');
    });

    it('returns null if all fetches fail', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const access = new FetchDataModelAccess('/data/suomi.fi');
      const res = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res).toBeNull();
    });
  });

  describe('getCodelist', () => {
    it('fetches codelist by URI registry and name', async () => {
      const mockData = { id: 'http://uri.suomi.fi/codelist/rytj/kaava_tyyppi' };
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const access = new FetchDataModelAccess('/data/suomi.fi');
      const res = await access.getCodelist('http://uri.suomi.fi/codelist/rytj/kaava_tyyppi');
      expect(res).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/data/suomi.fi/koodistot/rytj/kaava_tyyppi.json');
    });

    it('falls back to base codelist name when version suffix fails', async () => {
      const mockData = { id: 'http://uri.suomi.fi/codelist/rytj/kaava_tyyppi' };
      fetchMock
        .mockResolvedValueOnce({ ok: false })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockData),
        });

      const access = new FetchDataModelAccess('/data/suomi.fi');
      const res = await access.getCodelist('http://uri.suomi.fi/codelist/rytj/kaava_tyyppi_v1_1');
      expect(res).toEqual(mockData);
      expect(fetchMock).toHaveBeenCalledWith('/data/suomi.fi/koodistot/rytj/kaava_tyyppi_v1_1.json');
      expect(fetchMock).toHaveBeenCalledWith('/data/suomi.fi/koodistot/rytj/kaava_tyyppi.json');
    });

    it('returns null if URI format is invalid or fetch fails', async () => {
      fetchMock.mockResolvedValue({ ok: false });
      const access = new FetchDataModelAccess('/data/suomi.fi');
      const res = await access.getCodelist('http://uri.suomi.fi/codelist/rytj/kaava_tyyppi');
      expect(res).toBeNull();
    });
  });
});
