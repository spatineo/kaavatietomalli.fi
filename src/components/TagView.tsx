/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { motion } from 'motion/react';
import { Timeline } from './Timeline';
import { PageView } from './PageView';
import { ContentFooter } from './ContentFooter';
import { PostMetadata, PageData } from '../lib/blog';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface TagViewProps {
  tagSlug: string;
  isDataReady: boolean;
  tagPage: PageData | null;
  tagPosts: PostMetadata[];
  visibleTagCount: number;
  onLoadMore: () => void;
  navigate: (view: { type: string; slug: string | null }) => void;
  onHome: () => void;
}

export function TagView({
  tagSlug,
  isDataReady,
  tagPage,
  tagPosts,
  visibleTagCount,
  onLoadMore,
  navigate,
  onHome,
}: TagViewProps) {
  const t = getTranslations(CONFIG.language as Language);

  // Set up local infinite scroll observer
  useEffect(() => {
    if (!isDataReady || visibleTagCount >= tagPosts.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onLoadMore();
        }
      },
      { threshold: 0.1, rootMargin: '400px' }
    );

    const target = document.getElementById('infinite-scroll-trigger-tag');
    if (target) {
      observer.observe(target);
    }

    return () => observer.disconnect();
  }, [isDataReady, tagPosts.length, visibleTagCount, onLoadMore]);

  if (!isDataReady) {
    return (
      <motion.div
        key="tag-loader"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center"
      >
        <div className="flex gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      key={`tag-${tagSlug}`}
      data-testid="tag-view"
      data-test-slug={tagSlug}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      className="py-24"
    >
      <div className="max-w-5xl mx-auto px-10 mb-20">
        <button
          onClick={onHome}
          className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors mb-12 uppercase font-bold tracking-[0.2em] text-[10px]"
        >
          {t.common.backToHome}
        </button>
        <div className="flex items-center gap-4 mb-6">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-md">
            {t.blog.topic}
          </span>
          <div className="h-[1px] w-12 bg-white/10" />
        </div>
        <header className="mb-20">
          <h1 className="text-5xl md:text-8xl font-extrabold leading-[1.1] tracking-tighter mb-12 text-white">
            {tagPage ? (
              tagPage.title
            ) : (
              <>
                <span className="text-brand-accent opacity-50">#</span>
                {tagSlug}
              </>
            )}
          </h1>
          <div className="h-1.5 w-24 bg-brand-accent rounded-full" />
        </header>

        {tagPage && (
          <div className="markdown-body prose prose-stone prose-invert max-w-none border-b border-white/10 pb-20 mb-20">
            <PageView page={tagPage} onBack={() => {}} inline />
          </div>
        )}

        {tagPosts.length > 0 && (
          <div className="flex items-center gap-6 mb-12">
            <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-slate-500">
              {t.blog.relatedArticles}
            </span>
            <div className="h-[1px] flex-grow bg-white/10" />
          </div>
        )}
      </div>

      {tagPosts.length > 0 && (
        <Timeline
          posts={tagPosts.slice(0, visibleTagCount)}
          onSelectPost={(slug) => {
            navigate({ type: 'post', slug });
          }}
          onSelectTag={(tag) => {
            navigate({ type: 'tag', slug: tag });
          }}
        />
      )}

      {tagPosts.length > 0 && visibleTagCount < tagPosts.length && (
        <div
          id="infinite-scroll-trigger-tag"
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
        <ContentFooter onBack={onHome} />
      </div>
    </motion.div>
  );
}
