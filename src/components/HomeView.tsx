/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Timeline } from './Timeline';
import { HistoryHero } from './HistoryHero';
import { ContentFooter } from './ContentFooter';
import { PostMetadata, AuthorData } from '../lib/blog';
import { CONFIG, ThemeItem } from '../config';
import { resolveImageUrl } from '../lib/utils';
import { getTranslations, Language } from '../i18n';

interface HomeViewProps {
  posts: PostMetadata[];
  editor: AuthorData | null;
  selectedThemeTag: string | null;
  setSelectedThemeTag: (tag: string | null) => void;
  visibleJournalCount: number;
  onLoadMore: () => void;
  navigate: (view: { type: string; slug: string | null }) => void;
  onBlog: () => void;
}

export function HomeView({
  posts,
  editor,
  selectedThemeTag,
  setSelectedThemeTag,
  visibleJournalCount,
  onLoadMore,
  navigate,
  onBlog
}: HomeViewProps) {
  const t = getTranslations(CONFIG.language as Language);

  // Filter posts
  const historyPosts = useMemo(() => posts.filter(p => p.category === 'history'), [posts]);
  
  const allJournalPosts = useMemo(() => {
    return posts
      .filter(p => p.category === 'journal')
      .filter(p => !selectedThemeTag || p.tags.includes(selectedThemeTag));
  }, [posts, selectedThemeTag]);

  const visibleJournalPosts = useMemo(() => {
    return allJournalPosts.slice(0, visibleJournalCount);
  }, [allJournalPosts, visibleJournalCount]);

  // Set up local infinite scroll observer
  useEffect(() => {
    if (visibleJournalCount >= allJournalPosts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const target = document.getElementById('infinite-scroll-trigger-home');
    if (target) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [allJournalPosts.length, visibleJournalCount, onLoadMore]);

  return (
    <motion.div
      key="home-view"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
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
                <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">
                  {t.hero.subtitle}
                </span>
              </div>
              <h1 className="text-6xl md:text-[7rem] lg:text-[9rem] font-black tracking-tighter leading-[0.8] text-white">
                {t.hero.titleMain}<span className="text-brand-accent">{t.hero.titleAccent}</span><wbr /><span className="text-white/20"><wbr />{t.hero.titleMalli}</span>
              </h1>
            </motion.div>

            <div className="grid lg:grid-cols-[1fr_450px] gap-12 items-end">
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="text-xl md:text-3xl text-slate-400 max-w-3xl font-medium leading-[1.4] tracking-tight"
              >
                {t.hero.description}
              </motion.p>

              {editor && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  onClick={() => navigate({ type: 'author', slug: editor.slug })}
                  className="group/profile bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-row items-center text-left hover:border-brand-accent/50 transition-all backdrop-blur-sm shadow-2xl relative overflow-hidden outline-none w-full max-w-[450px] lg:ml-auto"
                  aria-label={`${t.common.author}: ${editor.name}`}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden mr-6 border border-white/10 group-hover/profile:border-brand-accent transition-colors relative z-10 shadow-xl flex-shrink-0">
                    <img
                      src={resolveImageUrl(editor.image)}
                      alt={editor.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/profile:scale-110"
                    />
                  </div>
                  <div className="relative z-10 flex-1 min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-brand-accent mb-1">{t.common.author}</p>
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
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">
              {t.blog.sectionSubtitle}
            </span>
            <div className="h-[1px] flex-grow bg-white/10" />
            <span className="text-[10px] font-mono text-slate-500">{t.hero.editorChief}: Ilkka Rinne / Spatineo</span>
          </div>

          <h2 className="text-6xl md:text-7xl font-black leading-[0.8] tracking-tighter mb-12 text-white">
            {t.blog.titleMain}<wbr /><span className="text-brand-accent">{t.blog.titleAccent}</span><wbr /><span className="text-white/30">{t.blog.titleBlogi}</span>
          </h2>

          <p className="text-2xl text-slate-400 max-w-xl font-medium leading-relaxed mb-12">
            {t.blog.description}
          </p>

          {CONFIG.themes && CONFIG.themes.length > 0 && (
            <div className="flex flex-col gap-6">
              <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-500 ml-1">{t.common.themes}</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setSelectedThemeTag(null);
                  }}
                  className={`px-6 py-3 rounded-xl uppercase font-bold tracking-widest text-[10px] transition-all border ${!selectedThemeTag
                    ? 'bg-brand-accent border-brand-accent text-brand-bg shadow-lg shadow-brand-accent/20'
                    : 'bg-white/5 border-white/10 text-slate-400 hover:border-brand-accent/30'
                    }`}
                >
                  {t.common.all}
                </button>
                {CONFIG.themes.map((theme: ThemeItem) => (
                  <button
                    key={theme.id}
                    onClick={() => {
                      setSelectedThemeTag(theme.tag);
                      // Scroll slightly to update visibility if needed
                      window.scrollBy(0, 1);
                    }}
                    className={`px-6 py-3 rounded-xl uppercase font-bold tracking-widest text-[10px] transition-all border ${selectedThemeTag === theme.tag
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
            id="infinite-scroll-trigger-home"
            className="min-h-32 flex flex-col items-center justify-center mt-20 gap-8"
          >
            <div className="flex gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <button
              onClick={onLoadMore}
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-brand-accent transition-colors border border-white/10 px-6 py-3 rounded-full hover:border-brand-accent/30"
            >
              {t.common.loadMore}
            </button>
          </div>
        )}
        <div className="max-w-4xl mx-auto px-6 md:px-10 mt-40">
          <ContentFooter onBack={onBlog} />
        </div>
      </div>
    </motion.div>
  );
}
