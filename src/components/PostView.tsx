import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { format, parseISO } from 'date-fns';
import { Calendar, User, ArrowLeft, ArrowRight, Tag } from 'lucide-react';
import { motion } from 'motion/react';
import { PostData, PostMetadata } from '../lib/blog';
import { CONFIG } from '../config';
import { SyntaxHighlighter, vscDarkPlus } from '../lib/syntax';
import { resolveImageUrl } from '../lib/utils';
import { lazy, Suspense } from 'react';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));

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
  useEffect(() => {
    // Add discovery link for LLMs
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'text/markdown';
    link.title = 'Raw Markdown';
    link.href = `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/refs/heads/main/src/content/posts/${post.slug}.md`;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [post.slug]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-24 px-6 md:px-10"
    >
      <div className="flex justify-between items-center mb-20" role="navigation" aria-label="Sivun sisäinen navigaatio">
        <button
          onClick={onBack}
          className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
          aria-label="Palaa artikkelilistaukseen"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Etusivulle
        </button>

        <div className="flex gap-4">
          {nextPost ? (
            <button
              onClick={() => onNavigate(nextPost.slug)}
              className="flex items-center gap-2 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
              aria-label={`Edellinen artikkeli: ${nextPost.title}`}
              title={nextPost.title}
            >
              <ArrowLeft size={14} />
              Edellinen
            </button>
          ) : (
            <span className="flex items-center gap-2 text-slate-400 transition-colors group px-4 py-2 rounded-lg uppercase font-bold tracking-[0.2em] text-[10px]">
            Ei edellistä
            </span>
          )}
          {prevPost ? (
            <button
              onClick={() => onNavigate(prevPost.slug)}
              className="flex items-center gap-2 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px]"
              aria-label={`Seuraava artikkeli: ${prevPost.title}`}
              title={prevPost.title}
            >
              Seuraava
              <ArrowRight size={14} />
            </button>
          ) : (
            <span className="flex items-center gap-2 text-slate-400 transition-colors group px-4 py-2 rounded-lg uppercase font-bold tracking-[0.2em] text-[10px]">
            Ei seuraavaa
            </span>
          )}
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
            {post.slug.toUpperCase()}.MD
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tighter mb-12 text-white">
          {post.title}
        </h1>

        {post.coverImage && (
          <div className="relative aspect-[21/9] overflow-hidden rounded-3xl mb-20 shadow-2xl">
            <img
              src={resolveImageUrl(post.coverImage)}
              alt={`Kuvituskuva artikkelille: ${post.title}`}
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
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Kirjoittaja</span>
              <span className="text-base font-bold text-white transition-colors group-hover/author:text-brand-accent leading-none">{post.author}</span>
            </div>
          </button>

          <div className="flex gap-4">
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
                  <Suspense fallback={<div className="h-64 flex items-center justify-center text-slate-500 font-mono text-xs animate-pulse">Ladataan kaaviota...</div>}>
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
                  <SyntaxHighlighter
                    style={vscDarkPlus as any}
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
                  </SyntaxHighlighter>
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

      <footer className="mt-40 pt-20 border-t border-white/10">
        <div className="grid md:grid-cols-2 gap-20">
          <div>
            <h3 className="text-3xl font-extrabold mb-6 tracking-tighter text-white">Kaavatietomalli.fi</h3>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Dokumentoimme digitaalista evoluutiota. Jokainen kirjoitus on tallenne yhteisen tietoperintömme historiassa.
            </p>
          </div>
          <div className="flex flex-col justify-end items-start md:items-end">
            <button
              onClick={onBack}
              className="group flex items-center gap-6 bg-black text-white border border-white/10 px-10 py-5 rounded-xl transition-all duration-300 hover:bg-brand-bg hover:border-brand-accent hover:text-brand-accent shadow-xl shadow-black/20"
            >
              <span className="uppercase font-bold tracking-widest text-xs">Etusivulle</span>
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </footer>
    </motion.article>
  );
}
