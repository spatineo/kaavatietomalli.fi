import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import { fi as fiLocale } from 'date-fns/locale';
import { Calendar, User, ArrowLeft, ArrowRight, Tag, MessageSquare, ChevronDown, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PostData, PostMetadata, getRelatedPostSlugs, getAllPostMetadata } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { resolveImageUrl } from '../lib/utils';
import { lazy, Suspense, useRef } from 'react';
import { getTracker } from '../services/analytics';
import { RelatedPosts } from './RelatedPosts';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));
const LazySyntaxHighlighter = lazy(() => import('./LazySyntaxHighlighter').then(module => ({ default: module.LazySyntaxHighlighter })));
const Giscus = lazy(() => import('@giscus/react'));

interface PostViewProps {
  post: PostData;
  onBack: () => void;
  nextPost?: PostMetadata | null;
  prevPost?: PostMetadata | null;
  onNavigate: (slug: string) => void;
  onNavigateAuthor: (slug: string) => void;
  onSelectTag: (tag: string) => void;
}

export function PostView({ post, onBack, nextPost, prevPost, onNavigate, onNavigateAuthor, onSelectTag }: PostViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [relatedPosts, setRelatedPosts] = useState<PostMetadata[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentStats, setCommentStats] = useState<{ count: number, lastDate: string | null } | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getTracker().trackPostView(post.slug, post.title, post.tags);
    getTracker().trackPageView(`${CONFIG.basePath}?post=${post.slug}`, post.title, post.tags);
    
    // Fetch related posts
    const loadRelated = async () => {
      const relatedSlugs = await getRelatedPostSlugs(post.slug, 3);
      if (relatedSlugs.length > 0) {
        const allMetadata = await getAllPostMetadata();
        const relatedMetadata = allMetadata.filter(m => relatedSlugs.includes(m.slug));
        // Sort by the order of slugs returned (which is already sorted by relevance)
        const sortedRelated = relatedSlugs
          .map(slug => relatedMetadata.find(m => m.slug === slug))
          .filter((m): m is PostMetadata => !!m);
        setRelatedPosts(sortedRelated);
      } else {
        setRelatedPosts([]);
      }
    };
    loadRelated();

    // Reset comments state when post changes, but keep open if giscus redirect param is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasGiscusParam = urlParams.has('giscus');
    setIsCommentsOpen(hasGiscusParam);
    setCommentStats(null);

    // Fetch Giscus stats from prebuilt giscus-stats.json to avoid CORS issues
    const fetchGiscusStats = async () => {
      try {
        const response = await fetch(`${CONFIG.basePath}content/giscus-stats.json`);
        if (response.ok) {
          const stats = await response.json();
          const postStats = stats[post.slug];
          if (postStats) {
            setCommentStats({
              count: postStats.count,
              lastDate: postStats.lastDate
            });
          }
        }
      } catch (e) {
        console.warn("Failed to fetch prebuilt Giscus stats.", e);
      }
    }
    fetchGiscusStats();
  }, [post.slug, post.title, post.tags]);

  useEffect(() => {
    const handleGiscusMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://giscus.app') return;
      
      const { data } = event;
      if (data && typeof data === 'object' && 'giscus' in data) {
        // Giscus has sent a message, meaning it has loaded and registered the token!
        // Now delete the "giscus" query parameter from the browser address bar and history
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('giscus')) {
          urlParams.delete('giscus');
          const newSearch = urlParams.toString();
          const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}${window.location.hash}`;
          window.history.replaceState(null, '', newUrl);
        }
      }
    };

    window.addEventListener('message', handleGiscusMessage);
    return () => {
      window.removeEventListener('message', handleGiscusMessage);
    };
  }, []);

  const handleToggleComments = () => {
    setIsCommentsOpen(!isCommentsOpen);
    if (!isCommentsOpen && commentsSectionRef.current) {
      setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-24 px-6 md:px-10"
    >
      <div className="flex flex-col gap-6 mb-20" role="navigation" aria-label={t.post.ariaLabel}>
        <div className="flex">
          <button
            onClick={onBack}
            className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
            aria-label={t.post.returnToList}
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t.common.backToHome}
          </button>
        </div>

        <div className="flex justify-between items-center w-full pt-4 border-t border-white/5">
          <div className="flex-1 flex justify-start">
            {nextPost ? (
              <button
                onClick={() => onNavigate(nextPost.slug)}
                className="flex items-center gap-2 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
                aria-label={`${t.post.previous} ${t.blog.timelineAria}: ${nextPost.title}`}
                title={nextPost.title}
              >
                <ArrowLeft size={14} />
                {t.post.previous}
              </button>
            ) : (
              <span className="flex items-center gap-2 text-slate-400/30 px-4 py-2 rounded-lg uppercase font-bold tracking-[0.2em] text-[10px]">
                {t.post.noPrevious}
              </span>
            )}
          </div>
          <div className="flex-1 flex justify-end">
            {prevPost ? (
              <button
                onClick={() => onNavigate(prevPost.slug)}
                className="flex items-center gap-2 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
                aria-label={`${t.post.next} ${t.blog.timelineAria}: ${prevPost.title}`}
                title={prevPost.title}
              >
                {t.post.next}
                <ArrowRight size={14} />
              </button>
            ) : (
              <span className="flex items-center gap-2 text-slate-400/30 px-4 py-2 rounded-lg uppercase font-bold tracking-[0.2em] text-[10px]">
                {t.post.noNext}
              </span>
            )}
          </div>
        </div>
      </div>

      <header className="mb-20">
        <div className="flex items-center gap-4 mb-10">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent bg-brand-accent/10 px-2 py-1 rounded-md">
            {!post.dateLabel ? (format(parseISO(post.date), 'd.M.yyyy')
            ) : (
              post.dateLabel
            )}
          </span>
          <div className="h-[1px] w-12 bg-white/10" />
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            {post.slug.toUpperCase()}
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tighter mb-12 text-white">
          {post.title}
        </h1>

        {post.coverImage && (
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl mb-20 shadow-2xl">
            <img
              src={resolveImageUrl(post.coverImage)}
              alt={`${t.post.illustrationAlt}: ${post.title}`}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-8 pb-10 border-b border-white/10">
          <button 
            onClick={() => post.authorSlug && onNavigateAuthor(post.authorSlug)}
            disabled={!post.authorSlug}
            className={`flex items-center gap-3 text-left transition-all ${post.authorSlug ? 'hover:text-brand-accent group/author' : 'cursor-default'}`}
          >
            <div className={`w-12 h-12 rounded-full bg-black text-white flex items-center justify-center text-xs font-black shadow-lg border border-white/10 ${post.authorSlug ? 'group-hover/author:border-brand-accent group-hover/author:scale-110 transition-all' : ''}`}>
              {post.author.charAt(0)}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">{t.post.author}</span>
              <span className="text-base font-bold text-white transition-colors group-hover/author:text-brand-accent leading-none">{post.author}</span>
            </div>
          </button>

          <div className="flex flex-wrap gap-4">
            {post.tags.map((tag) => (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 border border-white/10 px-3 py-1 rounded-md hover:border-brand-accent hover:text-brand-accent transition-all"
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="markdown-body prose prose-xl prose-stone">
        <ReactMarkdown
          urlTransform={(url) => resolveImageUrl(url)}
          components={{
            code({ node, className, children, ref, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (language === 'mermaid') {
                return (
                  <Suspense fallback={<div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs animate-pulse">{t.common.loadingChart}</div>}>
                    <Mermaid chart={String(children).replace(/\n$/, '')} />
                  </Suspense>
                );
              }

              return match ? (
                <div className="my-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-black text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-3 border-b border-white/5 text-white/40 flex justify-between items-center">
                    <span>{language}</span>
                    <span className="text-[8px] opacity-50">src/{post.slug}.md</span>
                  </div>
                  <Suspense fallback={
                    <div className="bg-black p-8 font-mono text-[14px] text-white/40">
                      {String(children).replace(/\n$/, '')}
                    </div>
                  }>
                    <LazySyntaxHighlighter
                      language={language}
                      PreTag="div"
                      customStyle={{
                        margin: 0,
                        padding: '2rem',
                        fontSize: '14px',
                        fontFamily: '"JetBrains Mono", monospace',
                        background: '#000000',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </LazySyntaxHighlighter>
                  </Suspense>
                </div>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            },
          }}
        >
          {post.content}
        </ReactMarkdown>
      </div>

      <div className="mt-32 pt-20 border-t border-white/5" ref={commentsSectionRef}>
        <button 
          onClick={handleToggleComments}
          className="w-full text-left group"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 flex-grow">
              <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">
                {t.post.comments}
              </span>
              <div className="h-[1px] w-12 bg-white/10" />
              
              <div className="hidden sm:flex items-center gap-6">
                {commentStats ? (
                  <>
                    <div className="flex items-center gap-2">
                      <MessageSquare size={12} className="text-slate-500" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        {t.post.commentCount.replace('{{count}}', commentStats.count.toString())}
                      </span>
                    </div>
                    {commentStats.lastDate && (
                      <div className="flex items-center gap-2">
                        <Clock size={12} className="text-slate-500" />
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                          {t.post.latestComment.replace('{{date}}', formatDistanceToNow(parseISO(commentStats.lastDate), { addSuffix: true, locale: fiLocale }))}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-40">
                    Giscus Discussions
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 pl-4 border-l border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-brand-accent transition-colors">
                {isCommentsOpen ? t.post.hideComments : t.post.showComments}
              </span>
              <ChevronDown 
                size={16} 
                className={`text-slate-500 transition-transform duration-500 group-hover:text-brand-accent ${isCommentsOpen ? 'rotate-180' : ''}`} 
              />
            </div>
          </div>
        </button>

        <AnimatePresence>
          {isCommentsOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-20">
                <Suspense fallback={
                  <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full border-2 border-brand-accent/20 border-t-brand-accent animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{t.common.loading}</span>
                  </div>
                }>
                  <Giscus 
                    key={post.slug}
                    repo={CONFIG.giscus.repo as any}
                    repoId={CONFIG.giscus.repoId}
                    category={CONFIG.giscus.category}
                    categoryId={CONFIG.giscus.categoryId}
                    mapping={CONFIG.giscus.mapping as any}
                    term={post.slug}
                    strict={CONFIG.giscus.strict as any}
                    reactionsEnabled={CONFIG.giscus.reactionsEnabled as any}
                    emitMetadata={CONFIG.giscus.emitMetadata as any}
                    inputPosition={CONFIG.giscus.inputPosition as any}
                    theme={CONFIG.giscus.theme as any}
                    lang={CONFIG.giscus.lang as any}
                    loading={CONFIG.giscus.loading as any}
                  />
                </Suspense>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {relatedPosts.length > 0 && (
        <div className={`pt-20 border-t border-white/5 max-w-4xl mx-auto transition-all duration-500 ${isCommentsOpen ? 'mt-40' : 'mt-12'}`}>
          <div className="flex items-center gap-6 mb-12">
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">
              {t.post.relatedPostsSection}
            </span>
            <div className="h-[1px] flex-grow bg-white/10" />
          </div>
          <RelatedPosts 
            posts={relatedPosts} 
            onSelectPost={onNavigate}
          />
        </div>
      )}

      <footer className={`pt-20 border-t border-white/10 transition-all duration-500 ${
        relatedPosts.length > 0
          ? 'mt-40'
          : (isCommentsOpen ? 'mt-40' : 'mt-12')
      }`}>
        <div className="grid md:grid-cols-2 gap-20">
          <div>
            <h3 className="text-3xl font-extrabold mb-6 tracking-tighter text-white">{t.common.footerTitle}</h3>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              {t.common.footerText}
            </p>
          </div>
          <div className="flex flex-col justify-end items-start md:items-end">
            <button
              onClick={onBack}
              className="group flex items-center gap-6 bg-black text-white border border-white/10 px-10 py-5 rounded-xl transition-all duration-300 hover:bg-brand-bg hover:border-brand-accent hover:text-brand-accent shadow-xl shadow-black/20"
            >
              <span className="uppercase font-bold tracking-widest text-xs">{t.common.backToHome}</span>
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </footer>
    </motion.article>
  );
}
