import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { format, parseISO } from 'date-fns';
import { ArrowLeft, ArrowRight, Award } from 'lucide-react';
import { motion } from 'motion/react';
import { PostData, PostMetadata, getRelatedPostSlugs, getAllPostMetadata, getAuthorBySlug } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { resolveImageUrl } from '../lib/utils';
import { getTracker } from '../services/analytics';
import { RelatedPosts } from './RelatedPosts';
import { ContentFooter } from './ContentFooter';

import { CodeBlock } from './CodeBlock';
import { PostComments } from './PostComments';

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
  const [authorImg, setAuthorImg] = useState<string | null>(null);

  useEffect(() => {
    if (post.authorSlug) {
      getAuthorBySlug(post.authorSlug).then(authorData => {
        if (authorData && authorData.image) {
          setAuthorImg(authorData.image);
        } else {
          setAuthorImg(null);
        }
      }).catch(() => {
        setAuthorImg(null);
      });
    } else {
      setAuthorImg(null);
    }
  }, [post.authorSlug]);

  useEffect(() => {
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
  }, [post.slug]);

  const isSponsored = !!post.promotional;
  const partnerName = post.partner || '';

  return (
    <motion.article
      data-testid="post-view"
      data-test-slug={post.slug}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto pt-4 pb-24 px-6 md:px-10 relative"
    >
      {isSponsored && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-b from-amber-500/5 via-amber-500/0 to-transparent blur-3xl pointer-events-none -z-10" />
      )}

      <div className="flex flex-col gap-3 mb-10" role="navigation" aria-label={t.post.ariaLabel}>
        <div className="flex">
          <button
            onClick={onBack}
            data-testid="back-to-home-btn"
            className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
            aria-label={t.post.returnToList}
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            {t.common.backToHome}
          </button>
          <div className="flex items-right text-slate-400 font-bold justify-end w-full py-2">
            <span className="text-white">{t.blog.titleMain}</span><wbr /><span className="text-brand-accent">{t.blog.titleAccent}</span><wbr /><span className="text-white/30">{t.blog.titleBlogi}</span>
          </div>
        </div>

        <div className="flex justify-between items-center w-full pt-3 border-t border-white/5">
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
      <div className="relative">
        <header className="mb-12 border-b border-white/10 pb-6">
          {isSponsored && (
            <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-amber-400/5 border border-amber-400/10 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-400 shrink-0">
                  <Award size={18} className="stroke-[2]" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-extrabold tracking-[0.15em] text-amber-400 leading-none mb-1.5">
                    {t.post.commercialCooperation}
                  </p>
                  <p className="text-sm text-slate-300 font-sans italic leading-normal">
                    {t.post.commercialCooperationIntro}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                {partnerName && (
                  <span className="text-[10px] font-black tracking-widest text-amber-400 uppercase px-3 py-1.5 rounded-md bg-amber-400/10 border border-amber-400/20">
                    {partnerName}
                  </span>
                )}
              </div>
            </div>
          )}

          <h1 className={`text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-[0.01em] mb-8 ${isSponsored ? 'text-amber-50 font-sans font-extrabold' : 'text-white font-serif font-medium'}`}>
            {post.title}
          </h1>

          {post.coverImage && (
            <div className={`relative aspect-[21/9] overflow-hidden rounded-3xl mb-8 shadow-2xl ${isSponsored ? 'border border-amber-400/15' : ''}`}>
              <img
                src={resolveImageUrl(post.coverImage)}
                alt={`${t.post.illustrationAlt}: ${post.title}`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-6 mt-6 border-t border-white/5 text-[10px] uppercase font-bold text-slate-400">
            {!isSponsored && (
              <>
                <button
                  onClick={() => post.authorSlug && onNavigateAuthor(post.authorSlug)}
                  disabled={!post.authorSlug}
                  className={`lg:hidden font-black uppercase tracking-[0.2em] transition-colors leading-none ${post.authorSlug ? 'text-white hover:text-brand-accent' : 'text-slate-400 cursor-default'}`}
                >
                  {post.author}
                </button>
                <div className="h-3 w-[1px] bg-white/10 lg:hidden" />
              </>
            )}

            <span className={isSponsored 
              ? "text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-md"
              : "text-[10px] font-bold uppercase tracking-[0.2em] text-brand-accent bg-brand-accent/10 px-2.5 py-1 rounded-md"
            }>
              {!post.dateLabel ? (format(parseISO(post.date), 'd.M.yyyy')) : (post.dateLabel)}
            </span>
          

            {post.tags.length > 0 && (
              <>
                <div className="h-3 w-[1px] bg-white/10" />
                <div className="flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => onSelectTag(tag)}
                      className="text-[9px] font-bold uppercase tracking-widest text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-md hover:border-brand-accent hover:text-brand-accent transition-all leading-none"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </header>
        {!isSponsored && authorImg && (
          <div className="hidden lg:block absolute right-full mr-12 top-2 text-center w-28">
            <button
              onClick={() => post.authorSlug && onNavigateAuthor(post.authorSlug)}
              disabled={!post.authorSlug}
              className={`w-24 h-24 rounded-full overflow-hidden border-2 border-white/10 shadow-2xl flex items-center justify-center bg-black/40 mx-auto ${post.authorSlug ? 'hover:border-brand-accent hover:scale-105 transition-all' : 'cursor-default'}`}
              title={post.author}
            >
              <img
                src={resolveImageUrl(authorImg)}
                alt={post.author}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </button>
            <div className="mt-3">
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500 mb-1 block leading-none">{t.post.author}</span>
              <button
                onClick={() => post.authorSlug && onNavigateAuthor(post.authorSlug)}
                disabled={!post.authorSlug}
                className={`text-sm font-black uppercase tracking-wider transition-colors text-center w-full block ${post.authorSlug ? 'text-white hover:text-brand-accent' : 'text-slate-300 cursor-default'}`}
              >
                {post.author}
              </button>
            </div>
          </div>
        )}
      </div>
      <div className={`markdown-body prose prose-xl prose-stone ${isSponsored ? 'journal-sponsored' : 'journal-normal'}`}>
        <ReactMarkdown
        urlTransform={(url) => resolveImageUrl(url)}
        components={{
          pre({ node, children, ...props }: any) {
            const codeEl = children && (children as any).props;
            const className = codeEl?.className || '';
            const isInteractive = /language-(geojson|jsonfg|mermaid|youtube|vimeo)/.test(className);
            
            if (isInteractive) {
              return <>{children}</>;
            }
            return <pre {...props}>{children}</pre>;
          },
          code({ node, className, children, ref, ...props }: any) {
            return (
              <CodeBlock
                className={className}
                filePath={`src/${post.slug}.md`}
                placeholderHeight="h-64"
                {...props}
              >
                {children}
              </CodeBlock>
            );
          },
        }}
      >
        {post.content}
        </ReactMarkdown>
      </div>
      {isSponsored && (
        <div className="mt-16 p-6 md:p-8 rounded-2xl bg-gradient-to-br from-brand-muted to-[#17171a] border border-amber-400/10 flex flex-col sm:flex-row items-center gap-6 sm:justify-between text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <div className="space-y-2">
            <h4 className="text-lg font-bold text-amber-400 flex items-center gap-2 font-sans">
              <Award size={18} className="stroke-[2.5]" />
              {t.post.aboutCommercialCooperation}
            </h4>
            <p className="text-sm text-slate-300 max-w-xl leading-relaxed font-sans italic">
              {t.post.aboutCommercialCooperationText.replace('{{partner}}', partnerName ? `${partnerName}:n` : 'kumppanin')}
            </p>
          </div>
          {post.callToAction && (
            <div className="flex flex-col sm:flex-row items-center gap-4 shrink-0 w-full sm:w-auto">
              <a
                href={post.callToAction}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => getTracker().trackCTA(t.post.callToActionLabel, post.callToAction, `post:${post.slug}`, post.partner)}
                className="w-full sm:w-auto px-5 py-2.5 bg-amber-400 text-black border border-amber-400/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-500 transition-all shadow-lg shadow-amber-400/5 text-center leading-none flex items-center justify-center gap-2 h-[42px]"
              >
                {t.post.callToActionLabel}
                <ArrowRight size={12} className="stroke-[2.5]" />
              </a>
            </div>
          )}
        </div>
      )}

      {!isSponsored && (
        <PostComments
          postSlug={post.slug}
          onToggleOpen={setIsCommentsOpen}
        />
      )}

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

      <ContentFooter
        onBack={onBack}
        className={relatedPosts.length > 0 ? 'mt-40' : (isCommentsOpen ? 'mt-40' : 'mt-12')}
      />
    </motion.article>
  );
}
