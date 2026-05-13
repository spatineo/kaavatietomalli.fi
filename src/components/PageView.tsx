import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { PageData } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { SyntaxHighlighter, vscDarkPlus } from '../lib/syntax';
import { resolveImageUrl } from '../lib/utils';
import { lazy, Suspense } from 'react';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));

interface PageViewProps {
  page: PageData;
  onBack: () => void;
  inline?: boolean;
}

export function PageView({ page, onBack, inline = false }: PageViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  useEffect(() => {
    if (inline) return;

    // Add discovery link for LLMs
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.type = 'text/markdown';
    link.title = 'Raw Markdown';
    link.href = `https://raw.githubusercontent.com/${CONFIG.repoOwner}/${CONFIG.repoName}/refs/heads/main/src/content/pages/${page.slug}.md`;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, [page.slug, inline]);

  if (inline) {
    return (
      <div className="markdown-body prose prose-xl prose-stone">
        <ReactMarkdown
          urlTransform={(url) => resolveImageUrl(url)}
          components={{
            code({ node, className, children, ref, ...props }: any) {
              const match = /language-(\w+)/.exec(className || '');
              const language = match ? match[1] : '';

              if (language === 'mermaid') {
                return (
                  <Suspense fallback={<div className="h-48 flex items-center justify-center text-slate-500 font-mono text-[10px] animate-pulse">{t.common.loadingChart}</div>}>
                    <Mermaid chart={String(children).replace(/\n$/, '')} />
                  </Suspense>
                );
              }

              return match ? (
                <div className="my-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-black text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-3 border-b border-white/5 text-white/40 flex justify-between items-center">
                    <span>{language}</span>
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
            }
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>
    );
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-24 px-6 md:px-10"
    >
      <button
        onClick={onBack}
        className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px] mb-20"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        {t.common.backToHome}
      </button>

      <header className="mb-20">
        <h1 className="text-5xl md:text-8xl font-extrabold leading-[1.1] tracking-tighter mb-12 text-white">
          {page.title}
        </h1>
        <div className="h-1.5 w-24 bg-brand-accent rounded-full" />
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
                  <Suspense fallback={<div className="h-64 flex items-center justify-center text-slate-500 font-mono text-[10px] animate-pulse">{t.common.loadingChart}</div>}>
                    <Mermaid chart={String(children).replace(/\n$/, '')} />
                  </Suspense>
                );
              }

              return match ? (
                <div className="my-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                  <div className="bg-black text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-3 border-b border-white/5 text-white/40 flex justify-between items-center">
                    <span>{language}</span>
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
            }
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>

      <footer className="mt-40 pt-20 border-t border-white/10">
        <div className="flex flex-col items-center text-center">
          <h3 className="text-3xl font-extrabold mb-4 text-white">{t.common.footerTitle}</h3>
          <p className="text-slate-400 font-medium max-w-lg mb-8">
            {t.common.footerText}
          </p>
          <button
            onClick={onBack}
            className="bg-black text-white border border-white/10 px-10 py-4 rounded-xl transition-all duration-300 hover:bg-brand-bg hover:border-brand-accent hover:text-brand-accent shadow-xl shadow-black/20 uppercase font-bold tracking-widest text-[10px]"
          >
            {t.common.backToHome}
          </button>
        </div>
      </footer>
    </motion.article>
  );
}
