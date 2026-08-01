import { useState, useEffect, useCallback } from 'react';
import { create, search, load, type AnyOrama } from '@orama/orama';
import { stemmer as fiStemmer } from '@orama/stemmers/finnish';
import { stemmer as svStemmer } from '@orama/stemmers/swedish';
import { stemmer as enStemmer } from '@orama/stemmers/english';
import { BUILD_VERSION } from '../version';

export interface SearchResult {
  id: string;
  score: number;
  document: any;
}

export function useOramaSearch() {
  const [dbs, setDbs] = useState<{ fi: AnyOrama; sv: AnyOrama; en: AnyOrama } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const init = useCallback(async () => {
    // If we're already initializing, have databases, or have an error, don't try again
    if (dbs || isInitializing || error) return;
    
    setIsInitializing(true);
    try {
      // Use BASE_URL to handle deployments in subdirectories (like GitHub Pages)
      const baseUrl = import.meta.env.BASE_URL.endsWith('/') 
        ? import.meta.env.BASE_URL 
        : `${import.meta.env.BASE_URL}/`;

      const languages = ['fi', 'sv', 'en'] as const;
      const stemmers = {
        fi: fiStemmer,
        sv: svStemmer,
        en: enStemmer
      };

      const loadedDbs = await Promise.all(
        languages.map(async (lang) => {
          const targetUrl = `${baseUrl}search-index-${lang}.json?v=${BUILD_VERSION}`;
          const response = await fetch(targetUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch search index for ${lang}: ${response.statusText} (${targetUrl})`);
          }
          const indexData = await response.json();
          
          const instance = await create({
            schema: {
              __placeholder: 'string'
            },
            components: {
              tokenizer: {
                stemmer: stemmers[lang]
              }
            }
          });

          await load(instance, indexData);
          return { lang, instance };
        })
      );

      const dbMap = loadedDbs.reduce((acc, item) => {
        acc[item.lang] = item.instance;
        return acc;
      }, {} as Record<string, AnyOrama>);

      setDbs({
        fi: dbMap.fi,
        sv: dbMap.sv,
        en: dbMap.en
      });
      setError(null);
    } catch (err) {
      console.error('Orama initialization failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsInitializing(false);
    }
  }, [dbs, isInitializing, error]);

  useEffect(() => {
    init();
  }, [init]);

  const performSearch = useCallback(async (term: string) => {
    if (!dbs || term.length < 2) return [];

    try {
      const searchConfig = {
        term,
        properties: ['title', 'name', 'company', 'content', 'excerpt', 'tags'],
        boost: {
          title: 2,
          name: 2,
          company: 1.5,
          tags: 1.5,
        },
        tolerance: 1,
      };

      const [resFi, resSv, resEn] = await Promise.all([
        search(dbs.fi, searchConfig),
        search(dbs.sv, searchConfig),
        search(dbs.en, searchConfig),
      ]);

      const hitsFi = (resFi.hits || []) as SearchResult[];
      const hitsSv = (resSv.hits || []) as SearchResult[];
      const hitsEn = (resEn.hits || []) as SearchResult[];

      // Reciprocal Rank Fusion (RRF)
      const k = 60;
      const rrfScores: Record<string, { item: SearchResult; score: number }> = {};

      const processList = (list: SearchResult[]) => {
        list.forEach((hit, index) => {
          const key = `${hit.document.type}-${hit.document.slug}`;
          const rank = index + 1;
          const scoreContribution = 1 / (k + rank);

          if (!rrfScores[key]) {
            rrfScores[key] = {
              item: hit,
              score: 0
            };
          }
          rrfScores[key].score += scoreContribution;
        });
      };

      processList(hitsFi);
      processList(hitsSv);
      processList(hitsEn);

      const sorted = Object.values(rrfScores).sort((a, b) => b.score - a.score);

      return sorted.map(({ item, score }) => ({
        ...item,
        score
      }));
    } catch (err) {
      console.error('Search failed:', err);
      return [];
    }
  }, [dbs]);

  return {
    performSearch,
    isInitializing,
    error,
    db: dbs?.fi || null
  };
}
