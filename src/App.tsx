/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PostView } from './components/PostView';
import { PageView } from './components/PageView';
import { Header, Footer } from './components/Navigation';
import { AuthorView } from './components/AuthorView';
import { NotFoundView } from './components/NotFoundView';
import { HomeView } from './components/HomeView';
import { TagView } from './components/TagView';
import { CookieConsent } from './components/CookieConsent';
import { getAllPostMetadata, getPostBySlug, getPageBySlug, getAuthorBySlug, getPostsByTag, getTagPageSlugs, PostMetadata, PostData, PageData, AuthorData } from './lib/blog';
import { CONFIG } from './config';
import { resolveImageUrl } from './lib/utils';
import { getTranslations, Language } from './i18n';
import { getTracker } from './services/analytics';
import { PasswordGate } from './components/PasswordGate';
import { VersionMismatchPrompt } from './components/VersionMismatchPrompt';
import { useRouter } from './hooks/useRouter';

export default function App() {
  const t = getTranslations(CONFIG.language as Language);

  useEffect(() => {
    document.documentElement.lang = CONFIG.language;
  }, []);

  const {
    activeView,
    navigate,
    pendingScroll,
    setPendingScroll,
    onHome,
    scrollToBlog,
  } = useRouter();

  const [selectedThemeTag, setSelectedThemeTag] = useState<string | null>(null);
  const [visibleJournalCount, setVisibleJournalCount] = useState(10);
  const [visibleTagCount, setVisibleTagCount] = useState(10);
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [tagPosts, setTagPosts] = useState<PostMetadata[]>([]);
  const [tagPage, setTagPage] = useState<PageData | null>(null);
  const [activeTagSlug, setActiveTagSlug] = useState<string | null>(null);
  const [currentPost, setCurrentPost] = useState<PostData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [currentAuthor, setCurrentAuthor] = useState<AuthorData | null>(null);
  const [editor, setEditor] = useState<AuthorData | null>(null);
  const [contentNotFound, setContentNotFound] = useState(false);
  const lastTrackedRef = useRef<string | null>(null);

  // Compute adjacent posts dynamically to avoid race conditions when deep linking to a post
  const adjacentPosts = useMemo(() => {
    if (activeView.type !== 'post' || !activeView.slug || posts.length === 0) {
      return { next: null, prev: null };
    }
    const idx = posts.findIndex(p => p.slug === activeView.slug);
    if (idx === -1) {
      return { next: null, prev: null };
    }
    return {
      prev: idx > 0 ? posts[idx - 1] : null,
      next: idx < posts.length - 1 ? posts[idx + 1] : null
    };
  }, [activeView.type, activeView.slug, posts]);

  useEffect(() => {
    // Load all post metadata on mount
    getAllPostMetadata().then(setPosts);
    // Load the featured author data
    getAuthorBySlug('ilkka-rinne').then(setEditor);
  }, []);

  // 1. Unified content loading effect
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
            console.error('[App] post load failed:', err);
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
            console.error('[App] page load failed:', err);
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
            console.error('[App] author load failed:', err);
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
            console.error('[App] tag items load failed:', err);
            if (!ignore) setContentNotFound(true);
          }
        }
      }
    };
 
    loadData();
    return () => { 
        ignore = true; 
    };
  }, [activeView.type, activeView.slug, posts.length]);

  // Determine if the current data matches the requested view
  const isDataReady = useMemo(() => {
    let ready = false;
    if (activeView.type === 'home') ready = true;
    else if (activeView.type === 'post') ready = currentPost?.slug === activeView.slug;
    else if (activeView.type === 'page') ready = currentPage?.slug === activeView.slug;
    else if (activeView.type === 'author') ready = currentAuthor?.slug === activeView.slug;
    else if (activeView.type === 'tag') {
        ready = activeTagSlug === activeView.slug && (tagPosts.length > 0 || !!tagPage);
    }
    
    return ready;
  }, [activeView, currentPost, currentPage, currentAuthor, tagPosts, tagPage, activeTagSlug]);



  // Delayed loader visibility to avoid flash on fast loads
  const [showLoader, setShowLoader] = useState(false);
  useEffect(() => {
    let timer: number;
    if (!isDataReady && activeView.type !== 'home' && !contentNotFound) {
      timer = window.setTimeout(() => setShowLoader(true), 150);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [isDataReady, activeView.type, contentNotFound]);



  useEffect(() => {
    // If we've returned home and have a pending scroll request
    if (activeView.type === 'home' && pendingScroll) {
      const timer = setTimeout(() => {
        const element = document.getElementById('journal-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          setPendingScroll(false);
        }
      }, 500); // Wait for transition animation
      return () => clearTimeout(timer);
    }
  }, [activeView, pendingScroll]);

  // Sync page metadata
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

  return (
    <>
      <PasswordGate>
        <div className="min-h-screen flex flex-col bg-brand-bg text-slate-300">
        <a href="#main-content" className="skip-to-content">
          {t.common.skipToContent}
        </a>
        <Header 
          onNavigatePage={(slug) => navigate({ type: 'page', slug })} 
          onNavigateTag={(tag) => navigate({ type: 'tag', slug: tag })}
          onNavigatePost={(slug) => navigate({ type: 'post', slug })}
          onNavigateAuthor={(slug) => navigate({ type: 'author', slug })}
          onHome={onHome} 
          onBlog={scrollToBlog} 
        />
        
        <main id="main-content" className="flex-grow">
          <AnimatePresence>
            {contentNotFound ? (
              <motion.div
                key="not-found"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <NotFoundView 
                  missingSlug={activeView.slug || undefined}
                  onNavigate={(type, slug) => navigate({ type, slug })}
                  onHome={onHome}
                />
              </motion.div>
            ) : activeView.type === 'post' ? (
              isDataReady ? (
                <motion.div
                  key={`post-${activeView.slug}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PostView 
                    post={currentPost!} 
                    nextPost={adjacentPosts.next}
                    prevPost={adjacentPosts.prev}
                    onBack={onHome} 
                    onNavigate={(slug) => {
                      navigate({ type: 'post', slug });
                    }}
                    onNavigateAuthor={(slug) => {
                      navigate({ type: 'author', slug });
                    }}
                    onSelectTag={(tag) => {
                      navigate({ type: 'tag', slug: tag });
                    }}
                  />
                </motion.div>
              ) : showLoader ? (
                <motion.div 
                  key="loader-post" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-h-screen flex items-center justify-center"
                >
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              ) : <div key="pending-post" />
            ) : activeView.type === 'page' ? (
              isDataReady ? (
                <motion.div
                  key={`page-${activeView.slug}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <PageView 
                    page={currentPage!}
                    onBack={onHome}
                  />
                </motion.div>
              ) : showLoader ? (
                <motion.div 
                  key="loader-page" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-h-screen flex items-center justify-center"
                >
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              ) : <div key="pending-page" />
            ) : activeView.type === 'author' ? (
              isDataReady ? (
                <motion.div
                  key={`author-${activeView.slug}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AuthorView 
                    author={currentAuthor!}
                    onBack={onHome}
                  />
                </motion.div>
              ) : showLoader ? (
                <motion.div 
                  key="loader-author" 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-h-screen flex items-center justify-center"
                >
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              ) : <div key="pending-author" />
            ) : activeView.type === 'tag' ? (
              <TagView
                tagSlug={activeView.slug!}
                isDataReady={isDataReady}
                tagPage={tagPage}
                tagPosts={tagPosts}
                visibleTagCount={visibleTagCount}
                onLoadMore={() => setVisibleTagCount((prev) => prev + 10)}
                navigate={navigate}
                onHome={onHome}
              />
            ) : (
              <HomeView
                posts={posts}
                editor={editor}
                selectedThemeTag={selectedThemeTag}
                setSelectedThemeTag={setSelectedThemeTag}
                visibleJournalCount={visibleJournalCount}
                onLoadMore={() => setVisibleJournalCount((prev) => prev + 10)}
                navigate={navigate}
                onBlog={scrollToBlog}
              />
            )}
          </AnimatePresence>
        </main>
  
        <Footer />
        <CookieConsent />
      </div>
    </PasswordGate>
    <VersionMismatchPrompt />
    </>
  );
}
