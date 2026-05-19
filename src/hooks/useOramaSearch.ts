import { useState, useEffect, useCallback } from 'react';
import { create, search, load, type AnyOrama } from '@orama/orama';
import { stemmer as fiStemmer } from '@orama/stemmers/finnish';

export interface SearchResult {
  id: string;
  score: number;
  document: any;
}

export function useOramaSearch(indexPath: string = 'search-index.json') {
  const [db, setDb] = useState<AnyOrama | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const init = useCallback(async () => {
    // If we're already initializing, have a DB, or have an error, don't try again
    if (db || isInitializing || error) return;
    
    setIsInitializing(true);
    try {
      // Use BASE_URL to handle deployments in subdirectories (like GitHub Pages)
      const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
        ? import.meta.env.BASE_URL 
        : `${import.meta.env.BASE_URL}/`;
      const fullPath = indexPath.startsWith('/') ? indexPath.slice(1) : indexPath;
      const targetUrl = `${baseUrl}${fullPath}`;

      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch search index: ${response.statusText} (${targetUrl})`);
      }
      const indexData = await response.json();
      
      const instance = await create({
        schema: {
          __placeholder: 'string'
        },
        components: {
          tokenizer: {
            stemmer: fiStemmer
          }
        }
      });

      await load(instance, indexData);
      
      setDb(instance);
      setError(null);
    } catch (err) {
      console.error('Orama initialization failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  }, [indexPath]); // Only depend on indexPath to avoid infinite re-initialization loops

  useEffect(() => {
    init();
  }, [init]);

  const performSearch = useCallback(async (term: string) => {
    if (!db || term.length < 2) return [];

    try {
      const results = await search(db, {
        term,
        properties: ['title', 'name', 'company', 'content', 'excerpt', 'tags'],
        boost: {
          title: 2,
          name: 2,
          company: 1.5,
          tags: 1.5,
        },
        tolerance: 1,
      });

      const hits = results.hits as SearchResult[];
      const now = new Date();

      return hits.filter(hit => {
        if (hit.document.type !== 'post' || !hit.document.publishDate) return true;
        const pubDate = new Date(hit.document.publishDate);
        return now >= pubDate;
      });
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  }, [db]);

  return {
    performSearch,
    isInitializing,
    error,
    db
  };
}
