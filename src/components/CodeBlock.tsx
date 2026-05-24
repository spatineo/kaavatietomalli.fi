import { lazy, Suspense } from 'react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));
const LazySyntaxHighlighter = lazy(() => import('./LazySyntaxHighlighter').then(module => ({ default: module.LazySyntaxHighlighter })));
const VideoEmbed = lazy(() => import('./VideoEmbed').then(module => ({ default: module.VideoEmbed })));

interface CodeBlockProps {
  className?: string;
  children?: React.ReactNode;
  filePath?: string;
  placeholderHeight?: 'h-48' | 'h-56' | 'h-64';
  [key: string]: any;
}

function parseVideoProperties(content: string): Record<string, any> {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fallback to custom key-value parsing
    }
  }

  const config: Record<string, any> = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
      continue;
    }
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
      continue; // Skip lines without colons gracefully
    }
    const key = trimmedLine.substring(0, colonIndex).trim();
    const valString = trimmedLine.substring(colonIndex + 1).trim();

    let value: any = valString;
    if (valString.toLowerCase() === 'true') {
      value = true;
    } else if (valString.toLowerCase() === 'false') {
      value = false;
    } else if (/^\d+$/.test(valString)) {
      value = parseInt(valString, 10);
    } else if (/^\d*\.\d+$/.test(valString)) {
      value = parseFloat(valString);
    } else if (valString.startsWith('"') && valString.endsWith('"')) {
      value = valString.slice(1, -1);
    } else if (valString.startsWith("'") && valString.endsWith("'")) {
      value = valString.slice(1, -1);
    }
    config[key] = value;
  }
  return config;
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

  if (language === 'youtube' || language === 'vimeo') {
    const config = parseVideoProperties(codeContent);
    const fallbackHeightClass = placeholderHeight === 'h-48' ? 'h-48' : placeholderHeight === 'h-56' ? 'h-56' : 'h-64';
    return (
      <Suspense
        fallback={
          <div className={`${fallbackHeightClass} flex flex-col items-center justify-center gap-4 bg-slate-950/90 rounded-2xl border border-white/5 animate-pulse`}>
            <div className="w-8 h-8 rounded-full border border-white/10 border-t-brand-accent animate-spin" />
          </div>
        }
      >
        <VideoEmbed platform={language as 'youtube' | 'vimeo'} config={config} />
      </Suspense>
    );
  }

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
