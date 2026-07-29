import fs from 'fs';
import path from 'path';
import { DataModelAccess } from './data-model-types';

export function parseModelId(modelId: string): { name: string; version?: string } {
  let cleaned = modelId.trim();
  let version: string | undefined;

  const hashIndex = cleaned.indexOf('#');
  if (hashIndex !== -1) {
    const frag = cleaned.substring(hashIndex + 1);
    version = frag.replace(/^v/, '');
    cleaned = cleaned.substring(0, hashIndex);
  }

  cleaned = cleaned.replace(/\/+$/, '');
  const parts = cleaned.split('/');
  const lastPart = parts[parts.length - 1] || cleaned;

  if (!version) {
    if (/^v?\d+\.\d+\.\d+$/.test(lastPart)) {
      version = lastPart.replace(/^v/, '');
      parts.pop();
    }
  }

  const effectiveLast = parts[parts.length - 1] || lastPart;
  const dashMatch = effectiveLast.match(/^(.*?)-v?(\d+\.\d+\.\d+)$/);
  let name = effectiveLast;

  if (dashMatch) {
    name = dashMatch[1];
    if (!version) version = dashMatch[2];
  }

  return { name, version };
}

export class LocalFileDataModelAccess implements DataModelAccess {
  private baseDir: string;
  private codelistCache: Map<string, any> = new Map();
  private modelCache: Map<string, any> = new Map();

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.cwd();
  }

  async getDataModel(modelId: string): Promise<any | null> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId);
    }

    const { name, version } = parseModelId(modelId);
    const tietomallitDir = path.join(this.baseDir, 'public', 'data', 'suomi.fi', 'tietomallit');

    let targetFile = '';
    if (version) {
      targetFile = path.join(tietomallitDir, `${name}-${version}.json`);
    } else {
      if (fs.existsSync(tietomallitDir)) {
        const files = fs.readdirSync(tietomallitDir).filter(f => f.startsWith(name) && f.endsWith('.json'));
        if (files.length > 0) {
          files.sort().reverse();
          targetFile = path.join(tietomallitDir, files[0]);
        }
      }
    }

    if (!targetFile || !fs.existsSync(targetFile)) {
      const altPath = path.join(tietomallitDir, `${modelId}.json`);
      if (fs.existsSync(altPath)) {
        targetFile = altPath;
      }
    }

    if (targetFile && fs.existsSync(targetFile)) {
      try {
        const content = fs.readFileSync(targetFile, 'utf-8');
        const data = JSON.parse(content);
        this.modelCache.set(modelId, data);
        return data;
      } catch (err) {
        console.error(`Error reading model file ${targetFile}:`, err);
      }
    }

    return null;
  }

  async getCodelist(codelistUriOrId: string): Promise<any | null> {
    if (this.codelistCache.has(codelistUriOrId)) {
      return this.codelistCache.get(codelistUriOrId);
    }

    const koodistotDir = path.join(this.baseDir, 'public', 'data', 'suomi.fi', 'koodistot');
    if (!fs.existsSync(koodistotDir)) {
      return null;
    }

    const parts = codelistUriOrId.replace(/\/+$/, '').split('/');
    const codeName = parts[parts.length - 1];
    const registry = parts.length >= 2 ? parts[parts.length - 2] : '';

    let fileToLoad = '';
    if (registry && fs.existsSync(path.join(koodistotDir, registry, `${codeName}.json`))) {
      fileToLoad = path.join(koodistotDir, registry, `${codeName}.json`);
    } else {
      const codeNameBase = codeName.replace(/_v\d+_\d+$/, '');
      if (registry && fs.existsSync(path.join(koodistotDir, registry, `${codeNameBase}.json`))) {
        fileToLoad = path.join(koodistotDir, registry, `${codeNameBase}.json`);
      }
    }

    if (!fileToLoad) {
      const scanDir = (dir: string): string | null => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            const found = scanDir(fullPath);
            if (found) return found;
          } else if (entry.isFile() && entry.name.endsWith('.json')) {
            try {
              const raw = fs.readFileSync(fullPath, 'utf-8');
              if (raw.includes(codelistUriOrId)) {
                const json = JSON.parse(raw);
                if (json.uri === codelistUriOrId || json.vocabulary === codelistUriOrId || json.id === codelistUriOrId) {
                  return fullPath;
                }
              }
            } catch {
              // ignore
            }
          }
        }
        return null;
      };
      const foundPath = scanDir(koodistotDir);
      if (foundPath) fileToLoad = foundPath;
    }

    if (fileToLoad && fs.existsSync(fileToLoad)) {
      try {
        const content = fs.readFileSync(fileToLoad, 'utf-8');
        const data = JSON.parse(content);
        this.codelistCache.set(codelistUriOrId, data);
        return data;
      } catch (err) {
        console.error(`Error reading codelist file ${fileToLoad}:`, err);
      }
    }

    return null;
  }
}
