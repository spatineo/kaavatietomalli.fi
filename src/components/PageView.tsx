import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { ContentFooter } from './ContentFooter';
import { PageData } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { useHeadings, getUniqueHeadings, HeadingRegistryProvider, assignHeadingPrefixes } from './MarkdownHeading';
import { TableOfContents } from './TableOfContents';
import { MarkdownRenderer } from './RichMarkdownRenderer';

interface PageViewProps {
  page: PageData;
  onBack: () => void;
  inline?: boolean;
}

export function PageView({ page, onBack, inline = false }: PageViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  const headings = useHeadings(page.content);
  const combinedHeadings = useMemo(() => {
    const raw = getUniqueHeadings(page.title, headings);
    return assignHeadingPrefixes(raw, headings.length > 2);
  }, [page.title, headings]);
  const titleId = combinedHeadings[0].id;

  // Scroll to hash on load or page content update
  
  useEffect(() => {
    const scrollToHash = (smooth: boolean = true) => {
      if (window.location.hash) {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            if (smooth) {
              element.scrollIntoView({ behavior: 'smooth'});
            } else {
              element.scrollIntoView({ behavior: 'instant'});
            }
          }
        }
      }
    };

    const handleHashChange = () => scrollToHash(true);
    const handleMermaidRender = () => scrollToHash(false);

    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('mermaid-render-complete', handleMermaidRender);
    
    // Initial scroll trigger on mount/content change
    let timer: number | null = null;
    if (window.location.hash) {
      timer = window.setTimeout(() => scrollToHash(true), 100);
    }

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('mermaid-render-complete', handleMermaidRender);
      if (timer) {
        window.clearTimeout(timer);
      }
    };
  }, [page.content]);

  if (inline) {
    return (
      <HeadingRegistryProvider uniqueHeadings={combinedHeadings}>
        <div className="markdown-body prose prose-xl prose-stone">
          <MarkdownRenderer 
              markdownContent={page.content}
              slug={page.slug}
            >
            </MarkdownRenderer>
        </div>
      </HeadingRegistryProvider>
    );
  }

  return (
    <motion.article
      data-testid="page-view"
      data-test-slug={page.slug}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-5xl mx-auto py-24 px-6 lg:pl-20 lg:pr-6 md:px-10"
    >
      <HeadingRegistryProvider uniqueHeadings={combinedHeadings}>
        <button
          onClick={onBack}
          className="flex items-center gap-4 text-slate-400 hover:text-brand-accent transition-colors group px-4 py-2 rounded-lg hover:bg-white/5 uppercase font-bold tracking-[0.2em] text-[10px] mb-20"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          {t.common.backToHome}
        </button>

        <header className="mb-20">
          <h1 id={titleId} className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tighter mb-12 text-white scroll-mt-24">
            {page.title}
          </h1>
          <div className="h-1.5 w-24 bg-brand-accent rounded-full" />
        </header>

        <div className="relative">
          {headings.length > 2 && (
            <TableOfContents headings={combinedHeadings} />
          )}
          <div className="markdown-body prose prose-xl prose-stone">
            <MarkdownRenderer 
              markdownContent={page.content}
              slug={page.slug}
            >
            </MarkdownRenderer>
          </div>
        </div>

        <ContentFooter onBack={onBack} className="mt-40" />
      </HeadingRegistryProvider>
    </motion.article>
  );
}
