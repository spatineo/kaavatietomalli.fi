import { DataModelAccess } from './data-model-types';
import { parseModelId } from './local-data-model-access';

export class FetchDataModelAccess implements DataModelAccess {
  private baseUrl: string;
  private codelistCache: Map<string, any> = new Map();
  private modelCache: Map<string, any> = new Map();

  constructor(baseUrl: string = '/data/suomi.fi') {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  async getDataModel(modelId: string): Promise<any | null> {
    if (this.modelCache.has(modelId)) {
      return this.modelCache.get(modelId);
    }

    const { name, version } = parseModelId(modelId);
    const versionPart = version ? `-${version}` : '';
    const url = `${this.baseUrl}/tietomallit/${name}${versionPart}.json`;

    try {
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        this.modelCache.set(modelId, data);
        return data;
      }
    } catch (err) {
      console.error(`Fetch error for model ${url}:`, err);
    }

    if (versionPart) {
      try {
        const altUrl = `${this.baseUrl}/tietomallit/${name}.json`;
        const res = await fetch(altUrl);
        if (res.ok) {
          const data = await res.json();
          this.modelCache.set(modelId, data);
          return data;
        }
      } catch {
        // ignore
      }
    }

    return null;
  }

  async getCodelist(codelistUriOrId: string): Promise<any | null> {
    if (this.codelistCache.has(codelistUriOrId)) {
      return this.codelistCache.get(codelistUriOrId);
    }

    const parts = codelistUriOrId.replace(/\/+$/, '').split('/');
    const codeName = parts[parts.length - 1];
    const registry = parts.length >= 2 ? parts[parts.length - 2] : '';

    if (registry && codeName) {
      const primaryUrl = `${this.baseUrl}/koodistot/${registry}/${codeName}.json`;
      try {
        const res = await fetch(primaryUrl);
        if (res.ok) {
          const data = await res.json();
          this.codelistCache.set(codelistUriOrId, data);
          return data;
        }
      } catch {
        // ignore
      }

      const codeNameBase = codeName.replace(/_v\d+_\d+$/, '');
      if (codeNameBase !== codeName) {
        const fallbackUrl = `${this.baseUrl}/koodistot/${registry}/${codeNameBase}.json`;
        try {
          const res = await fetch(fallbackUrl);
          if (res.ok) {
            const data = await res.json();
            this.codelistCache.set(codelistUriOrId, data);
            return data;
          }
        } catch {
          // ignore
        }
      }
    }

    return null;
  }
}
