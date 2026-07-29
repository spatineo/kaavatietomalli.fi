import fs from 'fs';
import path from 'path';
import { isContentEqual } from './content-utils';

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

export function transformCodelistData(
  metaData: any,
  codesData: any,
  uri: string,
  fetchTimestamp?: string
) {
  let codelistLabels: Record<string, string> = { unknown: uri.split('/').pop() || 'UnknownCodelist' };
  if (metaData && metaData.prefLabel) {
    codelistLabels = metaData.prefLabel;
  }

  const rawCodes = Array.isArray(codesData) ? codesData : (codesData?.results || []);

  const codes = rawCodes
    .map((codeObj: any) => {
      const desc: Record<string, string> = codeObj.description ? { ...codeObj.description } : {};

      if (!desc.fi && codeObj.shortName) {
        if (typeof codeObj.shortName === 'object' && codeObj.shortName.fi) {
          desc.fi = codeObj.shortName.fi;
        } else if (typeof codeObj.shortName === 'string') {
          desc.fi = codeObj.shortName;
        }
      }

      return {
        id: codeObj.id || null,
        uri: codeObj.uri || null,
        codeValue: codeObj.codeValue || null,
        names: codeObj.prefLabel || {},
        hierarchyLevel: codeObj.hierarchyLevel || 1,
        status: codeObj.status || null,
        created: codeObj.created || null,
        modified: codeObj.modified || null,
        statusModified: codeObj.statusModified || null,
        description: desc
      };
    })
    .sort((a: any, b: any) => (a.uri || '').localeCompare(b.uri || ''));

  return {
    id: metaData?.id || null,
    uri: uri,
    vocabulary: uri,
    names: codelistLabels,
    definitions: metaData?.definition || {},
    descriptions: metaData?.description || {},
    created: metaData?.created || null,
    modified: metaData?.modified || null,
    statusModified: metaData?.statusModified || null,
    status: metaData?.status || null,
    originSyncTime: fetchTimestamp || new Date().toISOString(),
    allVersions: metaData?.allVersions || [],
    codes: codes
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchAndTransformKoodistot(
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
          fetch(metaApiUrl),
          fetch(codesApiUrl)
        ]);

        if (!metaRes.ok || !codesRes.ok) {
          throw new Error(`HTTP meta:${metaRes.status}, codes:${codesRes.status}`);
        }

        const metaData = await metaRes.json();
        const codesData = await codesRes.json();

        const transformed = transformCodelistData(metaData, codesData, uri, fetchTimestamp);

        const outputFilename = `${codelist.name}.json`;
        const outputPath = path.join(registryDir, outputFilename);

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
          console.log(`Saved transformed codelist (CONTENT CHANGED) to ${outputPath}`);
        } else {
          console.log(`Saved transformed codelist (content unchanged) to ${outputPath}`);
        }

        fs.writeFileSync(outputPath, JSON.stringify(transformed, null, 2), 'utf-8');
      } catch (err) {
        console.error(`Failed to process codelist ${registry.name}/${codelist.name}:`, err);
      }
    }
  }

  return { totalProcessed, changedCount };
}

if (process.env.NODE_ENV !== 'test') {
  fetchAndTransformKoodistot();
}
