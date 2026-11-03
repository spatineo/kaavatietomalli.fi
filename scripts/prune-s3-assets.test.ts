import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import {
  filterPrunableAssets,
  getLocalAssetFilenames,
  S3AssetObject,
} from './prune-s3-assets';

describe('prune-s3-assets script', () => {
  describe('filterPrunableAssets()', () => {
    const now = new Date('2026-11-03T12:00:00Z');
    const cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // 7 days ago: 2026-10-27T12:00:00Z

    it('returns empty array when there are no S3 objects', () => {
      const result = filterPrunableAssets([], new Set(['index-1.js']), cutoffDate);
      expect(result).toEqual([]);
    });

    it('keeps files that are part of the current local build even if older than cutoff', () => {
      const s3Objects: S3AssetObject[] = [
        {
          key: 'assets/current-vendor.js',
          lastModified: new Date('2026-09-01T00:00:00Z'), // 2 months old!
        },
      ];
      const localAssets = new Set(['current-vendor.js']);

      const result = filterPrunableAssets(s3Objects, localAssets, cutoffDate);
      expect(result).toEqual([]);
    });

    it('keeps orphaned files that are newer than the cutoff date (within grace period)', () => {
      const s3Objects: S3AssetObject[] = [
        {
          key: 'assets/old-chunk-from-yesterday.js',
          lastModified: new Date('2026-11-02T12:00:00Z'), // 1 day old
        },
      ];
      const localAssets = new Set(['new-chunk.js']);

      const result = filterPrunableAssets(s3Objects, localAssets, cutoffDate);
      expect(result).toEqual([]);
    });

    it('identifies orphaned files older than the cutoff date for deletion', () => {
      const s3Objects: S3AssetObject[] = [
        {
          key: 'assets/ancient-chunk.js',
          lastModified: new Date('2026-10-20T00:00:00Z'), // 14 days old
        },
        {
          key: 'assets/current-chunk.js',
          lastModified: new Date('2026-10-20T00:00:00Z'), // 14 days old, but present in current build
        },
        {
          key: 'assets/recent-orphan.js',
          lastModified: new Date('2026-11-01T00:00:00Z'), // 2 days old, orphaned but in grace period
        },
      ];
      const localAssets = new Set(['current-chunk.js']);

      const result = filterPrunableAssets(s3Objects, localAssets, cutoffDate);
      expect(result).toEqual(['assets/ancient-chunk.js']);
    });

    it('ignores files that do not start with assets/', () => {
      const s3Objects: S3AssetObject[] = [
        {
          key: 'index.html',
          lastModified: new Date('2026-01-01T00:00:00Z'),
        },
        {
          key: 'version.json',
          lastModified: new Date('2026-01-01T00:00:00Z'),
        },
      ];
      const localAssets = new Set<string>();

      const result = filterPrunableAssets(s3Objects, localAssets, cutoffDate);
      expect(result).toEqual([]);
    });
  });

  describe('getLocalAssetFilenames()', () => {
    it('returns empty set if directory does not exist', () => {
      const result = getLocalAssetFilenames('/non/existent/path');
      expect(result.size).toBe(0);
    });

    it('reads files recursively from directory', () => {
      const tempDir = path.join(process.cwd(), 'node_modules', '.temp-test-assets');
      try {
        fs.mkdirSync(path.join(tempDir, 'sub'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, 'file1.js'), 'code');
        fs.writeFileSync(path.join(tempDir, 'sub', 'file2.css'), 'style');

        const result = getLocalAssetFilenames(tempDir);
        expect(result.has('file1.js')).toBe(true);
        expect(result.has('sub/file2.css')).toBe(true);
        expect(result.size).toBe(2);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });
});

