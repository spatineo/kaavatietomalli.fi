/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Timeline } from './components/Timeline';
import { PostView } from './components/PostView';
import { PageView } from './components/PageView';
import { Header, Footer } from './components/Navigation';
import { HistoryHero } from './components/HistoryHero';
import { AuthorView } from './components/AuthorView';
import { getAllPostMetadata, getPostBySlug, getPageBySlug, getAuthorBySlug, getPostsByTag, getTagPageSlugs, PostMetadata, PostData, PageData, AuthorData } from './lib/blog';
import { CONFIG, ThemeItem } from './config';
import { resolveImageUrl } from './lib/utils';

export default function App() {
  const [searchString, setSearchString] = useState(() => 
    typeof window !== 'undefined' ? window.location.search : ''
  );

  const activeView = useMemo(() => {
    const params = new URLSearchParams(searchString);
    const post = params.get('post');
    const page = params.get('page');
    const author = params.get('author');
    const tag = params.get('tag');

    let result: { type: 'home' | 'post' | 'page' | 'author' | 'tag'; slug: string | null };
    if (post) result = { type: 'post', slug: post };
    else if (page) result = { type: 'page', slug: page };
    else if (author) result = { type: 'author', slug: author };
    else if (tag) result = { type: 'tag', slug: tag };
    else result = { type: 'home', slug: null };

    return result;
  }, [searchString]);

  const [selectedThemeTag, setSelectedThemeTag] = useState<string | null>(null);
  const [visibleJournalCount, setVisibleJournalCount] = useState(10);
  const [visibleTagCount, setVisibleTagCount] = useState(10);
  const [posts, setPosts] = useState<PostMetadata[]>([]);
  const [tagPosts, setTagPosts] = useState<PostMetadata[]>([]);
  const [tagPage, setTagPage] = useState<PageData | null>(null);
  const [currentPost, setCurrentPost] = useState<PostData | null>(null);
  const [currentPage, setCurrentPage] = useState<PageData | null>(null);
  const [currentAuthor, setCurrentAuthor] = useState<AuthorData | null>(null);
  const [editor, setEditor] = useState<AuthorData | null>(null);
  const [adjacentPosts, setAdjacentPosts] = useState<{ next: PostMetadata | null; prev: PostMetadata | null }>({ next: null, prev: null });
  const [pendingScroll, setPendingScroll] = useState(false);

  // URL Reconciliation helper
  const navigate = (view: { type: string; slug: string | null }) => {
    const params = new URLSearchParams();
    if (view.type !== 'home' && view.slug) {
      params.set(view.type, view.slug);
    }
    
    const searchPart = params.toString() ? `?${params.toString()}` : '';
    const finalPath = CONFIG.basePath + searchPart;

    const currentUrl = window.location.pathname + window.location.search;
    if (currentUrl !== finalPath) {
      window.history.pushState(null, '', finalPath);
      setSearchString(searchPart);
    }
  };

  // Listen for popstate changes
  useEffect(() => {
    const handlePopState = () => {
      setSearchString(window.location.search);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Load all post metadata on mount
    getAllPostMetadata().then(setPosts);
    // Load the featured author data
    getAuthorBySlug('ilkka-rinne').then(setEditor);
  }, []);

  // 1. Unified content loading effect
  useEffect(() => {
    let ignore = false;

    const loadData = async () => {
      // Logic for each view type
      if (activeView.type === 'post' && activeView.slug) {
        if (currentPost?.slug !== activeView.slug) {
          try {
            const post = await getPostBySlug(activeView.slug);
            if (!ignore) {
              setCurrentPost(post);
              // Neighbors
              if (posts.length > 0) {
                const idx = posts.findIndex(p => p.slug === activeView.slug);
                if (idx !== -1) {
                  setAdjacentPosts({
                    prev: idx > 0 ? posts[idx - 1] : null,
                    next: idx < posts.length - 1 ? posts[idx + 1] : null
                  });
                }
              }
              window.scrollTo(0, 0);
            }
          } catch (err) {
            console.error('[App] post load failed:', err);
          }
        }
      } else if (activeView.type === 'page' && activeView.slug) {
        if (currentPage?.slug !== activeView.slug) {
          try {
            const page = await getPageBySlug(activeView.slug);
            if (!ignore) {
              setCurrentPage(page);
              window.scrollTo(0, 0);
            }
          } catch (err) {
            console.error('[App] page load failed:', err);
          }
        }
      } else if (activeView.type === 'author' && activeView.slug) {
        if (currentAuthor?.slug !== activeView.slug) {
          try {
            const author = await getAuthorBySlug(activeView.slug);
            if (!ignore) {
              setCurrentAuthor(author);
              window.scrollTo(0, 0);
            }
          } catch (err) {
            console.error('[App] author load failed:', err);
          }
        }
      } else if (activeView.type === 'tag' && activeView.slug) {
        try {
          setVisibleTagCount(10);
          const taggedPosts = await getPostsByTag(activeView.slug, 0, 100);
          if (!ignore) {
            setTagPosts(taggedPosts);
            const pageSlugs = await getTagPageSlugs(activeView.slug);
            if (pageSlugs.length > 0 && !ignore) {
              const firstPage = await getPageBySlug(pageSlugs[0]);
              setTagPage(firstPage);
            }
            window.scrollTo(0, 0);
          }
        } catch (err) {
          console.error('[App] tag items load failed:', err);
        }
      }
    };

    loadData();
    return () => { ignore = true; };
  }, [activeView.type, activeView.slug, posts.length]);

  // Handle cross-type resets to clear old content when switching view modes
  useEffect(() => {
    if (activeView.type !== 'post') setCurrentPost(null);
    if (activeView.type !== 'page') setCurrentPage(null);
    if (activeView.type !== 'author') setCurrentAuthor(null);
    if (activeView.type !== 'tag') {
      setTagPosts([]);
      setTagPage(null);
    }
  }, [activeView.type]);

  // Determine if the current data matches the requested view
  const isDataReady = useMemo(() => {
    if (activeView.type === 'home') return true;
    if (activeView.type === 'post') return currentPost?.slug === activeView.slug;
    if (activeView.type === 'page') return currentPage?.slug === activeView.slug;
    if (activeView.type === 'author') return currentAuthor?.slug === activeView.slug;
    if (activeView.type === 'tag') return tagPosts.length > 0 || !!tagPage;
    return false;
  }, [activeView, currentPost, currentPage, currentAuthor, tagPosts.length, tagPage]);

  // Delayed loader visibility to avoid flash on fast loads
  const [showLoader, setShowLoader] = useState(false);
  useEffect(() => {
    let timer: number;
    if (!isDataReady && activeView.type !== 'home') {
      timer = window.setTimeout(() => setShowLoader(true), 150);
    } else {
      setShowLoader(false);
    }
    return () => clearTimeout(timer);
  }, [isDataReady, activeView.type]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (activeView.type !== 'home' && activeView.type !== 'tag') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (activeView.type === 'tag') {
            setVisibleTagCount((prev) => prev + 10);
          } else {
            setVisibleJournalCount((prev) => prev + 10);
          }
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const target = document.getElementById('infinite-scroll-trigger');
    if (target) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [activeView, posts, visibleJournalCount, visibleTagCount, tagPosts]);

  const historyPosts = posts.filter(p => p.category === 'history');
  const allJournalPosts = posts
    .filter(p => p.category === 'journal')
    .filter(p => !selectedThemeTag || p.tags.includes(selectedThemeTag));
  const visibleJournalPosts = allJournalPosts.slice(0, visibleJournalCount);

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

  const onHome = () => {
    window.scrollTo(0, 0);
    navigate({ type: 'home', slug: null });
    setPendingScroll(false);
  };

  const scrollToBlog = () => {
    if (activeView.type !== 'home') {
      setPendingScroll(true);
      navigate({ type: 'home', slug: null });
    } else {
      const element = document.getElementById('journal-section');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-bg text-slate-300">
      <a href="#main-content" className="skip-to-content">
        Hyppää sisältöön
      </a>
      <Header 
        onNavigatePage={(slug) => {
          navigate({ type: 'page', slug });
        }} 
        onNavigateTag={(tag) => {
          navigate({ type: 'tag', slug: tag });
        }}
        onHome={onHome} 
        onBlog={scrollToBlog} 
      />
      
      <main id="main-content" className="flex-grow">
        <AnimatePresence>
          {activeView.type === 'post' ? (
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
            <motion.div 
              key={`tag-${activeView.slug}`} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="py-24"
            >
              <div className="max-w-5xl mx-auto px-10 mb-20">
                <button
                  onClick={onHome}
                  className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors mb-12 uppercase font-bold tracking-[0.2em] text-[10px]"
                >
                  Etusivulle
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-md">
                    Aihepiiri
                  </span>
                  <div className="h-[1px] w-12 bg-white/10" />
                </div>
                {tagPage ? (
                <div className="markdown-body prose prose-stone prose-invert max-w-none border-b border-white/10 pb-20 mb-20">
                    <PageView page={tagPage} onBack={() => {}} inline />
                </div>
                ) : (
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white mb-10">
                  <span className="text-brand-accent opacity-50">#</span>{activeView.slug}
                </h1>
                )}

                <div className="flex items-center gap-6 mb-12">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">Liittyvät artikkelit</span>
                  <div className="h-[1px] flex-grow bg-white/10" />
                </div>
              </div>

              <Timeline 
                posts={tagPosts.slice(0, visibleTagCount)} 
                onSelectPost={(slug) => {
                  navigate({ type: 'post', slug });
                }}
                onSelectTag={(tag) => {
                  navigate({ type: 'tag', slug: tag });
                }}
              />

              {visibleTagCount < tagPosts.length && (
                <div 
                  id="infinite-scroll-trigger" 
                  className="min-h-32 flex flex-col items-center justify-center mt-20 gap-8"
                >
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                  <button 
                    onClick={() => setVisibleTagCount((prev) => prev + 10)}
                    className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-brand-accent transition-colors border border-white/10 px-6 py-3 rounded-full hover:border-brand-accent/30"
                  >
                    Lataa lisää
                  </button>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="home-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              {/* Hero Section */}
              <section className="bg-brand-bg pt-20 pb-20 md:pt-32 md:pb-32">
                <div className="max-w-7xl mx-auto px-6">
                  <div className="flex flex-col gap-12 md:gap-16">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-[1px] w-8 bg-brand-accent" />
                        <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">Tietomallimuotoinen kaavoitus Suomessa</span>
                      </div>
                      <h1 className="text-6xl md:text-[7rem] lg:text-[9rem] font-black tracking-tighter leading-[0.8] text-white">
                        Kaava<span className="text-brand-accent">tieto</span><span className="text-white/20"><wbr/>malli.</span>
                      </h1>
                    </motion.div>

                    <div className="grid lg:grid-cols-[1fr_450px] gap-12 items-end">
                      <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                        className="text-xl md:text-3xl text-slate-400 max-w-3xl font-medium leading-[1.4] tracking-tight"
                      >
                        Digitalisoituvan alueidenkäytön suunnittelun päättymätön tarina: lainsäädännön merkkipaalut, teknisen toteutuksen kiemurat ja asiantuntijanäkemykset &mdash; tervettä kritiikkiä unohtamatta.
                      </motion.p>

                      {editor && (
                        <motion.button
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                          onClick={() => navigate({ type: 'author', slug: editor.slug })}
                          className="group/profile bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-row items-center text-left hover:border-brand-accent/50 transition-all backdrop-blur-sm shadow-2xl relative overflow-hidden outline-none w-full max-w-[450px] lg:ml-auto"
                          aria-label={`Kirjoittaja-profiili: ${editor.name}`}
                        >
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mr-6 border border-white/10 group-hover/profile:border-brand-accent transition-colors relative z-10 shadow-xl flex-shrink-0">
                            <img 
                              src={resolveImageUrl(editor.image)} 
                              alt={editor.name} 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover/profile:scale-110" 
                            />
                          </div>
                          <div className="relative z-10 flex-1 min-w-0">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-accent mb-1">Päätoimittaja</p>
                            <h3 className="text-xl font-bold text-white group-hover/profile:text-brand-accent transition-colors leading-tight mb-1 truncate">
                              {editor.name}
                            </h3>
                            <p className="text-s text-slate-400 font-medium leading-tight">
                              {editor.title}
                            </p>
                            <p className="text-s text-slate-400 font-medium leading-tight">
                              {editor.company}
                            </p>
                          </div>
                        </motion.button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* History Hero Segment with author featured */}
              <HistoryHero 
                posts={historyPosts} 
                onSelectPost={(slug) => {
                  navigate({ type: 'post', slug });
                }} 
              />

              <div id="journal-section" className="py-20 lg:py-40">
                <div className="max-w-5xl mx-auto px-10 mb-32">
                  <div className="flex items-center gap-6 mb-12">
                    <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">Rakentavasti rakenteistamisesta</span>
                    <div className="h-[1px] flex-grow bg-white/10" />
                    <span className="text-[10px] font-mono text-slate-500">Päätoimittaja: Ilkka Rinne / Spatineo</span>
                  </div>
                  
                  <h2 className="text-6xl md:text-7xl font-black leading-[0.8] tracking-tighter mb-12 text-white">
                    Kaava<span className="text-brand-accent">tieto</span><span className="text-white/30">blogi.</span>
                  </h2>
                  
                  <p className="text-2xl text-slate-400 max-w-xl font-medium leading-relaxed mb-12">
                    Merkintöjä digitalisoituvan rakennetun ympäristön suunnittelun mahdollistajilta. 
                    Tekstit edustavat kirjoittajien henkilökohtaisia mielipiteitä.
                  </p>

                  {CONFIG.themes && CONFIG.themes.length > 0 && (
                    <div className="flex flex-col gap-6">
                      <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 ml-1">Teemat</h3>
                      <div className="flex flex-wrap gap-3">
                        <button
                          onClick={() => {
                            setSelectedThemeTag(null);
                            setVisibleJournalCount(10);
                          }}
                          className={`px-6 py-3 rounded-xl uppercase font-bold tracking-widest text-[10px] transition-all border ${
                            !selectedThemeTag 
                            ? 'bg-brand-accent border-brand-accent text-brand-bg shadow-lg shadow-brand-accent/20' 
                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-accent/30'
                          }`}
                        >
                          Kaikki
                        </button>
                        {CONFIG.themes.map((theme: ThemeItem) => (
                          <button
                            key={theme.id}
                            onClick={() => {
                              setSelectedThemeTag(theme.tag);
                              setVisibleJournalCount(10);
                              // Scroll slightly to update visibility if needed
                              window.scrollBy(0, 1);
                            }}
                            className={`px-6 py-3 rounded-xl uppercase font-bold tracking-widest text-[10px] transition-all border ${
                              selectedThemeTag === theme.tag 
                              ? 'bg-brand-accent border-brand-accent text-brand-bg shadow-lg shadow-brand-accent/20' 
                              : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-accent/30'
                            }`}
                          >
                            {theme.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <Timeline 
                  posts={visibleJournalPosts} 
                  onSelectPost={(slug) => {
                    navigate({ type: 'post', slug });
                  }} 
                  onSelectTag={(tag) => {
                    navigate({ type: 'tag', slug: tag });
                  }}
                />
                
                {/* Infinite Scroll Trigger */}
                {visibleJournalCount < allJournalPosts.length && (
                  <div 
                    id="infinite-scroll-trigger" 
                    className="min-h-32 flex flex-col items-center justify-center mt-20 gap-8"
                  >
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <button 
                      onClick={() => setVisibleJournalCount((prev) => prev + 10)}
                      className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-brand-accent transition-colors border border-white/10 px-6 py-3 rounded-full hover:border-brand-accent/30"
                    >
                      Lataa lisää
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
