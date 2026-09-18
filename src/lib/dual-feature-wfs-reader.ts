import {
  WFSResultFeature,
  WFSFeatureCollectionResponse,
  WFSService,
  WfsResult
} from './dual-feature-wfs-reader.types';

export type {
  WFSResultFeature,
  WFSFeatureCollectionResponse,
  WFSService,
  WfsResult as MergedWfsResult
};

/**
 * Stateful reader for paginated and merged WFS streams.
 * Generic over feature type TFeature implementing WFSResultFeature.
 * Handles parallel fetching of multiple typeNames, sorting, offset tracking,
 * request cancellation, and deduplication by feature ID.
 */
export class DualFeatureWfsReader<TFeature extends WFSResultFeature = WFSResultFeature> {
  service: WFSService<TFeature>;
  typeA: string | null;
  typeB: string | null;
  cqlFilter: string | null;
  pageSize: number;

  abortController: AbortController | null = null;
  isClosed = false;

  offsetA = 0;
  offsetB = 0;
  matchedA: number | null = null;
  matchedB: number | null = null;

  constructor(
    service: WFSService<TFeature> | string,
    typeA: string | null,
    typeB: string | null,
    cqlFilter: string | null = null,
    pageSize = 50
  ) {
    this.service = typeof service === 'string' ? { baseUrl: service } : service;
    this.typeA = typeA;
    this.typeB = typeB;
    this.cqlFilter = cqlFilter;
    this.pageSize = pageSize;
    this.reset();
  }

  get baseUrl(): string {
    return this.service.baseUrl;
  }

  reset(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.abortController = new AbortController();
    this.isClosed = false;

    this.offsetA = 0;
    this.offsetB = 0;
    this.matchedA = null;
    this.matchedB = null;
  }

  close(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
    this.isClosed = true;
  }

  async next(): Promise<WfsResult<TFeature>> {
    if (this.isClosed) {
      return { features: [], totalMatched: 0, done: true };
    }

    const hasA = Boolean(this.typeA) && (this.matchedA === null || this.offsetA < this.matchedA);
    const hasB = Boolean(this.typeB) && (this.matchedB === null || this.offsetB < this.matchedB);

    if (!hasA && !hasB) {
      return {
        features: [],
        totalMatched: (this.matchedA || 0) + (this.matchedB || 0),
        done: true
      };
    }
    const signal = this.abortController?.signal;

    const fetchA: Promise<WFSFeatureCollectionResponse<TFeature>> = hasA && this.typeA
      ? this._fetchChunk(this.typeA, this.offsetA, signal)
      : Promise.resolve({ type: 'FeatureCollection', features: [], numberMatched: this.matchedA ?? 0 });

    const fetchB: Promise<WFSFeatureCollectionResponse<TFeature>> = hasB && this.typeB
      ? this._fetchChunk(this.typeB, this.offsetB, signal)
      : Promise.resolve({ type: 'FeatureCollection', features: [], numberMatched: this.matchedB ?? 0 });

    let resA: WFSFeatureCollectionResponse<TFeature>;
    let resB: WFSFeatureCollectionResponse<TFeature>;
    try {
      [resA, resB] = await Promise.all([fetchA, fetchB]);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { features: [], totalMatched: 0, done: true };
      }
      throw err;
    }

    if (this.isClosed) {
      return { features: [], totalMatched: 0, done: true };
    }

    if (this.typeA) {
      if (resA.numberMatched !== undefined) this.matchedA = resA.numberMatched;
    } else {
      this.matchedA = 0;
    }

    if (this.typeB) {
      if (resB.numberMatched !== undefined) this.matchedB = resB.numberMatched;
    } else {
      this.matchedB = 0;
    }

    const itemsA = (resA.features || []).map((f: TFeature) => ({ ...f, _source: 'A' as const }));
    const itemsB = (resB.features || []).map((f: TFeature) => ({ ...f, _source: 'B' as const }));

    const sortFn = this.service.sortFeatures || ((a: TFeature, b: TFeature) => {
      const valA = (a.properties as any)?.approval_date;
      const valB = (b.properties as any)?.approval_date;
      const tA = valA ? new Date(valA).getTime() : null;
      const tB = valB ? new Date(valB).getTime() : null;
      const validA = tA !== null && !isNaN(tA);
      const validB = tB !== null && !isNaN(tB);
      if (!validA && !validB) return 0;
      if (!validA) return -1; // nulls first for descending order
      if (!validB) return 1;
      return tB - tA;
    });

    const merged = [...itemsA, ...itemsB].sort(sortFn);

    const seenIds = new Set<string | number>();
    const uniqueMerged: Array<TFeature & { _source: 'A' | 'B' }> = [];
    for (const item of merged) {
      if (item.id !== undefined && item.id !== null) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
      }
      uniqueMerged.push(item);
    }

    const pageFeatures = uniqueMerged.slice(0, this.pageSize);

    let consumedA = 0;
    let consumedB = 0;
    for (const feat of pageFeatures) {
      if (feat._source === 'A') consumedA++;
      if (feat._source === 'B') consumedB++;
    }

    this.offsetA += consumedA;
    this.offsetB += consumedB;

    const totalMatched = (this.matchedA || 0) + (this.matchedB || 0);
    const hasMore =
      (Boolean(this.typeA) && this.offsetA < (this.matchedA || 0)) ||
      (Boolean(this.typeB) && this.offsetB < (this.matchedB || 0));

    const cleanFeatures = pageFeatures.map(({ _source, ...f }) => f as unknown as TFeature);

    return {
      features: cleanFeatures,
      totalMatched,
      done: !hasMore
    };
  }

  async _fetchChunk(typeName: string, startIndex: number, signal?: AbortSignal): Promise<WFSFeatureCollectionResponse<TFeature>> {
    if (this.service.fetchChunk) {
      return this.service.fetchChunk(typeName, startIndex, this.pageSize, this.cqlFilter, signal);
    }

    let url: string;
    if (this.service.buildUrl) {
      url = this.service.buildUrl(typeName, startIndex, this.pageSize, this.cqlFilter);
    } else {
      const version = this.service.version || '2.0.0';
      const outputFormat = this.service.outputFormat || 'application/json';
      const srsName = this.service.srsName || 'EPSG:4326';
      const sortBy = this.service.sortBy || 'approval_date DESC';

      url =
        `${this.service.baseUrl}?service=WFS&version=${encodeURIComponent(version)}&request=GetFeature` +
        `&typeNames=${encodeURIComponent(typeName)}&outputFormat=${encodeURIComponent(outputFormat)}` +
        `&srsName=${encodeURIComponent(srsName)}` +
        `&sortby=${encodeURIComponent(sortBy).replace(/%20/g, '+')}&count=${this.pageSize}&startIndex=${startIndex}`;

      if (this.cqlFilter) {
        url += `&cql_filter=${encodeURIComponent(this.cqlFilter)}`;
      }
    }

    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${res.statusText || 'Error'}`);
    }
    return await res.json();
  }
}
