/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import { LocalFileDataModelAccess } from './local-data-model-access';

describe('LocalFileDataModelAccess', () => {
  let existsSyncSpy: any;
  let readFileSyncSpy: any;
  let readdirSyncSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    existsSyncSpy = vi.spyOn(fs, 'existsSync');
    readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
    readdirSyncSpy = vi.spyOn(fs, 'readdirSync');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getDataModel', () => {
    it('returns cached model if available', async () => {
      const access = new LocalFileDataModelAccess('/mock/dir');
      const mockData = { id: 'cached-model' };
      
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockData));

      const res1 = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res1).toEqual(mockData);

      // Subsequent call should use cache
      const res2 = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res2).toEqual(mockData);
      expect(readFileSyncSpy).toHaveBeenCalledTimes(1);
    });

    it('finds latest version file when no version is specified in modelId', async () => {
      existsSyncSpy.mockImplementation((p: string) => true);
      readdirSyncSpy.mockReturnValue(['rytj-kaava-1.0.0.json', 'rytj-kaava-1.0.5.json'] as any);
      const mockData = { id: 'latest-model' };
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockData));

      const access = new LocalFileDataModelAccess('/mock/dir');
      const res = await access.getDataModel('rytj-kaava');
      expect(res).toEqual(mockData);
    });

    it('returns null when file does not exist', async () => {
      existsSyncSpy.mockReturnValue(false);
      const access = new LocalFileDataModelAccess('/mock/dir');
      const res = await access.getDataModel('rytj-kaava-1.0.5');
      expect(res).toBeNull();
    });
  });

  describe('getCodelist', () => {
    it('returns codelist from primary path when exists', async () => {
      const mockData = { id: 'http://uri.suomi.fi/codelist/rytj/kaava_tyyppi' };
      existsSyncSpy.mockReturnValue(true);
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockData));

      const access = new LocalFileDataModelAccess('/mock/dir');
      const res = await access.getCodelist('http://uri.suomi.fi/codelist/rytj/kaava_tyyppi');
      expect(res).toEqual(mockData);
    });

    it('falls back to base codelist name without version suffix', async () => {
      const mockData = { id: 'http://uri.suomi.fi/codelist/rytj/kaava_tyyppi' };
      existsSyncSpy.mockImplementation((pathStr: string) => {
        if (pathStr.includes('kaava_tyyppi_v1_1.json')) return false;
        if (pathStr.includes('kaava_tyyppi.json')) return true;
        if (pathStr.endsWith('koodistot')) return true;
        return false;
      });
      readFileSyncSpy.mockReturnValue(JSON.stringify(mockData));

      const access = new LocalFileDataModelAccess('/mock/dir');
      const res = await access.getCodelist('http://uri.suomi.fi/codelist/rytj/kaava_tyyppi_v1_1');
      expect(res).toEqual(mockData);
    });
  });
});
