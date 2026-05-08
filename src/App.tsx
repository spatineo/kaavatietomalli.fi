/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Timeline } from './components/Timeline';
import { PostView } from './components/PostView';
import { PageView } from './components/PageView';
import { Header, Footer } from './components/Navigation';
import { HistoryHero } from './components/HistoryHero';
import { AuthorView } from './components/AuthorView';
import { getAllPostMetadata, getPostBySlug, getPageBySlug, getAuthorBySlug, getPostsByTag, getTagPageSlugs, PostMetadata, PostData, PageData, AuthorData } from './lib/blog';

export default function App() {
  const [selectedPostSlug, setSelectedPostSlug] = useState<string | null>(null);
  const [selectedPageSlug, setSelectedPageSlug] = useState<string | null>(null);
  const [selectedAuthorSlug, setSelectedAuthorSlug] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
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

  // URL Synchronization
  useEffect(() => {
    const handleLocationChange = () => {
      const path = window.location.pathname.replace(/\/$/, ''); // Remove trailing slash
      
      if (path.startsWith('/post/')) {
        setSelectedPostSlug(path.substring(6));
        setSelectedPageSlug(null);
        setSelectedAuthorSlug(null);
        setSelectedTag(null);
      } else if (path.startsWith('/page/')) {
        setSelectedPageSlug(path.substring(6));
        setSelectedPostSlug(null);
        setSelectedAuthorSlug(null);
        setSelectedTag(null);
      } else if (path.startsWith('/author/')) {
        setSelectedAuthorSlug(path.substring(8));
        setSelectedPostSlug(null);
        setSelectedPageSlug(null);
        setSelectedTag(null);
      } else if (path.startsWith('/tag/')) {
        setSelectedTag(path.substring(5));
        setSelectedPostSlug(null);
        setSelectedPageSlug(null);
        setSelectedAuthorSlug(null);
      } else {
        setSelectedPostSlug(null);
        setSelectedPageSlug(null);
        setSelectedAuthorSlug(null);
        setSelectedTag(null);
      }
    };

    // Initial load
    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  useEffect(() => {
    let newPath = '/';
    if (selectedPostSlug) newPath = `/post/${selectedPostSlug}`;
    else if (selectedPageSlug) newPath = `/page/${selectedPageSlug}`;
    else if (selectedAuthorSlug) newPath = `/author/${selectedAuthorSlug}`;
    else if (selectedTag) newPath = `/tag/${selectedTag}`;

    if (window.location.pathname !== newPath) {
      window.history.pushState(null, '', newPath);
    }
  }, [selectedPostSlug, selectedPageSlug, selectedAuthorSlug, selectedTag]);


  useEffect(() => {
    // Load all post metadata on mount
    const allPosts = getAllPostMetadata();
    setPosts(allPosts);
    // Load the featured author data
    getAuthorBySlug('ilkka-rinne').then(setEditor);
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (selectedPostSlug || selectedPageSlug || selectedAuthorSlug) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          if (selectedTag) {
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
  }, [selectedPostSlug, selectedPageSlug, selectedAuthorSlug, selectedTag, posts, visibleJournalCount, visibleTagCount, tagPosts]);

  useEffect(() => {
    const loadTagContent = async () => {
      if (selectedTag) {
        setVisibleTagCount(10);
        // Load posts for tag
        const taggedPosts = await getPostsByTag(selectedTag, 0, 100);
        setTagPosts(taggedPosts);
        
        // Load matching page for the top
        const pageSlugs = await getTagPageSlugs(selectedTag);
        if (pageSlugs.length > 0) {
          const firstPage = await getPageBySlug(pageSlugs[0]);
          setTagPage(firstPage);
        } else {
          setTagPage(null);
        }
        
        window.scrollTo(0, 0);
      } else {
        setTagPosts([]);
        setTagPage(null);
      }
    };
    loadTagContent();
  }, [selectedTag]);

  useEffect(() => {
    const loadPost = async () => {
      if (selectedPostSlug) {
        const post = await getPostBySlug(selectedPostSlug);
        setCurrentPost(post);
        
        // Find adjacent posts from metadata
        const currentIndex = posts.findIndex(p => p.slug === selectedPostSlug);
        if (currentIndex !== -1) {
          setAdjacentPosts({
            prev: currentIndex > 0 ? posts[currentIndex - 1] : null,
            next: currentIndex < posts.length - 1 ? posts[currentIndex + 1] : null
          });
        }
        
        window.scrollTo(0, 0);
      } else {
        setCurrentPost(null);
        setAdjacentPosts({ next: null, prev: null });
      }
    };
    loadPost();
  }, [selectedPostSlug, posts]);

  useEffect(() => {
    const loadPage = async () => {
      if (selectedPageSlug) {
        const page = await getPageBySlug(selectedPageSlug);
        setCurrentPage(page);
        window.scrollTo(0, 0);
      } else {
        setCurrentPage(null);
      }
    };
    loadPage();
  }, [selectedPageSlug]);

  useEffect(() => {
    const loadAuthor = async () => {
      if (selectedAuthorSlug) {
        const author = await getAuthorBySlug(selectedAuthorSlug);
        setCurrentAuthor(author);
        window.scrollTo(0, 0);
      } else {
        setCurrentAuthor(null);
      }
    };
    loadAuthor();
  }, [selectedAuthorSlug]);

  const historyPosts = posts.filter(p => p.category === 'history');
  const allJournalPosts = posts.filter(p => p.category === 'journal');
  const visibleJournalPosts = allJournalPosts.slice(0, visibleJournalCount);

  const [pendingScroll, setPendingScroll] = useState(false);

  useEffect(() => {
    // If we've returned home and have a pending scroll request
    if (!selectedPostSlug && !selectedPageSlug && !selectedAuthorSlug && !selectedTag && pendingScroll) {
      const timer = setTimeout(() => {
        const element = document.getElementById('journal-section');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
          setPendingScroll(false);
        }
      }, 500); // Wait for transition animation
      return () => clearTimeout(timer);
    }
  }, [selectedPostSlug, selectedPageSlug, selectedAuthorSlug, pendingScroll]);

  const onHome = () => {
    window.scrollTo(0, 0);
    setSelectedPostSlug(null);
    setSelectedPageSlug(null);
    setSelectedAuthorSlug(null);
    setSelectedTag(null);
    setPendingScroll(false);
  };

  const scrollToBlog = () => {
    if (selectedPostSlug || selectedPageSlug || selectedAuthorSlug || selectedTag) {
      setPendingScroll(true);
      setSelectedPostSlug(null);
      setSelectedPageSlug(null);
      setSelectedAuthorSlug(null);
      setSelectedTag(null);
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
          setSelectedPageSlug(slug);
          setSelectedPostSlug(null);
          setSelectedAuthorSlug(null);
          setSelectedTag(null);
        }} 
        onHome={onHome} 
        onBlog={scrollToBlog} 
      />
      
      <main id="main-content" className="flex-grow">
        <AnimatePresence mode="wait">
          {selectedPostSlug && currentPost ? (
            <PostView 
              key={selectedPostSlug} 
              post={currentPost} 
              nextPost={adjacentPosts.next}
              prevPost={adjacentPosts.prev}
              onBack={onHome} 
              onNavigate={(slug) => {
                setSelectedPostSlug(slug);
                setSelectedPageSlug(null);
                setSelectedAuthorSlug(null);
                setSelectedTag(null);
              }}
              onNavigateAuthor={(slug) => {
                setSelectedAuthorSlug(slug);
                setSelectedPostSlug(null);
                setSelectedPageSlug(null);
                setSelectedTag(null);
              }}
              onSelectTag={(tag) => {
                setSelectedTag(tag);
                setSelectedPostSlug(null);
                setSelectedPageSlug(null);
                setSelectedAuthorSlug(null);
              }}
            />
          ) : selectedPageSlug && currentPage ? (
            <PageView 
              key={selectedPageSlug}
              page={currentPage}
              onBack={onHome}
            />
          ) : selectedAuthorSlug && currentAuthor ? (
            <AuthorView 
              key={selectedAuthorSlug}
              author={currentAuthor}
              onBack={onHome}
            />
          ) : selectedTag ? (
            <div key={`tag-${selectedTag}`} className="py-24 animate-in fade-in slide-in-from-bottom-5 duration-700">
              <div className="max-w-5xl mx-auto px-10 mb-20">
                <button
                  onClick={onHome}
                  className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors mb-12 uppercase font-bold tracking-[0.2em] text-[10px]"
                >
                  Palaa alkuun
                </button>
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-md">
                    Avainsana
                  </span>
                  <div className="h-[1px] w-12 bg-white/10" />
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-white mb-10">
                  <span className="text-brand-accent opacity-50">#</span>{selectedTag}
                </h1>

                {tagPage && (
                  <div className="markdown-body prose prose-stone prose-invert max-w-none border-b border-white/10 pb-20 mb-20">
                    <PageView page={tagPage} onBack={() => {}} inline />
                  </div>
                )}

                <div className="flex items-center gap-6 mb-12">
                  <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">Liittyvät artikkelit</span>
                  <div className="h-[1px] flex-grow bg-white/10" />
                </div>
              </div>

              <Timeline 
                posts={tagPosts.slice(0, visibleTagCount)} 
                onSelectPost={(slug) => {
                  setSelectedPostSlug(slug);
                  setSelectedPageSlug(null);
                  setSelectedAuthorSlug(null);
                  setSelectedTag(null);
                }}
                onSelectTag={(tag) => {
                  setSelectedTag(tag);
                  setSelectedPostSlug(null);
                  setSelectedPageSlug(null);
                  setSelectedAuthorSlug(null);
                }}
              />

              {visibleTagCount < tagPosts.length && (
                <div 
                  id="infinite-scroll-trigger" 
                  className="h-20 flex items-center justify-center mt-20"
                >
                  <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div key="timeline">
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
                        Kaava<span className="text-brand-accent">tieto</span><span className="text-white/20">malli.</span>
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
                          onClick={() => setSelectedAuthorSlug(editor.slug)}
                          className="group/profile bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-row items-center text-left hover:border-brand-accent/50 transition-all backdrop-blur-sm shadow-2xl relative overflow-hidden outline-none w-full max-w-[450px] lg:ml-auto"
                          aria-label={`Kirjoittaja-profiili: ${editor.name}`}
                        >
                          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mr-6 border border-white/10 group-hover/profile:border-brand-accent transition-colors relative z-10 shadow-xl flex-shrink-0">
                            <img 
                              src={editor.image} 
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
                  setSelectedPostSlug(slug);
                  setSelectedPageSlug(null);
                  setSelectedAuthorSlug(null);
                  setSelectedTag(null);
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
                  
                  <p className="text-2xl text-slate-400 max-w-xl font-medium leading-relaxed">
                    Merkintöjä digitalisoituvan rakennetun ympäristön suunnittelun mahdollistajilta. 
                    Tekstit edustavat kirjoittajien henkilökohtaisia mielipiteitä.
                  </p>
                </div>
                <Timeline 
                  posts={visibleJournalPosts} 
                  onSelectPost={(slug) => {
                    setSelectedPostSlug(slug);
                    setSelectedPageSlug(null);
                    setSelectedAuthorSlug(null);
                    setSelectedTag(null);
                  }} 
                  onSelectTag={(tag) => {
                    setSelectedTag(tag);
                    setSelectedPostSlug(null);
                    setSelectedPageSlug(null);
                    setSelectedAuthorSlug(null);
                  }}
                />
                
                {/* Infinite Scroll Trigger */}
                {visibleJournalCount < allJournalPosts.length && (
                  <div 
                    id="infinite-scroll-trigger" 
                    className="h-20 flex items-center justify-center"
                  >
                    <div className="flex gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}
