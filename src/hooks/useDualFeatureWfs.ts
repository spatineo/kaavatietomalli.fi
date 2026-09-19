import { useState, useEffect, useRef, useCallback } from 'react';
import { DualFeatureWfsReader } from '../lib/dual-feature-wfs-reader';
import {
  WFSResultFeature,
  WFSService,
} from '../lib/dual-feature-wfs-reader.types';

export interface UseDualFeatureWfsOptions<TFeature extends WFSResultFeature = WFSResultFeature> {
  enabled?: boolean;
  initialFeatures?: TFeature[];
  initialTotalMatched?: number;
  bbox?: string | [number, number, number, number] | null;
}

export interface UseDualFeatureWfsResult<TFeature extends WFSResultFeature = WFSResultFeature> {
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
export function useDualFeatureWfs<TFeature extends WFSResultFeature = WFSResultFeature>(
  service: WFSService<TFeature> | string,
  typeA: string | null = null,
  typeB: string | null = null,
  cqlFilter: string | null = null,
  pageSize = 50,
  options?: UseDualFeatureWfsOptions<TFeature>
): UseDualFeatureWfsResult<TFeature> {
  const enabled = options?.enabled !== false;
  const initialFeatures = options?.initialFeatures;
  const initialTotalMatched = options?.initialTotalMatched ?? (initialFeatures ? initialFeatures.length : 0);
  const bbox = options?.bbox ?? null;

  const [features, setFeatures] = useState<TFeature[]>(initialFeatures || []);
  const [totalMatched, setTotalMatched] = useState<number>(initialTotalMatched);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const readerRef = useRef<DualFeatureWfsReader<TFeature> | null>(null);

  const bboxKey = Array.isArray(bbox) ? bbox.map(n => n.toFixed(6)).join(',') : (bbox || '');

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

    const reader = new DualFeatureWfsReader<TFeature>(service, typeA, typeB, cqlFilter, pageSize, bbox);
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
  }, [service, typeA, typeB, cqlFilter, pageSize, bboxKey, enabled]);

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
