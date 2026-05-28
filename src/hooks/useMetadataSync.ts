/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef } from 'react';
import { PostData, PageData, AuthorData } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { getTracker } from '../services/analytics';
import { resolveImageUrl } from '../lib/utils';

export interface UseMetadataSyncProps {
  activeView: { type: string; slug: string | null };
  currentPost: PostData | null;
  currentPage: PageData | null;
  currentAuthor: AuthorData | null;
  isDataReady: boolean;
  contentNotFound: boolean;
}

export function useMetadataSync({
  activeView,
  currentPost,
  currentPage,
  currentAuthor,
  isDataReady,
  contentNotFound,
}: UseMetadataSyncProps) {
  const t = getTranslations(CONFIG.language as Language);
  const lastTrackedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isDataReady && activeView.type !== 'home' && !contentNotFound) return;

    let title = 'Kaavatietomalli.fi';
    let description = t.hero.description;

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
    }

    document.title = title;

    const currentKey = `${activeView.type}:${activeView.slug || ''}:${contentNotFound}:${currentPost?.slug || ''}:${currentPage?.slug || ''}:${currentAuthor?.slug || ''}`;
    if (currentKey !== lastTrackedRef.current) {
      lastTrackedRef.current = currentKey;
      if (activeView.type === 'home') {
        getTracker().trackPageView(CONFIG.basePath, `Home | Kaavatietomalli.fi`);
      } else if (contentNotFound) {
        getTracker().trackPageView(`${CONFIG.basePath}404`, `404: Not Found`);
      } else if (activeView.type === 'tag' && activeView.slug) {
        getTracker().trackPageView(`${CONFIG.basePath}?tag=${activeView.slug}`, `#${activeView.slug} | Kaavatietomalli.fi`, [activeView.slug]);
      } else if (activeView.type === 'post' && currentPost) {
        getTracker().trackPostView(currentPost.slug, currentPost.title, currentPost.tags);
        getTracker().trackPageView(`${CONFIG.basePath}?post=${currentPost.slug}`, currentPost.title, currentPost.tags);
      } else if (activeView.type === 'page' && currentPage) {
        getTracker().trackPageView(`${CONFIG.basePath}?page=${currentPage.slug}`, currentPage.title);
      } else if (activeView.type === 'author' && currentAuthor) {
        getTracker().trackAuthorView(currentAuthor.slug, currentAuthor.name);
        getTracker().trackPageView(`${CONFIG.basePath}?author=${currentAuthor.slug}`, currentAuthor.name);
      }
    }

    const updateMeta = (selector: string, content: string) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute('content', content);
    };

    // Canonical / Alternate link handling
    const currentPath = activeView.type === 'home' ? '' : `?${activeView.type}=${activeView.slug}`;
    const canonicalUrl = `${CONFIG.baseUrl}${CONFIG.basePath}${currentPath}`;

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
        dcLink.setAttribute('title', 'Raw Markdown');
        document.head.appendChild(dcLink);
      }

      const folder = type === 'post' ? 'posts' : 'pages';
      let resolvedFile = `${slug}.md`;
      if (type === 'post' && currentPost && currentPost.slug === slug && currentPost.file) {
        resolvedFile = currentPost.file;
      } else if (type === 'page' && currentPage && currentPage.slug === slug && currentPage.file) {
        resolvedFile = currentPage.file;
      }

      dcLink.setAttribute('href', `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/refs/heads/main/content/${folder}/${resolvedFile}`);
    };

    if (activeView.type === 'post' || activeView.type === 'page') {
      updateDiscoveryLink(activeView.type, activeView.slug);
    } else {
      updateDiscoveryLink('', null);
    }

  }, [activeView, currentPost, currentPage, currentAuthor, isDataReady, contentNotFound, t]);
}
