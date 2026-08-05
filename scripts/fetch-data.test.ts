import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isContentEqual } from './content-utils';
import { fetchAllData } from './fetch-data';
import * as fetchDataModelsModule from './fetch-data-models';
import * as fetchCodelistsModule from './fetch-codelists';
import fs from 'fs';

describe('isContentEqual', () => {
  it('returns false if either object is falsy', () => {
    expect(isContentEqual(null, {})).toBe(false);
    expect(isContentEqual({}, undefined)).toBe(false);
  });

  it('returns true if objects are identical except root originSyncTime', () => {
    const objA = {
      id: 'test',
      names: { fi: 'Testi' },
      originSyncTime: '2026-07-28T00:00:00.000Z'
    };
    const objB = {
      id: 'test',
      names: { fi: 'Testi' },
      originSyncTime: '2026-07-28T12:00:00.000Z'
    };
    expect(isContentEqual(objA, objB)).toBe(true);
  });

  it('returns true if objects are identical except metadata.originSyncTime', () => {
    const objA = {
      metadata: {
        id: 'model-1',
        originSyncTime: '2026-07-01T00:00:00.000Z'
      },
      classes: [{ id: 'ClassA' }]
    };
    const objB = {
      metadata: {
        id: 'model-1',
        originSyncTime: '2026-07-28T00:00:00.000Z'
      },
      classes: [{ id: 'ClassA' }]
    };
    expect(isContentEqual(objA, objB)).toBe(true);
  });

  it('returns false if content differs outside of originSyncTime', () => {
    const objA = {
      metadata: {
        id: 'model-1',
        version: '1.0.0',
        originSyncTime: '2026-07-01T00:00:00.000Z'
      },
      classes: [{ id: 'ClassA' }]
    };
    const objB = {
      metadata: {
        id: 'model-1',
        version: '1.0.1',
        originSyncTime: '2026-07-01T00:00:00.000Z'
      },
      classes: [{ id: 'ClassA' }]
    };
    expect(isContentEqual(objA, objB)).toBe(false);
  });
});

describe('fetchAllData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns dataChanged: false when no files changed', async () => {
    vi.spyOn(fetchDataModelsModule, 'fetchAndTransformDataModels').mockResolvedValue({
      totalProcessed: 2,
      changedCount: 0
    });
    vi.spyOn(fetchCodelistsModule, 'fetchAndTransformCodelists').mockResolvedValue({
      totalProcessed: 5,
      changedCount: 0
    });

    const result = await fetchAllData();
    expect(result.dataChanged).toBe(false);
    expect(result.totalChanged).toBe(0);
  });

  it('returns dataChanged: true when at least one file changed', async () => {
    vi.spyOn(fetchDataModelsModule, 'fetchAndTransformDataModels').mockResolvedValue({
      totalProcessed: 2,
      changedCount: 1
    });
    vi.spyOn(fetchCodelistsModule, 'fetchAndTransformCodelists').mockResolvedValue({
      totalProcessed: 5,
      changedCount: 0
    });

    const result = await fetchAllData();
    expect(result.dataChanged).toBe(true);
    expect(result.totalChanged).toBe(1);
  });
});
