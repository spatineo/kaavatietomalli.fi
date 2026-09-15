/**
 * Generic WFS feature representation.
 * Custom feature types (like PlanFeature) implement or extend this interface.
 */
export interface WFSResultFeature {
  id: string | number;
  properties?: Record<string, any>;
  [key: string]: any;
}

/**
 * Generic WFS FeatureCollection response from GetFeature.
 */
export interface WFSFeatureCollectionResponse<TFeature extends WFSResultFeature = WFSResultFeature> {
  type: string;
  features: TFeature[];
  numberMatched?: number;
  numberReturned?: number;
  [key: string]: any;
}

/**
 * Interface defining WFS endpoint specific properties and hooks.
 * Allows useMergedWfs and MergedWfsReader to operate on any WFS service.
 */
export interface WFSService<TFeature extends WFSResultFeature = WFSResultFeature> {
  baseUrl: string;
  version?: string;
  srsName?: string;
  outputFormat?: string;
  sortBy?: string;
  defaultTypeA?: string | null;
  defaultTypeB?: string | null;
  fetchChunk?: (
    typeName: string,
    startIndex: number,
    pageSize: number,
    cqlFilter?: string | null,
    signal?: AbortSignal
  ) => Promise<WFSFeatureCollectionResponse<TFeature>>;
  buildUrl?: (
    typeName: string,
    startIndex: number,
    pageSize: number,
    cqlFilter?: string | null
  ) => string;
  sortFeatures?: (a: TFeature, b: TFeature) => number;
}

export interface MergedWfsResult<TFeature extends WFSResultFeature = WFSResultFeature> {
  features: TFeature[];
  totalMatched: number;
  done: boolean;
}
