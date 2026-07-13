/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { PostView } from './components/PostView';
import { PageView } from './components/PageView';
import { Header, Footer } from './components/Navigation';
import { AuthorView } from './components/AuthorView';
import { NotFoundView } from './components/NotFoundView';
import { HomeView } from './components/HomeView';
import { TagView } from './components/TagView';
import { CookieConsent } from './components/CookieConsent';
import { getAllPostMetadata, getAuthorBySlug, PostMetadata, AuthorData } from './lib/blog';
import { CONFIG } from './config';
import { getTranslations, Language } from './i18n';
import { PasswordGate } from './components/PasswordGate';
import { VersionMismatchPrompt } from './components/VersionMismatchPrompt';
import { useRouter } from './hooks/useRouter';
import { useMetadataSync } from './hooks/useMetadataSync';
import { useContentLoader } from './hooks/useContentLoader';
import { ErrorBoundary } from './components/ErrorBoundary';

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
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [editor, setEditor] = useState<AuthorData | null>(null);

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

  // Content Loader state machine hook
  const {
    currentPost,
    currentPage,
    currentAuthor,
    tagPosts,
    tagPage,
    isDataReady,
    contentNotFound,
    visibleTagCount,
    loadMoreTags,
  } = useContentLoader({ activeView, posts });

  // Sync page metadata and analytics
  useMetadataSync({
    activeView,
    currentPost,
    currentPage,
    currentAuthor,
    isDataReady,
    contentNotFound,
  });



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

  return (
    <>
      <PasswordGate>
        <div 
          className="min-h-screen flex flex-col bg-brand-bg text-slate-300"
          data-testid="app-layout"
          data-view-type={activeView.type}
          data-view-slug={activeView.slug || ""}
          data-is-ready={isDataReady}
        >
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
          <ErrorBoundary onReset={onHome}>
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
                onLoadMore={loadMoreTags}
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
          </ErrorBoundary>
        </main>
  
        <Footer />
        <CookieConsent />
      </div>
    </PasswordGate>
    <VersionMismatchPrompt />
    </>
  );
}
