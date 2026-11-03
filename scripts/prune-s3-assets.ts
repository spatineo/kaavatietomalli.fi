import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

export interface S3AssetObject {
  key: string;
  lastModified: Date;
}

/**
 * Filter S3 assets to find keys that are:
 * 1. Located under the 'assets/' prefix.
 * 2. NOT in the local current build assets list.
 * 3. Have a LastModified timestamp older than the cutoff date.
 */
export function filterPrunableAssets(
  s3Objects: S3AssetObject[],
  currentAssetFilenames: Set<string>,
  cutoffDate: Date
): string[] {
  const prunableKeys: string[] = [];

  for (const obj of s3Objects) {
    if (!obj.key || !obj.lastModified) continue;

    // We only prune files under assets/
    if (!obj.key.startsWith('assets/')) continue;

    // Get relative filename within assets/, e.g. "assets/index-ABC.js" -> "index-ABC.js"
    const relativeAssetPath = obj.key.replace(/^assets\//, '');
    if (!relativeAssetPath) continue;

    // If file is in the current build, keep it regardless of age
    if (currentAssetFilenames.has(relativeAssetPath)) {
      continue;
    }

    // If file is older than the cutoff date, it's safe to prune
    if (obj.lastModified.getTime() < cutoffDate.getTime()) {
      prunableKeys.push(obj.key);
    }
  }

  return prunableKeys;
}

/**
 * Reads local filenames in dist/assets recursively
 */
export function getLocalAssetFilenames(distAssetsDir: string): Set<string> {
  const filenames = new Set<string>();
  if (!fs.existsSync(distAssetsDir)) {
    console.warn(`[Prune S3 Assets] Warning: Local assets directory does not exist: ${distAssetsDir}`);
    return filenames;
  }

  function scan(dir: string, baseDir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath, baseDir);
      } else if (entry.isFile()) {
        const rel = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        filenames.add(rel);
      }
    }
  }

  scan(distAssetsDir, distAssetsDir);
  return filenames;
}

/**
 * Queries S3 via AWS CLI to list objects under assets/
 */
export function listS3Assets(bucketName: string): S3AssetObject[] {
  const results: S3AssetObject[] = [];
  let nextToken: string | undefined = undefined;

  do {
    const args = [
      's3api',
      'list-objects-v2',
      '--bucket',
      bucketName,
      '--prefix',
      'assets/',
      '--output',
      'json',
    ];

    if (nextToken) {
      args.push('--continuation-token', nextToken);
    }

    const output = execFileSync('aws', args, { encoding: 'utf-8' });
    const parsed = JSON.parse(output);

    if (parsed.Contents && Array.isArray(parsed.Contents)) {
      for (const item of parsed.Contents) {
        if (item.Key && item.LastModified) {
          results.push({
            key: item.Key,
            lastModified: new Date(item.LastModified),
          });
        }
      }
    }

    nextToken = parsed.NextContinuationToken;
  } while (nextToken);

  return results;
}

/**
 * Deletes objects from S3 in batches of up to 1000
 */
export function deleteS3Objects(bucketName: string, keys: string[]): void {
  if (keys.length === 0) return;

  const batchSize = 1000;
  for (let i = 0; i < keys.length; i += batchSize) {
    const chunk = keys.slice(i, i + batchSize);
    const deletePayload = JSON.stringify({
      Objects: chunk.map((k) => ({ Key: k })),
      Quiet: true,
    });

    execFileSync(
      'aws',
      ['s3api', 'delete-objects', '--bucket', bucketName, '--delete', deletePayload],
      { encoding: 'utf-8' }
    );
  }
}

export interface PruneOptions {
  bucketName?: string;
  distAssetsDir?: string;
  graceDays?: number;
  dryRun?: boolean;
}

export async function pruneS3Assets(options: PruneOptions = {}): Promise<string[]> {
  const bucketName = options.bucketName || process.env.BUCKET_NAME;
  if (!bucketName) {
    console.warn('[Prune S3 Assets] BUCKET_NAME is not set, skipping S3 pruning.');
    return [];
  }

  const distAssetsDir = options.distAssetsDir || path.resolve(process.cwd(), 'dist', 'assets');
  const graceDays = options.graceDays ?? (Number(process.env.PRUNE_GRACE_DAYS) || 7);
  const dryRun = options.dryRun ?? (process.env.DRY_RUN === 'true');

  console.log(`[Prune S3 Assets] Checking S3 bucket "${bucketName}" for obsolete assets older than ${graceDays} days...`);

  const localAssets = getLocalAssetFilenames(distAssetsDir);
  console.log(`[Prune S3 Assets] Found ${localAssets.size} active asset files in current build (${distAssetsDir}).`);

  if (localAssets.size === 0) {
    console.warn('[Prune S3 Assets] Local assets directory has 0 files! Aborting prune to prevent accidental asset deletion.');
    return [];
  }

  const s3Assets = listS3Assets(bucketName);
  console.log(`[Prune S3 Assets] Found ${s3Assets.length} total objects in s3://${bucketName}/assets/`);

  const cutoffDate = new Date(Date.now() - graceDays * 24 * 60 * 60 * 1000);
  const prunableKeys = filterPrunableAssets(s3Assets, localAssets, cutoffDate);

  if (prunableKeys.length === 0) {
    console.log('[Prune S3 Assets] No obsolete assets found to prune.');
    return [];
  }

  console.log(`[Prune S3 Assets] Identified ${prunableKeys.length} obsolete asset chunk(s) older than ${graceDays} days.`);

  if (dryRun) {
    console.log('[Prune S3 Assets] DRY_RUN is enabled. The following keys would be deleted:');
    prunableKeys.forEach((k) => console.log(`  - ${k}`));
    return prunableKeys;
  }

  deleteS3Objects(bucketName, prunableKeys);
  console.log(`[Prune S3 Assets] Successfully pruned ${prunableKeys.length} obsolete chunk(s) from S3.`);

  return prunableKeys;
}

if (process.env.NODE_ENV !== 'test') {
  pruneS3Assets().catch((err) => {
    console.error('[Prune S3 Assets] Error during execution:', err);
    process.exit(1);
  });
}

