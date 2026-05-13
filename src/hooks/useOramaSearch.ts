import { useState, useEffect, useCallback } from 'react';
import { create, search, load, type AnyOrama } from '@orama/orama';
import { stemmer as fiStemmer } from '@orama/stemmers/finnish';

export interface SearchResult {
  id: string;
  score: number;
  document: any;
}

export function useOramaSearch(indexPath: string = '/search-index.json') {
  const [db, setDb] = useState<AnyOrama | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const init = useCallback(async () => {
    if (db || isInitializing) return;
    
    setIsInitializing(true);
    try {
      const response = await fetch(indexPath);
      if (!response.ok) {
        throw new Error(`Failed to fetch search index: ${response.statusText}`);
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
  }, [db, isInitializing, indexPath]);

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

      return results.hits as SearchResult[];
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
