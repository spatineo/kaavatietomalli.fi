import fs from 'fs';
import path from 'path';
import { DataModelAccess } from './data-model-types';
import { parseModelId } from './data-model-utils';

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
    const publicFolder = process.env.CONTENT_MODE === 'test' ? 'test-public' : 'public';
    const dataModelsDir = path.join(this.baseDir, publicFolder, 'data', 'suomi.fi', 'tietomallit');

    let targetFile = '';
    if (version) {
      targetFile = path.join(dataModelsDir, `${name}-${version}.json`);
    } else {
      if (fs.existsSync(dataModelsDir)) {
        const files = fs.readdirSync(dataModelsDir).filter(f => f.startsWith(name) && f.endsWith('.json'));
        if (files.length > 0) {
          files.sort().reverse();
          targetFile = path.join(dataModelsDir, files[0]);
        }
      }
    }

    if (!targetFile || !fs.existsSync(targetFile)) {
      const altPath = path.join(dataModelsDir, `${modelId}.json`);
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

    const publicFolder = process.env.CONTENT_MODE === 'test' ? 'test-public' : 'public';
    const codelistsDir = path.join(this.baseDir, publicFolder, 'data', 'suomi.fi', 'koodistot');
    if (!fs.existsSync(codelistsDir)) {
      return null;
    }

    const parts = codelistUriOrId.replace(/\/+$/, '').split('/');
    const codeName = parts[parts.length - 1];
    const registry = parts.length >= 2 ? parts[parts.length - 2] : '';

    let fileToLoad = '';
    if (registry && fs.existsSync(path.join(codelistsDir, registry, `${codeName}.json`))) {
      fileToLoad = path.join(codelistsDir, registry, `${codeName}.json`);
    } else {
      const codeNameBase = codeName.replace(/_v\d+_\d+$/, '');
      if (registry && fs.existsSync(path.join(codelistsDir, registry, `${codeNameBase}.json`))) {
        fileToLoad = path.join(codelistsDir, registry, `${codeNameBase}.json`);
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
      const foundPath = scanDir(codelistsDir);
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
