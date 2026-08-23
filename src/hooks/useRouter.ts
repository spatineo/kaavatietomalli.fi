import { useState, useEffect, useMemo, useCallback, createContext, useContext, ReactNode, createElement } from 'react';
import { CONFIG } from '../config';

export type ViewType = 'home' | 'post' | 'page' | 'author' | 'tag' | 'model' | 'validate';

export interface ActiveView {
  type: ViewType;
  slug: string | null;
}

export function useRouter() {
  const [pathname, setPathname] = useState(() => 
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const [searchString, setSearchString] = useState(() => 
    typeof window !== 'undefined' ? window.location.search : ''
  );

  const [pendingScroll, setPendingScroll] = useState(false);

  const activeView = useMemo<ActiveView>(() => {
    // 1. Path-based parsing
    let relativePath = pathname;
    if (relativePath.startsWith(CONFIG.basePath)) {
      relativePath = relativePath.substring(CONFIG.basePath.length);
    }
    relativePath = relativePath.replace(/^\/+/, '').replace(/\/+$/, '');

    if (relativePath) {
      const parts = relativePath.split('/');
      const firstPart = parts[0];
      const secondPart = parts[1] ? decodeURIComponent(parts[1]) : null;

      if (firstPart === 'blog') {
        return { type: 'post', slug: secondPart };
      }
      if (firstPart === 'author') {
        return { type: 'author', slug: secondPart };
      }
      if (firstPart === 'tag') {
        return { type: 'tag', slug: secondPart };
      }
      if (firstPart === 'data-model') {
        return { type: 'model', slug: secondPart };
      }
      if (firstPart === 'validate') {
        return { type: 'validate', slug: secondPart || 'ryhti-kaava' };
      }

      // Check if it's not reserved for data-model or validate
      if (firstPart !== 'data-model' && firstPart !== 'model' && firstPart !== 'validate') {
        return { type: 'page', slug: decodeURIComponent(firstPart) };
      }
    }

    // 2. Fallback query-parameter parsing
    const params = new URLSearchParams(searchString);
    const model = params.get('model');
    const post = params.get('post');
    const page = params.get('page');
    const author = params.get('author');
    const tag = params.get('tag');
    const validate = params.get('validate');

    if (model) return { type: 'model', slug: model };
    if (post) return { type: 'post', slug: post };
    if (page) return { type: 'page', slug: page };
    if (author) return { type: 'author', slug: author };
    if (tag) return { type: 'tag', slug: tag };
    if (validate) return { type: 'validate', slug: validate };
    return { type: 'home', slug: null };
  }, [pathname, searchString]);

  // Unified popstate listener
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearchString(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = useCallback((view: { type: string; slug: string | null; queryParams?: Record<string, string | null> }) => {
    if (typeof window === 'undefined') return;

    let pathPart = '';
    if (view.type !== 'home' && view.slug) {
      if (view.type === 'page') {
        pathPart = `${encodeURIComponent(view.slug)}`;
      } else if (view.type === 'post') {
        pathPart = `blog/${encodeURIComponent(view.slug)}`;
      } else if (view.type === 'author') {
        pathPart = `author/${encodeURIComponent(view.slug)}`;
      } else if (view.type === 'tag') {
        pathPart = `tag/${encodeURIComponent(view.slug)}`;
      } else if (view.type === 'model') {
        pathPart = `data-model/${encodeURIComponent(view.slug)}`;
      } else if (view.type === 'validate') {
        pathPart = `validate/${encodeURIComponent(view.slug || 'ryhti')}`;
      } else {
        pathPart = `${view.type}/${encodeURIComponent(view.slug)}`;
      }
    }

    const params = new URLSearchParams();
    if (view.queryParams) {
      Object.entries(view.queryParams).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') {
          params.set(k, v);
        }
      });
    }

    const base = CONFIG.basePath.endsWith('/') ? CONFIG.basePath : `${CONFIG.basePath}/`;
    const newPathname = pathPart ? `${base}${pathPart}` : CONFIG.basePath;
    const newSearchString = params.toString() ? `?${params.toString()}` : '';
    const finalPath = newPathname + newSearchString;

    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== finalPath) {
      window.history.pushState(null, '', finalPath);
    }
    setPathname(newPathname);
    setSearchString(newSearchString);
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
        setTimeout(() => {
          const element = document.getElementById('journal-section');
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }, 150);
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

export type RouterContextType = ReturnType<typeof useRouter>;

export const RouterContext = createContext<RouterContextType | null>(null);

export function RouterProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  return createElement(RouterContext.Provider, { value: router }, children);
}

export function useAppRouter() {
  const context = useContext(RouterContext);
  if (!context) {
    throw new Error('useAppRouter must be used within a RouterProvider');
  }
  return context;
}


