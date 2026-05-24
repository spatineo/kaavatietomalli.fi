import { useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { ContentFooter } from './ContentFooter';
import { PageData } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { resolveImageUrl } from '../lib/utils';
import { getTracker } from '../services/analytics';
import { CodeBlock } from './CodeBlock';

interface PageViewProps {
  page: PageData;
  onBack: () => void;
  inline?: boolean;
}

export function PageView({ page, onBack, inline = false }: PageViewProps) {
  const t = getTranslations(CONFIG.language as Language);

  useEffect(() => {
    if (!inline) {
      getTracker().trackPageView(`${CONFIG.basePath}?page=${page.slug}`, page.title);
    }
  }, [page.slug, page.title, inline]);

  if (inline) {
    return (
      <div className="markdown-body prose prose-xl prose-stone">
        <ReactMarkdown
          urlTransform={(url) => resolveImageUrl(url)}
          components={{
            code({ node, className, children, ref, ...props }: any) {
              return (
                <CodeBlock
                  className={className}
                  placeholderHeight="h-48"
                  {...props}
                >
                  {children}
                </CodeBlock>
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
              return (
                <CodeBlock
                  className={className}
                  placeholderHeight="h-64"
                  {...props}
                >
                  {children}
                </CodeBlock>
              );
            }
          }}
        >
          {page.content}
        </ReactMarkdown>
      </div>

      <ContentFooter onBack={onBack} className="mt-40" />
    </motion.article>
  );
}
