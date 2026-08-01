/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOramaSearch } from './useOramaSearch';
import { create, load, search } from '@orama/orama';
import { BUILD_VERSION } from '../version';

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
    expect(fetchMock).toHaveBeenCalledWith(`/search-index-fi.json?v=${BUILD_VERSION}`);
    expect(fetchMock).toHaveBeenCalledWith(`/search-index-sv.json?v=${BUILD_VERSION}`);
    expect(fetchMock).toHaveBeenCalledWith(`/search-index-en.json?v=${BUILD_VERSION}`);
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
    expect(result.current.error?.message).toContain('Failed to fetch search index for fi');
  });

  it('performs search and returns all results without redundant post-processing or date-filtering', async () => {
    const { result } = renderHook(() => useOramaSearch());

    await waitFor(() => {
      expect(result.current.db).not.toBeNull();
    });

    // Call search with term
    const searchResults = await result.current.performSearch('tietomalli');

    expect(search).toHaveBeenCalledWith({ id: 'mock-db' }, expect.objectContaining({
      term: 'tietomalli',
    }));

    // Expecting all hits to be returned directly as pre-filtered at build-time
    expect(searchResults).toHaveLength(3);
    expect(searchResults[0].id).toBe('hit1');
    expect(searchResults[1].id).toBe('hit2');
    expect(searchResults[2].id).toBe('hit3');
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

  it('correctly propagates Finnish/Swedish special characters and configures tolerance for fuzzy matching', async () => {
    const { result } = renderHook(() => useOramaSearch());

    await waitFor(() => {
      expect(result.current.db).not.toBeNull();
    });

    // Test a term containing typical Finnish/Swedish special chars
    const fiTerm = 'Ääkkösiä ja Öitä';
    await result.current.performSearch(fiTerm);

    expect(search).toHaveBeenLastCalledWith({ id: 'mock-db' }, expect.objectContaining({
      term: fiTerm,
      tolerance: 1, // verifies partial/fuzzy matching tolerance config is correct
    }));

    // Test specific product/brand term common to Spatineo Kaavatietomalli
    const spatineoTerm = 'Spatineo Kaavatietomalli';
    await result.current.performSearch(spatineoTerm);
    expect(search).toHaveBeenLastCalledWith({ id: 'mock-db' }, expect.objectContaining({
      term: spatineoTerm,
    }));

    // Test empty string returns empty immediately without search invocation
    const emptyResults = await result.current.performSearch('');
    expect(emptyResults).toEqual([]);
  });

  it('avoids redundant index reconstructions and fetch calls during component transitions and re-renders', async () => {
    const { result, rerender } = renderHook(() => useOramaSearch());

    // Expect status is loading initially
    expect(result.current.isInitializing).toBe(true);

    await waitFor(() => {
      expect(result.current.db).not.toBeNull();
    });

    // Initial load should trigger fetch exactly 3 times (one per language index)
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Trigger multiple re-renders to simulate state transitions in standard React lifecycle
    rerender();
    rerender();
    rerender();

    // Verify initializing didn't restart and no redundant fetch/create was made
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(3);
    expect(result.current.isInitializing).toBe(false);
  });
});
