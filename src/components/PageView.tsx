import ReactMarkdown from 'react-markdown';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo } from 'react';
import { ContentFooter } from './ContentFooter';
import { PageData } from '../lib/blog';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { resolveImageUrl } from '../lib/utils';
import { CodeBlock } from './CodeBlock';
import { MarkdownHeading, useHeadings, slugify, getUniqueHeadings, HeadingRegistryProvider } from './MarkdownHeading';
import { TableOfContents } from './TableOfContents';

interface PageViewProps {
  page: PageData;
  onBack: () => void;
  inline?: boolean;
}

export function PageView({ page, onBack, inline = false }: PageViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  const headings = useHeadings(page.content);
  const combinedHeadings = useMemo(() => {
    return getUniqueHeadings(page.title, headings);
  }, [page.title, headings]);
  const titleId = combinedHeadings[0].id;

  // Scroll to hash on load or page content update
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const hash = decodeURIComponent(window.location.hash.substring(1));
        if (hash) {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    
    // Initial check with tiny timeout to let markdown render
    if (window.location.hash) {
      const timer = setTimeout(handleHashChange, 350);
      return () => {
        window.removeEventListener('hashchange', handleHashChange);
        clearTimeout(timer);
      };
    }

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [page.content]);

  if (inline) {
    return (
      <HeadingRegistryProvider uniqueHeadings={combinedHeadings}>
        <div className="markdown-body prose prose-xl prose-stone">
          <ReactMarkdown
            urlTransform={(url) => resolveImageUrl(url)}
            components={{
              h1({ children }: any) { return <MarkdownHeading level={1}>{children}</MarkdownHeading>; },
              h2({ children }: any) { return <MarkdownHeading level={2}>{children}</MarkdownHeading>; },
              h3({ children }: any) { return <MarkdownHeading level={3}>{children}</MarkdownHeading>; },
              h4({ children }: any) { return <MarkdownHeading level={4}>{children}</MarkdownHeading>; },
              h5({ children }: any) { return <MarkdownHeading level={5}>{children}</MarkdownHeading>; },
              h6({ children }: any) { return <MarkdownHeading level={6}>{children}</MarkdownHeading>; },
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
      className="max-w-6xl lg:ml-40 ml-10 mr-auto py-24 px-6 md:px-10"
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
            <ReactMarkdown
              urlTransform={(url) => resolveImageUrl(url)}
              components={{
                h1({ children }: any) { return <MarkdownHeading level={1}>{children}</MarkdownHeading>; },
                h2({ children }: any) { return <MarkdownHeading level={2}>{children}</MarkdownHeading>; },
                h3({ children }: any) { return <MarkdownHeading level={3}>{children}</MarkdownHeading>; },
                h4({ children }: any) { return <MarkdownHeading level={4}>{children}</MarkdownHeading>; },
                h5({ children }: any) { return <MarkdownHeading level={5}>{children}</MarkdownHeading>; },
                h6({ children }: any) { return <MarkdownHeading level={6}>{children}</MarkdownHeading>; },
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
        </div>

        <ContentFooter onBack={onBack} className="mt-40" />
      </HeadingRegistryProvider>
    </motion.article>
  );
}
