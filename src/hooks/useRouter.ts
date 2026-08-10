import { useState, useEffect, useMemo, useCallback, createContext, useContext, ReactNode, createElement } from 'react';
import { CONFIG } from '../config';

export type ViewType = 'home' | 'post' | 'page' | 'author' | 'tag' | 'model';

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
      const type = parts[0] as ViewType;
      const slug = parts[1] ? decodeURIComponent(parts[1]) : null;

      const validTypes: ViewType[] = ['post', 'page', 'author', 'tag', 'model'];
      if (validTypes.includes(type)) {
        return { type, slug };
      }
    }

    // 2. Fallback query-parameter parsing
    const params = new URLSearchParams(searchString);
    const model = params.get('model');
    const post = params.get('post');
    const page = params.get('page');
    const author = params.get('author');
    const tag = params.get('tag');

    if (model) return { type: 'model', slug: model };
    if (post) return { type: 'post', slug: post };
    if (page) return { type: 'page', slug: page };
    if (author) return { type: 'author', slug: author };
    if (tag) return { type: 'tag', slug: tag };
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
      pathPart = `${view.type}/${encodeURIComponent(view.slug)}`;
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


