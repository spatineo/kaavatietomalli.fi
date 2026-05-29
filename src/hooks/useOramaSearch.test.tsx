/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOramaSearch } from './useOramaSearch';
import { create, load, search } from '@orama/orama';

// Configure self-contained mocks to prevent hoisting initialization issues
vi.mock('@orama/orama', () => {
  const mockDb = { id: 'mock-db' };
  const mockHits = {
    hits: [
      {
        id: 'hit1',
        score: 1,
        document: {
          type: 'post',
          title: 'Modern Architecture',
          slug: 'modern-arch',
          publishDate: '2026-01-01', // past relative to May 2026
        },
      },
      {
        id: 'hit2',
        score: 0.8,
        document: {
          type: 'post',
          title: 'Future Spec',
          slug: 'future-spec',
          publishDate: '2027-12-31', // future relative to May 2026
        },
      },
      {
        id: 'hit3',
        score: 0.9,
        document: {
          type: 'page',
          title: 'About Site',
          slug: 'about',
        },
      },
    ],
  };

  return {
    create: vi.fn().mockResolvedValue(mockDb),
    load: vi.fn().mockResolvedValue(undefined),
    search: vi.fn().mockResolvedValue(mockHits),
  };
});

vi.mock('@orama/stemmers/finnish', () => ({
  stemmer: vi.fn(),
}));

describe('useOramaSearch hook', () => {
  let fetchMock: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Silence expected console.error outputs
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Default mock setup for successful search index loading
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ dummyKey: 'dummyValue' }),
    };
    fetchMock = vi.fn().mockResolvedValue(mockResponse);
    vi.stubGlobal('fetch', fetchMock);
    
    // Stub import.meta.env
    vi.stubEnv('BASE_URL', '/');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('initializes the database successfully by fetching the index file', async () => {
    const { result } = renderHook(() => useOramaSearch());

    expect(result.current.isInitializing).toBe(true);
    expect(result.current.db).toBeNull();

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.db).toEqual({ id: 'mock-db' });
    expect(result.current.error).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith('/search-index.json');
    expect(create).toHaveBeenCalled();
    expect(load).toHaveBeenCalledWith({ id: 'mock-db' }, { dummyKey: 'dummyValue' });
  });

  it('sets the error state if fetching index fails', async () => {
    const mockFailedResponse = {
      ok: false,
      statusText: 'Not Found',
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockFailedResponse));

    const { result } = renderHook(() => useOramaSearch());

    await waitFor(() => {
      expect(result.current.isInitializing).toBe(false);
    });

    expect(result.current.db).toBeNull();
    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toContain('Failed to fetch search index');
  });

  it('performs search and filters future posts correctly based on local system date', async () => {
    const { result } = renderHook(() => useOramaSearch());

    await waitFor(() => {
      expect(result.current.db).not.toBeNull();
    });

    // Mock Date to a deterministic point in May 2026 using Vitest fake timers
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-29T12:00:00Z'));

    // Call search with term
    const searchResults = await result.current.performSearch('tietomalli');

    expect(search).toHaveBeenCalledWith({ id: 'mock-db' }, expect.objectContaining({
      term: 'tietomalli',
    }));

    // Expecting:
    // - hit1: post, published in past (2026-01-01) -> KEEP
    // - hit2: post, published in future (2027-12-31) -> FILTER OUT
    // - hit3: page, doesn't filter by publishDate -> KEEP
    expect(searchResults).toHaveLength(2);
    expect(searchResults[0].id).toBe('hit1');
    expect(searchResults[1].id).toBe('hit3');
  });

  it('returns an empty array immediately if the query term length is less than 2', async () => {
    const { result } = renderHook(() => useOramaSearch());

    await waitFor(() => {
      expect(result.current.db).not.toBeNull();
    });

    const searchResults = await result.current.performSearch('a');
    expect(searchResults).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('handles search exception/failure gracefully and returns empty results', async () => {
    const { result } = renderHook(() => useOramaSearch());

    await waitFor(() => {
      expect(result.current.db).not.toBeNull();
    });

    vi.mocked(search).mockRejectedValueOnce(new Error('Internal query exception'));

    const searchResults = await result.current.performSearch('error-trigger');
    expect(searchResults).toEqual([]);
  });
});
