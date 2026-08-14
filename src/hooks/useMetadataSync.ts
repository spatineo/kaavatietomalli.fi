/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { PostData, PageData, AuthorData } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { getTracker } from '../services/analytics';
import { resolveImageUrl } from '../lib/utils';
import { fetchJsonCached } from '../lib/fetch-cache';

export interface UseMetadataSyncProps {
  activeView: { type: string; slug: string | null };
  currentPost: PostData | null;
  currentPage: PageData | null;
  currentAuthor: AuthorData | null;
  isDataReady: boolean;
  contentNotFound: boolean;
  searchString?: string;
}

export function useMetadataSync({
  activeView,
  currentPost,
  currentPage,
  currentAuthor,
  isDataReady,
  contentNotFound,
  searchString,
}: UseMetadataSyncProps) {
  const t = getTranslations(CONFIG.language as Language);
  const lastTrackedRef = useRef<string | null>(null);

  // Data model states
  const [modelIndex, setModelIndex] = useState<any[]>([]);
  const [allCodelists, setAllCodelists] = useState<any[]>([]);
  const [loadedModelData, setLoadedModelData] = useState<Record<string, any>>({});

  // Helper for localized strings
  const getLocalized = (obj: any, dataLang: string) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[dataLang] || obj['fi'] || obj['en'] || obj['sv'] || Object.values(obj)[0] || '';
  };

  // Fetch index files once if we're looking at a data model
  useEffect(() => {
    if (activeView.type !== 'model') return;
    if (modelIndex.length > 0 && allCodelists.length > 0) return;

    let isMounted = true;
    Promise.all([
      fetchJsonCached(`${CONFIG.basePath}data/suomi.fi/tietomallit/index.json`),
      fetchJsonCached(`${CONFIG.basePath}data/suomi.fi/koodistot/index.json`)
    ])
      .then(([models, codelists]) => {
        if (!isMounted) return;
        setModelIndex(models);
        setAllCodelists(codelists);
      })
      .catch(err => {
        console.error('[useMetadataSync] Failed to load indexes for metadata', err);
      });

    return () => { isMounted = false; };
  }, [activeView.type]);

  // Fetch model details if we need to retrieve class names
  useEffect(() => {
    if (activeView.type !== 'model' || !activeView.slug || modelIndex.length === 0) return;

    const resolvedSearchString = searchString || (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(resolvedSearchString);
    const modelName = activeView.slug;
    const versions = modelIndex.filter((m: any) => m.path.startsWith(`${modelName}-`));
    if (versions.length === 0) return;

    const versionParam = params.get('version');
    const matchedVersion = versions.find((v: any) => v.version === versionParam);
    const targetVersion = matchedVersion ? matchedVersion.version : versions[0].version;

    const versionItem = versions.find(v => v.version === targetVersion);
    if (!versionItem) return;

    const cacheKey = `${modelName}-${targetVersion}`;
    if (loadedModelData[cacheKey]) return;

    let isMounted = true;
    fetchJsonCached(`${CONFIG.basePath}data/suomi.fi/tietomallit/${versionItem.path}`)
      .then(data => {
        if (!isMounted) return;
        setLoadedModelData(prev => ({ ...prev, [cacheKey]: data }));
      })
      .catch(err => {
        console.error('[useMetadataSync] Failed to fetch model details', err);
      });

    return () => { isMounted = false; };
  }, [activeView, modelIndex, searchString, loadedModelData]);

  useEffect(() => {
    if (!isDataReady && activeView.type !== 'home' && activeView.type !== 'model' && !contentNotFound) return;

    let title = 'Kaavatietomalli.fi';
    let description = t.hero.description;

    const resolvedSearchString = searchString || (typeof window !== 'undefined' ? window.location.search : '');
    const params = new URLSearchParams(resolvedSearchString);
    const langParam = params.get('lang') || CONFIG.defaultDataLanguage || 'fi';

    if (activeView.type === 'home') {
      title = `Kaavatietomalli.fi | ${t.hero.subtitle}`;
    } else if (contentNotFound) {
      title = `${t.notFound.title} | Kaavatietomalli.fi`;
    } else if (activeView.type === 'post' && currentPost) {
      title = `${currentPost.title} | Kaavatietomalli.fi`;
      description = currentPost.excerpt || description;
    } else if (activeView.type === 'page' && currentPage) {
      title = `${currentPage.title} | Kaavatietomalli.fi`;
    } else if (activeView.type === 'author' && currentAuthor) {
      title = `${currentAuthor.name} | Kaavatietomalli.fi`;
      description = currentAuthor.shortBio || description;
    } else if (activeView.type === 'tag' && activeView.slug) {
      title = `#${activeView.slug} | Kaavatietomalli.fi`;
      description = `${t.blog.relatedArticles}: #${activeView.slug}`;
    } else if (activeView.type === 'model' && activeView.slug) {
      const modelName = activeView.slug;
      const versions = modelIndex.filter((m: any) => m.path.startsWith(`${modelName}-`));

      if (versions.length > 0) {
        const versionParam = params.get('version');
        const matchedVersion = versions.find((v: any) => v.version === versionParam);
        const targetVersion = matchedVersion ? matchedVersion.version : versions[0].version;
        const versionItem = versions.find(v => v.version === targetVersion);

        const modelLabel = versionItem ? getLocalized(versionItem.name, langParam) : modelName;
        
        const classParam = params.get('class');
        const codelistParam = params.get('codelist');

        if (classParam) {
          const cacheKey = `${modelName}-${targetVersion}`;
          const detail = loadedModelData[cacheKey];
          const classObj = detail?.classes?.find((c: any) => c.technicalName === classParam);
          const classLabel = classObj ? getLocalized(classObj.name, langParam) : classParam;

          title = `${classLabel} | ${modelLabel} v${targetVersion} | Kaavatietomalli.fi`;
          description = `${modelLabel} (versio ${targetVersion}) luokan ${classLabel} kuvaus ja attribuutit.`;
          if (langParam === 'en') {
            description = `Description and attributes of class ${classLabel} in data model ${modelLabel} (version ${targetVersion}).`;
          } else if (langParam === 'sv') {
            description = `Beskrivning och attribut för klassen ${classLabel} i datamodellen ${modelLabel} (version ${targetVersion}).`;
          }
        } else if (codelistParam) {
          const codelistItem = allCodelists.find(c => {
            const techName = c.uri.split('/').pop() || '';
            return techName === codelistParam;
          });
          const codelistLabel = codelistItem ? getLocalized(codelistItem.name, langParam) : codelistParam;

          title = `${codelistLabel} | Koodisto | Kaavatietomalli.fi`;
          description = `Koodiston ${codelistLabel} kuvaus ja koodiarvot.`;
          if (langParam === 'en') {
            description = `Description and code values of codelist ${codelistLabel}.`;
          } else if (langParam === 'sv') {
            description = `Beskrivning och kodvärden för koodisto ${codelistLabel}.`;
          }
        } else {
          title = `${modelLabel} v${targetVersion} | Kaavatietomalli.fi`;
          description = `Tietomallin ${modelLabel} (versio ${targetVersion}) tekninen kuvaus ja koodistot.`;
          if (langParam === 'en') {
            description = `Technical description and codelists of data model ${modelLabel} (version ${targetVersion}).`;
          } else if (langParam === 'sv') {
            description = `Teknisk beskrivning och koodisto för datamodellen ${modelLabel} (version ${targetVersion}).`;
          }
        }
      } else {
        title = `${modelName} | Kaavatietomalli.fi`;
      }
    }

    document.title = title;

    // Generate accurate path for canonical & og:url
    let currentPath = '';
    if (activeView.type !== 'home' && activeView.slug) {
      currentPath = `${activeView.type}/${encodeURIComponent(activeView.slug)}`;
      if (activeView.type === 'model') {
        const version = params.get('version');
        const cls = params.get('class');
        const codelist = params.get('codelist');
        const lang = params.get('lang');

        const parts = [];
        if (version) parts.push(`version=${version}`);
        if (cls) parts.push(`class=${cls}`);
        if (codelist) parts.push(`codelist=${codelist}`);
        if (lang) parts.push(`lang=${lang}`);
        if (parts.length > 0) {
          currentPath += `?${parts.join('&')}`;
        }
      }
    }
    const canonicalUrl = `${CONFIG.baseUrl}${CONFIG.basePath}${currentPath}`;

    // Track analytics pageviews
    let modelSubKey = '';
    if (activeView.type === 'model') {
      modelSubKey = `${params.get('version') || ''}:${params.get('class') || ''}:${params.get('codelist') || ''}:${langParam}`;
    }
    const currentKey = `${activeView.type}:${activeView.slug || ''}:${contentNotFound}:${currentPost?.slug || ''}:${currentPage?.slug || ''}:${currentAuthor?.slug || ''}:${modelSubKey}`;
    
    if (currentKey !== lastTrackedRef.current) {
      lastTrackedRef.current = currentKey;
      if (activeView.type === 'home') {
        getTracker().trackPageView(CONFIG.basePath, `Home | Kaavatietomalli.fi`);
      } else if (contentNotFound) {
        getTracker().trackPageView(`${CONFIG.basePath}404`, `404: Not Found`);
      } else if (activeView.type === 'tag' && activeView.slug) {
        getTracker().trackPageView(`${CONFIG.basePath}tag/${encodeURIComponent(activeView.slug)}`, `#${activeView.slug} | Kaavatietomalli.fi`, [activeView.slug]);
      } else if (activeView.type === 'post' && currentPost) {
        getTracker().trackPostView(currentPost.slug, currentPost.title, currentPost.tags, currentPost.partner);
        getTracker().trackPageView(`${CONFIG.basePath}post/${encodeURIComponent(currentPost.slug)}`, currentPost.title, currentPost.tags, currentPost.partner);
      } else if (activeView.type === 'page' && currentPage) {
        getTracker().trackPageView(`${CONFIG.basePath}page/${encodeURIComponent(currentPage.slug)}`, currentPage.title, undefined, currentPage.partner);
      } else if (activeView.type === 'author' && currentAuthor) {
        getTracker().trackAuthorView(currentAuthor.slug, currentAuthor.name);
        getTracker().trackPageView(`${CONFIG.basePath}author/${encodeURIComponent(currentAuthor.slug)}`, currentAuthor.name);
      } else if (activeView.type === 'model' && activeView.slug) {
        getTracker().trackPageView(`${CONFIG.basePath}${currentPath}`, title);
      }
    }

    const updateMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    updateMeta('meta[name="description"]', description);
    updateMeta('meta[property="og:title"]', title);
    updateMeta('meta[property="og:description"]', description);
    updateMeta('meta[property="og:url"]', canonicalUrl);
    updateMeta('meta[property="twitter:title"]', title);
    updateMeta('meta[property="twitter:description"]', description);
    updateMeta('meta[property="twitter:url"]', canonicalUrl);

    // Image updates
    let imageUrl = `${CONFIG.baseUrl}/og-image.jpg`;
    if (activeView.type === 'post' && currentPost?.coverImage) {
      imageUrl = resolveImageUrl(currentPost.coverImage);
    } else if (activeView.type === 'author' && currentAuthor?.image) {
      imageUrl = resolveImageUrl(currentAuthor.image);
    }
    updateMeta('meta[property="og:image"]', imageUrl);
    updateMeta('meta[property="twitter:image"]', imageUrl);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // Discovery links for LLMs
    const updateDiscoveryLink = (type: string, slug: string | null) => {
      let dcLink = document.querySelector('link[rel="alternate"][type="text/markdown"]');
      if (!slug) {
        if (dcLink && dcLink.parentNode === document.head) {
          document.head.removeChild(dcLink);
        }
        return;
      }

      if (!dcLink) {
        dcLink = document.createElement('link');
        dcLink.setAttribute('rel', 'alternate');
        dcLink.setAttribute('type', 'text/markdown');
        dcLink.setAttribute('title', 'Content in Markdown format');
        document.head.appendChild(dcLink);
      }

      let resolvedFile = `${slug}.md`;
      if (type === 'post' && currentPost && currentPost.slug === slug) {
        resolvedFile = `${CONFIG.basePath.replace(/\/$/, '')}/content/posts/${slug}.md`;
      } else if (type === 'page' && currentPage && currentPage.slug === slug) {
        resolvedFile = `${CONFIG.basePath.replace(/\/$/, '')}/content/pages/${slug}.md`;
      } else if (type === 'author' && currentAuthor && currentAuthor.slug === slug) {
        resolvedFile = `${CONFIG.basePath.replace(/\/$/, '')}/content/authors/${slug}.md`;
      }
      dcLink.setAttribute('href', resolvedFile);
    };

    if (activeView.type === 'post' || activeView.type === 'page' || activeView.type === 'author') {
      updateDiscoveryLink(activeView.type, activeView.slug);
    } else {
      updateDiscoveryLink('', null);
    }

    // Discovery link for model JSON (alternative)
    const updateModelJsonLink = () => {
      let jsonLink = document.querySelector('link[rel="alternative"][type="application/json"]');
      if (activeView.type === 'model' && activeView.slug && modelIndex.length > 0) {
        const modelName = activeView.slug;
        const versions = modelIndex.filter((m: any) => m.path.startsWith(`${modelName}-`));
        if (versions.length > 0) {
          const versionParam = params.get('version');
          const matchedVersion = versions.find((v: any) => v.version === versionParam);
          const targetVersion = matchedVersion ? matchedVersion.version : versions[0].version;
          const versionItem = versions.find(v => v.version === targetVersion);

          if (versionItem) {
            const jsonFileUrl = `${CONFIG.basePath}data/suomi.fi/tietomallit/${versionItem.path}`;
            if (!jsonLink) {
              jsonLink = document.createElement('link');
              jsonLink.setAttribute('rel', 'alternative');
              jsonLink.setAttribute('type', 'application/json');
              document.head.appendChild(jsonLink);
            }
            jsonLink.setAttribute('title', `Data model ${modelName} in JSON format`);
            jsonLink.setAttribute('href', jsonFileUrl);
            return;
          }
        }
      }

      // If not viewing a model, or model details aren't ready, remove the element
      if (jsonLink && jsonLink.parentNode === document.head) {
        document.head.removeChild(jsonLink);
      }
    };

    updateModelJsonLink();

  }, [
    activeView,
    currentPost,
    currentPage,
    currentAuthor,
    isDataReady,
    contentNotFound,
    t,
    searchString,
    modelIndex,
    allCodelists,
    loadedModelData
  ]);
}
