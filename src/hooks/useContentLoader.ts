/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { 
  getPostBySlug, 
  getPageBySlug, 
  getAuthorBySlug, 
  getPostsByTag, 
  getTagPageSlugs, 
  PostMetadata, 
  PostData, 
  PageData, 
  AuthorData 
} from '../lib/blog';
import { CONFIG } from '../config';

export interface UseContentLoaderProps {
  activeView: { type: string; slug: string | null };
  posts: PostMetadata[];
}

export function useContentLoader({ activeView, posts }: UseContentLoaderProps) {
  const [tagPosts, setTagPosts] = useState<PostMetadata[]>([]);
  const [tagPage, setTagPage] = useState<PageData | null>(null);
  const [activeTagSlug, setActiveTagSlug] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<PostData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [currentAuthor, setCurrentAuthor] = useState<AuthorData | null>(null);
  const [verifiedModelSlug, setVerifiedModelSlug] = useState<string | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const [visibleTagCount, setVisibleTagCount] = useState(10);

  // Unified content loading effect
  useEffect(() => {
    let ignore = false;
    setContentNotFound(false);
 
    // Immediate cleanup of "other" detail states to avoid stale renders during transitions
    if (activeView.type !== 'post') {
      setCurrentPost(null);
    }
    if (activeView.type !== 'page') {
      setCurrentPage(null);
    }
    if (activeView.type !== 'author') {
      setCurrentAuthor(null);
    }
    if (activeView.type !== 'model') {
      setVerifiedModelSlug(null);
    }
    if (activeView.type !== 'tag') {
      setTagPosts([]);
      setTagPage(null);
      setActiveTagSlug(null);
    }
 
    // Also clear the current view's state if the slug changed, to ensure isDataReady becomes false immediately
    if (activeView.type === 'post' && currentPost?.slug !== activeView.slug) {
      setCurrentPost(null);
    }
    if (activeView.type === 'page' && currentPage?.slug !== activeView.slug) {
      setCurrentPage(null);
    }
    if (activeView.type === 'author' && currentAuthor?.slug !== activeView.slug) {
      setCurrentAuthor(null);
    }
    if (activeView.type === 'model' && verifiedModelSlug !== activeView.slug) {
      setVerifiedModelSlug(null);
    }
    if (activeView.type === 'tag' && activeTagSlug !== activeView.slug) {
      setTagPosts([]);
      setTagPage(null);
      setActiveTagSlug(null);
    }
 
    const loadData = async () => {
      if (activeView.type === 'post' && activeView.slug) {
        if (currentPost?.slug !== activeView.slug) {
          try {
            const post = await getPostBySlug(activeView.slug);
            if (!ignore) {
              if (post) {
                setCurrentPost(post);
                window.scrollTo(0, 0);
              } else {
                setContentNotFound(true);
              }
            }
          } catch (err) {
            console.error('[ContentLoader] post load failed:', err);
            if (!ignore) setContentNotFound(true);
          }
        }
      } else if (activeView.type === 'page' && activeView.slug) {
        if (currentPage?.slug !== activeView.slug) {
          try {
            const page = await getPageBySlug(activeView.slug);
            if (!ignore) {
              if (page) {
                setCurrentPage(page);
                window.scrollTo(0, 0);
              } else {
                setContentNotFound(true);
              }
            }
          } catch (err) {
            console.error('[ContentLoader] page load failed:', err);
            if (!ignore) setContentNotFound(true);
          }
        }
      } else if (activeView.type === 'author' && activeView.slug) {
        if (currentAuthor?.slug !== activeView.slug) {
          try {
            const author = await getAuthorBySlug(activeView.slug);
            if (!ignore) {
              if (author) {
                setCurrentAuthor(author);
                window.scrollTo(0, 0);
              } else {
                setContentNotFound(true);
              }
            }
          } catch (err) {
            console.error('[ContentLoader] author load failed:', err);
            if (!ignore) setContentNotFound(true);
          }
        }
      } else if (activeView.type === 'tag' && activeView.slug) {
        if (activeTagSlug !== activeView.slug) {
          try {
            setVisibleTagCount(10);
            const [taggedPosts, pageSlugs] = await Promise.all([
              getPostsByTag(activeView.slug, 0, 100),
              getTagPageSlugs(activeView.slug)
            ]);
            
            if (!ignore) {
              if (taggedPosts.length > 0 || pageSlugs.length > 0) {
                setTagPosts(taggedPosts);
                setActiveTagSlug(activeView.slug);
                if (pageSlugs.length > 0) {
                  const firstPage = await getPageBySlug(pageSlugs[0]);
                  if (!ignore) {
                    setTagPage(firstPage);
                  }
                }
                window.scrollTo(0, 0);
              } else {
                setContentNotFound(true);
              }
            }
          } catch (err) {
            console.error('[ContentLoader] tag items load failed:', err);
            if (!ignore) setContentNotFound(true);
          }
        }
      } else if (activeView.type === 'model' && activeView.slug) {
        if (verifiedModelSlug !== activeView.slug) {
          try {
            const res = await fetch(`${CONFIG.basePath}data/suomi.fi/tietomallit/index.json`);
            if (!res.ok) {
              throw new Error(`HTTP ${res.status}`);
            }
            const models = await res.json();
            const exists = Array.isArray(models) && models.some((m: any) => m.path.startsWith(`${activeView.slug}-`));
            if (!ignore) {
              if (exists) {
                setVerifiedModelSlug(activeView.slug);
                window.scrollTo(0, 0);
              } else {
                setContentNotFound(true);
              }
            }
          } catch (err) {
            console.error('[ContentLoader] model check failed:', err);
            if (!ignore) {
              setContentNotFound(true);
            }
          }
        }
      }
    };
 
    loadData();
    return () => { 
      ignore = true; 
    };
  }, [activeView.type, activeView.slug, posts.length, verifiedModelSlug]);

  // Determine if the current data matches the requested view
  const isDataReady = useMemo(() => {
    let ready = false;
    if (activeView.type === 'home') ready = true;
    else if (activeView.type === 'model') {
      ready = verifiedModelSlug === activeView.slug;
    }
    else if (activeView.type === 'post') ready = currentPost?.slug === activeView.slug;
    else if (activeView.type === 'page') ready = currentPage?.slug === activeView.slug;
    else if (activeView.type === 'author') ready = currentAuthor?.slug === activeView.slug;
    else if (activeView.type === 'tag') {
      ready = activeTagSlug === activeView.slug && (tagPosts.length > 0 || !!tagPage);
    }
    
    return ready;
  }, [activeView, currentPost, currentPage, currentAuthor, tagPosts, tagPage, activeTagSlug]);

  const loadMoreTags = () => {
    setVisibleTagCount((prev) => prev + 10);
  };

  return {
    currentPost,
    currentPage,
    currentAuthor,
    tagPosts,
    tagPage,
    isDataReady,
    contentNotFound,
    visibleTagCount,
    loadMoreTags,
  };
}
