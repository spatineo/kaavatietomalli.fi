/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { fetchJsonCached, clearFetchCache } from './fetch-cache';

describe('fetchJsonCached', () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    clearFetchCache();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetches JSON once and returns cached promise on subsequent calls', async () => {
    const mockData = { test: 'value' };
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const p1 = fetchJsonCached('/test-url');
    const p2 = fetchJsonCached('/test-url');

    // Both should be the exact same promise instance (deduplication)
    expect(p1).toBe(p2);

    const res1 = await p1;
    const res2 = await p2;

    expect(res1).toEqual(mockData);
    expect(res2).toEqual(mockData);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Call again after resolution
    const res3 = await fetchJsonCached('/test-url');
    expect(res3).toEqual(mockData);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('removes the URL from cache if the fetch fails', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      statusText: 'Not Found',
    });

    await expect(fetchJsonCached('/fail-url')).rejects.toThrow('Failed to fetch /fail-url: Not Found');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Next fetch should try again
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    const res = await fetchJsonCached('/fail-url');
    expect(res).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
