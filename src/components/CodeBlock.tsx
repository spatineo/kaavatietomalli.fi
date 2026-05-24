import { lazy, Suspense } from 'react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));
const LazySyntaxHighlighter = lazy(() => import('./LazySyntaxHighlighter').then(module => ({ default: module.LazySyntaxHighlighter })));

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  filePath?: string;
  placeholderHeight?: 'h-48' | 'h-56' | 'h-64';
  [key: string]: any;
}

export function CodeBlock({
  className,
  children,
  filePath,
  placeholderHeight = 'h-64',
  ...props
}: CodeBlockProps) {
  const t = getTranslations(CONFIG.language as Language);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children || '').replace(/\n$/, '');

  if (language === 'mermaid') {
    const fallbackHeightClass = placeholderHeight === 'h-48' ? 'h-48' : placeholderHeight === 'h-56' ? 'h-56' : 'h-64';
    return (
      <Suspense
        fallback={
          <div className={`${fallbackHeightClass} flex items-center justify-center text-slate-500 font-mono text-[10px] animate-pulse`}>
            {t.common.loadingChart}
          </div>
        }
      >
        <Mermaid chart={codeContent} />
      </Suspense>
    );
  }

  if (match) {
    return (
      <div className="my-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-black text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-3 border-b border-white/5 text-white/40 flex justify-between items-center">
          <span>{language}</span>
          {filePath && <span className="text-[8px] opacity-50">{filePath}</span>}
        </div>
        <Suspense
          fallback={
            <div className="bg-black p-8 font-mono text-[14px] text-white/40">
              {codeContent}
            </div>
          }
        >
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
            {codeContent}
          </LazySyntaxHighlighter>
        </Suspense>
      </div>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
