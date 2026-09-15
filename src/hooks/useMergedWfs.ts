import { useState, useEffect, useRef, useCallback } from 'react';
import { MergedWfsReader } from '../lib/merged-wfs-reader';
import {
  WFSResultFeature,
  WFSFeatureCollectionResponse,
  WFSService,
  MergedWfsResult
} from '../lib/merged-wfs-reader.types';

export {
  MergedWfsReader,
  type MergedWfsResult,
  type WFSService,
  type WFSResultFeature,
  type WFSFeatureCollectionResponse
};

export interface UseMergedWfsOptions<TFeature extends WFSResultFeature = WFSResultFeature> {
  enabled?: boolean;
  initialFeatures?: TFeature[];
  initialTotalMatched?: number;
}

export interface UseMergedWfsResult<TFeature extends WFSResultFeature = WFSResultFeature> {
  features: TFeature[];
  totalMatched: number;
  loading: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => Promise<void>;
}

/**
 * Generic React hook to manage stateful paginated WFS querying using MergedWfsReader and WFSService.
 */
export function useMergedWfs<TFeature extends WFSResultFeature = WFSResultFeature>(
  service: WFSService<TFeature> | string,
  typeA: string | null = null,
  typeB: string | null = null,
  cqlFilter: string | null = null,
  pageSize = 50,
  options?: UseMergedWfsOptions<TFeature>
): UseMergedWfsResult<TFeature> {
  const enabled = options?.enabled !== false;
  const initialFeatures = options?.initialFeatures;
  const initialTotalMatched = options?.initialTotalMatched ?? (initialFeatures ? initialFeatures.length : 0);

  const [features, setFeatures] = useState<TFeature[]>(initialFeatures || []);
  const [totalMatched, setTotalMatched] = useState<number>(initialTotalMatched);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const readerRef = useRef<MergedWfsReader<TFeature> | null>(null);

  // Instantiates a new reader when query parameters change
  useEffect(() => {
    if (!enabled) {
      if (initialFeatures) {
        setFeatures(initialFeatures);
        setTotalMatched(initialTotalMatched);
      }
      setLoading(false);
      return;
    }

    const reader = new MergedWfsReader<TFeature>(service, typeA, typeB, cqlFilter, pageSize);
    readerRef.current = reader;

    setFeatures([]);
    setHasMore(true);
    setError(null);
    setLoading(true);

    let isSubscribed = true;

    reader
      .next()
      .then((res) => {
        if (!isSubscribed) return;
        setFeatures(res.features);
        setTotalMatched(res.totalMatched);
        setHasMore(!res.done);
        setLoading(false);
      })
      .catch((err) => {
        if (!isSubscribed || err?.name === 'AbortError') return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      });

    // Cleanup: close reader and abort active fetches on unmount or query change
    return () => {
      isSubscribed = false;
      reader.close();
    };
  }, [service, typeA, typeB, cqlFilter, pageSize, enabled]);

  const loadMore = useCallback(async () => {
    if (!readerRef.current || loading || !hasMore) return;
    setLoading(true);

    try {
      const res = await readerRef.current.next();
      setFeatures((prev) => [...prev, ...res.features]);
      setTotalMatched(res.totalMatched);
      setHasMore(!res.done);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  return { features, totalMatched, loading, hasMore, error, loadMore };
}
