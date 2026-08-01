/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { cn, resolveImageUrl, fetchServerVersion, checkBackendVersion, scrollToAnchor } from './utils';
import { CONFIG } from '../config';

describe('utils library', () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  describe('cn()', () => {
    it('merges tailwind class names properly', () => {
      expect(cn('p-4', 'p-2', 'bg-red-500')).toBe('p-2 bg-red-500');
    });
  });

  describe('resolveImageUrl()', () => {
    it('returns empty string for undefined or empty input', () => {
      expect(resolveImageUrl(undefined)).toBe('');
      expect(resolveImageUrl('')).toBe('');
    });

    it('returns absolute http/https URLs as is', () => {
      expect(resolveImageUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
      expect(resolveImageUrl('http://example.com/img.png')).toBe('http://example.com/img.png');
    });

    it('returns absolute path or data URLs as is', () => {
      expect(resolveImageUrl('/img/test.png')).toBe('/img/test.png');
      expect(resolveImageUrl('data:image/png;base64,12345')).toBe('data:image/png;base64,12345');
    });

    it('resolves relative URLs against CONFIG.basePath', () => {
      const originalBasePath = CONFIG.basePath;
      CONFIG.basePath = '/testbase';

      expect(resolveImageUrl('img/test.png')).toBe('/testbase/img/test.png');
      expect(resolveImageUrl('../img/test.png')).toBe('/testbase/img/test.png');

      CONFIG.basePath = originalBasePath;
    });
  });

  describe('fetchServerVersion and checkBackendVersion', () => {
    it('returns null in dev mode without fetching', async () => {
      vi.stubEnv('DEV', true);
      const res = await fetchServerVersion();
      expect(res).toBeNull();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('fetches version.json when not in dev mode', async () => {
      vi.stubEnv('DEV', false);
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ version: '1.2.3' })
      });

      const res = await fetchServerVersion();
      expect(res).toBe('1.2.3');
    });

    it('checkBackendVersion returns true in dev mode', async () => {
      vi.stubEnv('DEV', true);
      const res = await checkBackendVersion();
      expect(res).toBe(true);
    });
  });

  describe('scrollToAnchor()', () => {
    it('scrolls element into view and updates hash', () => {
      const scrollIntoViewSpy = vi.fn();
      const mockElem = { scrollIntoView: scrollIntoViewSpy };
      vi.spyOn(document, 'getElementById').mockReturnValue(mockElem as any);

      scrollToAnchor('test-id');

      expect(scrollIntoViewSpy).toHaveBeenCalledWith({ behavior: 'smooth' });
    });
  });
});
