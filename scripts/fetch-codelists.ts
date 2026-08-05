import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isContentEqual } from './content-utils';
import { Codelist, CodeItem, LocalizedText  } from '@/src/lib/data-model-types';
import { CONFIG } from '../src/config';

export interface CodelistItem {
  name: string;
}

export interface RegistryItem {
  name: string;
  codelists: CodelistItem[];
}

export interface CodelistConfig {
  remote: {
    api: string;
    name: string;
  };
  registries: RegistryItem[];
}

export interface CodelistIndexItem {
  id: string | null;
  uri: string;
  name?: LocalizedText;
  status: string | null;
  lastModified: string | null;
  registry: string;
  path: string;
}

export function getLaterDate(statusModified?: string | null, modified?: string | null): string | null {
  if (statusModified && modified) {
    const timeStatus = new Date(statusModified).getTime();
    const timeMod = new Date(modified).getTime();
    if (!isNaN(timeStatus) && !isNaN(timeMod)) {
      return timeStatus >= timeMod ? statusModified : modified;
    }
    if (!isNaN(timeStatus)) return statusModified;
    if (!isNaN(timeMod)) return modified;
    return statusModified >= modified ? statusModified : modified;
  }
  return statusModified || modified || null;
}

export function sortCodelistCodes(codes: CodeItem[]): CodeItem[] {
  // Map of codeValue -> code
  const codeMap = new Map<string, CodeItem>();
  for (const c of codes) {
    if (c.codeValue) {
      codeMap.set(c.codeValue, c);
    }
  }

  // Group by broaderCode
  const childrenMap = new Map<string, any[]>();
  const roots: any[] = [];

  for (const c of codes) {
    const parentCode = c.broaderCode;
    if (parentCode && codeMap.has(parentCode)) {
      if (!childrenMap.has(parentCode)) {
        childrenMap.set(parentCode, []);
      }
      childrenMap.get(parentCode)!.push(c);
    } else {
      roots.push(c);
    }
  }

  // Sort helper
  const compareCodes = (a: any, b: any) => {
    const orderA = a.order !== undefined && a.order !== null ? Number(a.order) : 0;
    const orderB = b.order !== undefined && b.order !== null ? Number(b.order) : 0;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return (a.codeValue || '').localeCompare(b.codeValue || '');
  };

  // Sort roots and each children list
  roots.sort(compareCodes);
  for (const [parentCode, children] of childrenMap.entries()) {
    children.sort(compareCodes);
  }

  const result: any[] = [];
  const visited = new Set<string>();

  function dfs(code: any) {
    if (!code.codeValue) return;
    if (visited.has(code.codeValue)) return;
    visited.add(code.codeValue);

    result.push(code);

    const children = childrenMap.get(code.codeValue) || [];
    for (const child of children) {
      dfs(child);
    }
  }

  for (const root of roots) {
    dfs(root);
  }

  // If there are any unvisited codes (e.g., due to cycles or missing keys), append them
  if (result.length < codes.length) {
    const unvisited = codes.filter(c => !c.codeValue || !visited.has(c.codeValue));
    unvisited.sort(compareCodes);
    for (const c of unvisited) {
      result.push(c);
    }
  }

  return result;
}

