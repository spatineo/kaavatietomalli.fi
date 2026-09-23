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

/**
 * Computes a relevance score multiplier for a document based on whether the search query
 * matches as an exact full field, an exact whole word, or merely as part of a compound word.
 *
 * In Finnish (and other synthetic languages), compound words like "Kaavamääräys" contain
 * "Kaava" as a prefix, causing standard BM25 / prefix search to score compound words similarly
 * to whole-word matches like "Kaava". This multiplier ensures whole-word matches and exact title
 * matches rank significantly higher than partial compound-word matches.
 */
export function computeRelevanceMultiplier(
  doc: any,
  rawTerm: string,
  stemmerFn?: (w: string) => string
): number {
  if (!rawTerm || !doc) return 1.0;

  const normalizedTerm = rawTerm.trim().toLowerCase();
  if (!normalizedTerm) return 1.0;

  const queryWords = normalizedTerm.match(/[\p{L}\p{N}]+/gu) || [];
  if (queryWords.length === 0) return 1.0;

  const docTitle = (doc.title || '').trim().toLowerCase();
  const docName = (doc.name || '').trim().toLowerCase();

  // 1. EXACT FULL FIELD MATCH in title or name (e.g. searching "Kaava" -> title is "Kaava")
  if (docTitle === normalizedTerm || docName === normalizedTerm) {
    return 100.0;
  }

  const titleWords = docTitle.match(/[\p{L}\p{N}]+/gu) || [];
  const nameWords = docName.match(/[\p{L}\p{N}]+/gu) || [];

  const safeStem = (w: string) => {
    if (!stemmerFn) return w;
    try {
      return stemmerFn(w) || w;
    } catch {
      return w;
    }
  };

  const stemmedQueryWords = queryWords.map(safeStem);
  const stemmedTitleWords = titleWords.map(safeStem);
  const stemmedNameWords = nameWords.map(safeStem);

  // Helper to check if a list of target words contains an exact whole-word match for all query words
  const checkWholeWordMatch = (words: string[], stemmedWords: string[]) => {
    if (words.length === 0) return false;
    return queryWords.every((qw, idx) => {
      const sqw = stemmedQueryWords[idx];
      return words.some((tw, tIdx) => tw === qw || (stemmedWords[tIdx] && stemmedWords[tIdx] === sqw));
    });
  };

  const isTitleWholeWordMatch = checkWholeWordMatch(titleWords, stemmedTitleWords);
  const isNameWholeWordMatch = checkWholeWordMatch(nameWords, stemmedNameWords);

  if (isTitleWholeWordMatch || isNameWholeWordMatch) {
    // Whole-word match in title or name.
    // Boost shorter titles higher (conciseness factor) so "Kaava" or "Kaava ja X" rank higher than long titles with extra words.
    const extraWords = Math.max(0, titleWords.length - queryWords.length);
    const concisenessFactor = 1 / (1 + extraWords * 0.25);
    return 15.0 * concisenessFactor;
  }

  // 2. EXACT WHOLE WORD MATCH in excerpt, content, or tags
  const docExcerpt = (doc.excerpt || '').trim().toLowerCase();
  const excerptWords = docExcerpt.match(/[\p{L}\p{N}]+/gu) || [];
  const stemmedExcerptWords = excerptWords.map(safeStem);

  if (checkWholeWordMatch(excerptWords, stemmedExcerptWords)) {
    return 5.0;
  }

  const docContent = (doc.content || '').trim().toLowerCase();
  const contentWords = docContent.match(/[\p{L}\p{N}]+/gu) || [];
  const stemmedContentWords = contentWords.map(safeStem);

  if (checkWholeWordMatch(contentWords, stemmedContentWords)) {
    return 5.0;
  }

  const docTags = Array.isArray(doc.tags) ? doc.tags.map((t: string) => t.toLowerCase()) : [];
  const tagWords = docTags.flatMap((t: string) => t.match(/[\p{L}\p{N}]+/gu) || []);
  const stemmedTagWords = tagWords.map(safeStem);

  if (checkWholeWordMatch(tagWords, stemmedTagWords)) {
    return 3.0;
  }

  // 3. Otherwise (matches are only compound word substrings e.g. "Kaavamääräys" for query "Kaava"), return 1.0 (no multiplier boost)
  return 1.0;
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
      limit?: number;
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
        limit: options?.limit || 1000,
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

      // Score-based merge using the maximum adjusted relevance score across language indices
      const mergedScores: Record<string, { item: SearchResult; score: number }> = {};

      const processList = (list: SearchResult[], stemmerFn?: (w: string) => string) => {
        list.forEach((hit) => {
          const key = `${hit.document.type}-${hit.document.slug}`;
          const multiplier = computeRelevanceMultiplier(hit.document, term, stemmerFn);
          const adjustedScore = hit.score * multiplier;

          if (!mergedScores[key]) {
            mergedScores[key] = {
              item: hit,
              score: adjustedScore
            };
          } else {
            if (adjustedScore > mergedScores[key].score) {
              mergedScores[key].score = adjustedScore;
              // Use the document that scored highest
              mergedScores[key].item = hit;
            }
          }
        });
      };

      processList(hitsFi, fiStemmer);
      processList(hitsSv, svStemmer);
      processList(hitsEn, enStemmer);

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
