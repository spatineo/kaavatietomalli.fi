import { useState, useEffect, useMemo, useCallback } from 'react';
import { CONFIG } from '../config';

export type ViewType = 'home' | 'post' | 'page' | 'author' | 'tag';

export interface ActiveView {
  type: ViewType;
  slug: string | null;
}

export function useRouter() {
  const [searchString, setSearchString] = useState(() => 
    typeof window !== 'undefined' ? window.location.search : ''
  );

  const [pendingScroll, setPendingScroll] = useState(false);

  const activeView = useMemo<ActiveView>(() => {
    const params = new URLSearchParams(searchString);
    const post = params.get('post');
    const page = params.get('page');
    const author = params.get('author');
    const tag = params.get('tag');

    if (post) return { type: 'post', slug: post };
    if (page) return { type: 'page', slug: page };
    if (author) return { type: 'author', slug: author };
    if (tag) return { type: 'tag', slug: tag };
    return { type: 'home', slug: null };
  }, [searchString]);

  // Unified popstate listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setSearchString(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((view: { type: string; slug: string | null }) => {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (view.type !== 'home' && view.slug) {
      params.set(view.type, view.slug);
    }
    
    const searchPart = params.toString() ? `?${params.toString()}` : '';
    const finalPath = CONFIG.basePath + searchPart;

    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== finalPath) {
      window.history.pushState(null, '', finalPath);
    }
    setSearchString(searchPart);
  }, []);

  const onHome = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo(0, 0);
    }
    navigate({ type: 'home', slug: null });
    setPendingScroll(false);
  }, [navigate]);

  const scrollToBlog = useCallback(() => {
    if (activeView.type !== 'home') {
      setPendingScroll(true);
      navigate({ type: 'home', slug: null });
    } else {
      if (typeof window !== 'undefined') {
        const element = document.getElementById('journal-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [activeView.type, navigate]);

  return {
    searchString,
    activeView,
    navigate,
    pendingScroll,
    setPendingScroll,
    onHome,
    scrollToBlog,
  };
}