export function transformCodelistData(
  metaData: any,
  codesData: any,
  uri: string,
  fetchTimestamp?: string
) {
  let codelistLabels: LocalizedText = { unknown: uri.split('/').pop() || 'UnknownCodelist' };
  if (metaData && metaData.prefLabel) {
    codelistLabels = metaData.prefLabel;
  }

  const uriParts = uri ? uri.split('/') : [];
  const registryCode = metaData?.codeRegistry?.codeValue || (uriParts.length >= 2 ? uriParts[uriParts.length - 2] : '');
  const schemeCode = metaData?.codeValue || (uriParts.length >= 1 ? uriParts[uriParts.length - 1] : '');
  const documentationUrl = `https://koodistot.suomi.fi/codescheme;registryCode=${registryCode};schemeCode=${schemeCode}`;

  const rawCodes = Array.isArray(codesData) ? codesData : (codesData?.results || []);

  const codes: CodeItem[] = rawCodes
    .map((codeObj: any) => {
      const desc: Record<string, string> = codeObj.description ? { ...codeObj.description } : {};

      if (!desc.fi && codeObj.shortName) {
        if (typeof codeObj.shortName === 'object' && codeObj.shortName.fi) {
          desc.fi = codeObj.shortName.fi;
        } else if (typeof codeObj.shortName === 'string') {
          desc.fi = codeObj.shortName;
        }
      }

      const broaderCodeValue = typeof codeObj.broaderCode === 'string'
        ? codeObj.broaderCode
        : (codeObj.broaderCode?.codeValue || null);

      const code: CodeItem = {
        uri: codeObj.uri || null,
        codeValue: codeObj.codeValue || null,
        name: codeObj.prefLabel || {},
        hierarchyLevel: codeObj.hierarchyLevel || 1,
        status: codeObj.status || null,
        created: codeObj.created || null,
        modified: codeObj.modified || null,
        statusModified: codeObj.statusModified || null,
        description: desc
      };

      if (broaderCodeValue) {
        code.broaderCode = broaderCodeValue;
      }

      if (codeObj.order !== undefined && codeObj.order !== null) {
        code.order = Number(codeObj.order);
      }
      return code;
    });

  const sortedCodes: CodeItem[] = sortCodelistCodes(codes);

  return {
    id: metaData?.id || null,
    technicalName: metaData?.codeValue || null,
    uri: uri,
    vocabulary: uri,
    documentationUrl,
    name: codelistLabels,
    definition: metaData?.definition || {},
    description: metaData?.description || {},
    created: metaData?.created || null,
    modified: metaData?.modified || null,
    statusModified: metaData?.statusModified || null,
    status: metaData?.status || null,
    originSyncTime: fetchTimestamp || new Date().toISOString(),
    allVersions: metaData?.allVersions || [],
    codes: sortedCodes
  } as Codelist;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAndTransformCodelists(
  configPath?: string,
  outputBaseDir?: string,
  delayMs: number = 500
): Promise<{ totalProcessed: number; changedCount: number }> {
  const resolvedConfigPath =
    configPath ||
    path.join(process.cwd(), 'data-index', 'suomi.fi', 'koodistot', 'index.json');
  const resolvedOutputDir =
    outputBaseDir ||
    path.join(process.cwd(), 'public', 'data', 'suomi.fi', 'koodistot');

  if (!fs.existsSync(resolvedConfigPath)) {
    console.warn(`Configuration file not found at ${resolvedConfigPath}`);
    return { totalProcessed: 0, changedCount: 0 };
  }

  const rawConfig = fs.readFileSync(resolvedConfigPath, 'utf-8');
  const config: CodelistConfig = JSON.parse(rawConfig);

  const apiBase = config.remote?.api
    ? config.remote.api.endsWith('/')
      ? config.remote.api
      : `${config.remote.api}/`
    : 'https://koodistot.suomi.fi/codelist-api/api/v1/';

  if (!fs.existsSync(resolvedOutputDir)) {
    fs.mkdirSync(resolvedOutputDir, { recursive: true });
  }

  let requestCount = 0;
  let totalProcessed = 0;
  let changedCount = 0;
  const indexItems: CodelistIndexItem[] = [];

  for (const registry of config.registries || []) {
    if (!registry.name) continue;

    const registryDir = path.join(resolvedOutputDir, registry.name);
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }

    for (const codelist of registry.codelists || []) {
      if (!codelist.name || codelist.name.trim() === '') continue;

      if (requestCount > 0 && delayMs > 0) {
        await sleep(delayMs);
      }
      requestCount++;
      totalProcessed++;

      const uri = `http://uri.suomi.fi/codelist/${registry.name}/${codelist.name}`;

      try {
        const fetchTimestamp = new Date().toISOString();

        const metaApiUrl = `${apiBase}coderegistries/${registry.name}/codeschemes/${codelist.name}/`;
        const codesApiUrl = `${apiBase}coderegistries/${registry.name}/codeschemes/${codelist.name}/codes/`;

        console.log(`Fetching codelist: ${registry.name}/${codelist.name}...`);

        const [metaRes, codesRes] = await Promise.all([
          fetch(metaApiUrl, CONFIG.remoteFetchOptions),
          fetch(codesApiUrl, CONFIG.remoteFetchOptions)
        ]);

        if (!metaRes.ok || !codesRes.ok) {
          throw new Error(`HTTP meta:${metaRes.status}, codes:${codesRes.status}`);
        }

        const metaData = await metaRes.json();
        const codesData = await codesRes.json();

        const transformed: Codelist = transformCodelistData(metaData, codesData, uri, fetchTimestamp);

        const outputFilename = `${codelist.name}.json`;
        const outputPath = path.join(registryDir, outputFilename);
        const relativePath = `${registry.name}/${outputFilename}`;

        indexItems.push({
          id: transformed.id,
          uri: transformed.uri,
          name: transformed.name,
          status: transformed.status,
          lastModified: getLaterDate(transformed.statusModified, transformed.modified),
          registry: registry.name,
          path: relativePath
        });

        let contentChanged = true;
        if (fs.existsSync(outputPath)) {
          try {
            const existingContent = fs.readFileSync(outputPath, 'utf-8');
            const existingJson = JSON.parse(existingContent);
            contentChanged = !isContentEqual(existingJson, transformed);
          } catch {
            contentChanged = true;
          }
        }

        if (contentChanged) {
          changedCount++;
          fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2), 'utf-8');
          console.log(`Saved transformed codelist (CONTENT CHANGED) to ${outputPath}`);
        } else {
          console.log(`Skipped transformed codelist (content unchanged) to ${outputPath}`);
        }
        
      } catch (err) {
        console.error(`Failed to process codelist ${registry.name}/${codelist.name}:`, err);
      }
    }
  }

  const indexFilePath = path.join(resolvedOutputDir, 'index.json');
  let indexChanged = true;
  if (fs.existsSync(indexFilePath)) {
    try {
      const existingIndexContent = fs.readFileSync(indexFilePath, 'utf-8');
      const existingIndexJson = JSON.parse(existingIndexContent);
      indexChanged = !isContentEqual(existingIndexJson, indexItems);
    } catch {
      indexChanged = true;
    }
  }

  if (indexChanged) {
    fs.writeFileSync(indexFilePath, JSON.stringify(indexItems, null, 2), 'utf-8');
    console.log(`Saved codelists index (CONTENT CHANGED) to ${indexFilePath}`);
  } else {
    console.log(`Skipped codelists index (content unchanged) to ${indexFilePath}`);
  }

  return { totalProcessed, changedCount };
}

if (process.env.NODE_ENV !== 'test') {
  if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
    fetchAndTransformCodelists();
  }
}
