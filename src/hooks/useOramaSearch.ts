import { useState, useEffect, useCallback } from 'react';
import { create, search, load, components, type AnyOrama } from '@orama/orama';
import { stemmer as fiStemmer } from '@orama/stemmers/finnish';
import { stemmer as svStemmer } from '@orama/stemmers/swedish';
import { stemmer as enStemmer } from '@orama/stemmers/english';
import { getBuildVersion } from '../lib/blog';

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

      const createCustomTokenizer = async (language: string, stemmerFn?: any) => {
        const tokenizer = await components.tokenizer.createTokenizer({
          language,
          stemming: !!stemmerFn,
          stemmer: stemmerFn,
        });

        tokenizer.tokenize = function (text: string) {
          if (!text) return [];
          const words = text.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
          const stemmed = words.map(w => (this.stemmer ? this.stemmer(w) : w));
          return stemmed.filter(Boolean);
        };

        return tokenizer;
      };

      const version = await getBuildVersion();
      const loadedDbs = await Promise.all(
        languages.map(async (lang) => {
          const targetUrl = `${baseUrl}search-index-${lang}.json?v=${version}`;
          const response = await fetch(targetUrl);
          if (!response.ok) {
            throw new Error(`Failed to fetch search index for ${lang}: ${response.statusText} (${targetUrl})`);
          }
          const indexData = await response.json();
          
          const oramaLang = lang === 'fi' ? 'finnish' : lang === 'sv' ? 'swedish' : 'english';
          const customTokenizer = await createCustomTokenizer(oramaLang, stemmers[lang]);

          const instance = await create({
            schema: {
              __placeholder: 'string'
            },
            components: {
              tokenizer: customTokenizer
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

  const performSearch = useCallback(async (
    term: string,
    options?: {
      where?: Record<string, any>;
    }
  ) => {
    if (!dbs || term.length < 2) return [];

    try {
      const searchConfig: any = {
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

      if (options?.where) {
        searchConfig.where = options.where;
      }

      const [resFi, resSv, resEn] = await Promise.all([
        search(dbs.fi, searchConfig),
        search(dbs.sv, searchConfig),
        search(dbs.en, searchConfig),
      ]);

      const hitsFi = (resFi.hits || []) as SearchResult[];
      const hitsSv = (resSv.hits || []) as SearchResult[];
      const hitsEn = (resEn.hits || []) as SearchResult[];

      // Score-based merge using the maximum BM25 score across the language indices
      const mergedScores: Record<string, { item: SearchResult; score: number }> = {};

      const processList = (list: SearchResult[]) => {
        list.forEach((hit) => {
          const key = `${hit.document.type}-${hit.document.slug}`;
          const currentScore = hit.score;

          if (!mergedScores[key]) {
            mergedScores[key] = {
              item: hit,
              score: currentScore
            };
          } else {
            if (currentScore > mergedScores[key].score) {
              mergedScores[key].score = currentScore;
              // Use the document that scored highest
              mergedScores[key].item = hit;
            }
          }
        });
      };

      processList(hitsFi);
      processList(hitsSv);
      processList(hitsEn);

      const sorted = Object.values(mergedScores).sort((a, b) => b.score - a.score);

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
