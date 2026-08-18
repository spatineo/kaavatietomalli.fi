import React, { lazy, Suspense, useState, useEffect } from 'react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertTriangle, ArrowRight } from 'lucide-react';
import { transpileInstanceToMermaid } from '../lib/instance-diagram-transpiler';
import { transpileDataModelSnippetToMermaid } from '../lib/data-model-diagram-generator';
import { FetchDataModelAccess } from '../lib/fetch-data-model-access';
import { useAppRouter } from '../hooks/useRouter';
import { getTracker } from '../services/analytics';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));
const LazySyntaxHighlighter = lazy(() => import('./LazySyntaxHighlighter').then(module => ({ default: module.LazySyntaxHighlighter })));
const VideoEmbed = lazy(() => import('./VideoEmbed').then(module => ({ default: module.VideoEmbed })));
const GeoJsonMapViewer = lazy(() => import('./GeoJSONMapViewer').then(module => ({ default: module.GeoJsonMapViewer })));

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

function parseCtaBlock(code: string): {
  url: string;
  buttonText: string;
  title: string;
  description?: string;
  partner?: string;
} {
  const config = parseVideoProperties(code);
  
  // Find case-insensitive or synonymous keys
  const keys = Object.keys(config);
  
  const findVal = (possibleKeys: string[]) => {
    const foundKey = keys.find(k => possibleKeys.includes(k.toLowerCase()));
    return foundKey ? String(config[foundKey]).trim() : undefined;
  };
  const url = findVal(['url', 'redirecturl', 'link', 'href', 'redirect']);
  const buttonText = findVal(['buttontext', 'label', 'button_text', 'text', 'btntext', 'nappiteksti', 'painiketeksti']);
  if (!url || !buttonText) {
    throw new Error("Properties 'url' and 'buttonText' are required for a CTA block");
  }
  return {
    url: url,
    buttonText: buttonText,
    title: findVal(['title', 'heading', 'otsikko']),
    description: findVal(['description', 'desc', 'kuvaus', 'textcontent']),
    partner: findVal(['partner', 'kumppani'])
  };
}


interface CTAProps {
  url: string,
  buttonText: string,
  title?: string,
  description?:string,
  partner?: string
}

export function CallToAction({
  url,
  buttonText,
  title,
  description,
  partner
}:CTAProps) {
  const { activeView } = useAppRouter();

  // Determine context string based on the active view type and slug
  const context = activeView.type !== 'home' && activeView.slug ? `${activeView.type}:${activeView.slug}` : undefined;

  const handleCtaClick = () => {
    getTracker().trackCTA(buttonText, url, context, partner);
  };

  return (
    <div className="cta-block my-10 p-8 md:p-10 rounded-3xl bg-gradient-to-br from-brand-muted to-[#17171a] border border-white/10 shadow-2xl relative overflow-hidden text-left max-w-xl" data-testid="cta-block">
      <div className="absolute top-0 right-0 w-32 h-32 bg-brand-accent/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
      
      {title && (
        <h4 className="text-xl md:text-2xl font-black text-white mb-4 mt-0 tracking-tight leading-tight" data-testid="cta-title">
          {title}
        </h4>
      )}
      
      {description && (
        <p className="cta-content text-slate-300 mb-8 text-sm md:text-base leading-relaxed font-sans font-normal max-w-xl" data-testid="cta-description">
          {description}
        </p>
      )}
      
      
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleCtaClick}
        className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-accent text-brand-primary rounded-xl font-bold uppercase tracking-widest text-[10px] hover:opacity-90 transition-opacity shadow-lg shadow-brand-accent/5 leading-none"
        data-testid="cta-button"
      >
        {buttonText}
        <ArrowRight size={12} className="stroke-[2.5]" />
      </a>
    </div>
  );
}

export function CallToActionBlock({ code }: { code: string }) {
  try {
    const properties = parseCtaBlock(code);
    return CallToAction(properties);
  } catch(error) {
    return (
      <div className="my-6 p-6 rounded-2xl border border-amber-500/20 bg-amber-950/10 text-left">
        <p className="text-xs text-amber-400">
          Virheellinen Call-to-Action -lohko: 'url' ja 'buttonText' ovat pakollisia kenttiä.
        </p>
      </div>
    );
  }
}

function BlockFallback({ language, code }: { language: string; code: string }) {
  const t = getTranslations(CONFIG.language as Language);
  return (
    <div className="my-6 p-6 rounded-2xl border border-red-500/20 bg-red-950/10 text-left">
      <div className="flex items-center gap-3 text-red-400 mb-3 font-semibold text-sm">
        <AlertTriangle size={18} />
        <span>{t.errorBoundary.blockError} ({language})</span>
      </div>
      <p className="text-xs text-slate-400 mb-4 leading-normal">
        Rakennetiedon tai esityksen renderöinnissä tapahtui virhe.
      </p>
      <details className="text-xs">
        <summary className="text-brand-accent/80 hover:text-brand-accent cursor-pointer select-none font-bold mb-2">
          Näytä raakateksti / Show source
        </summary>
        <pre className="text-[11px] font-mono bg-black/50 text-slate-300 p-4 rounded-xl border border-white/5 overflow-x-auto max-h-48">
          {code}
        </pre>
      </details>
    </div>
  );
}

function DataModelSnippetBlock({ code, placeholderHeight, language, fallbackText }: { code: string; placeholderHeight?: string; language: string; fallbackText: string }) {
  const [chartData, setChartData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const access = new FetchDataModelAccess();
    transpileDataModelSnippetToMermaid(code, access)
      .then(res => {
        if (active) setChartData(res);
      })
      .catch(err => {
        if (active) setError(err?.message || 'Diagram generation failed');
      });
    return () => { active = false; };
  }, [code]);

  if (error) {
    return <BlockFallback language={language} code={code} />;
  }

  if (!chartData) {
    const fallbackHeightClass = placeholderHeight === 'h-48' ? 'h-48' : placeholderHeight === 'h-56' ? 'h-56' : 'h-64';
    return (
      <div className={`${fallbackHeightClass} flex items-center justify-center text-slate-500 font-mono text-[10px] animate-pulse`}>
        {fallbackText}
      </div>
    );
  }

  return <Mermaid chart={chartData} />;
}

export function CodeBlock({
  className,
  children,
  filePath,
  placeholderHeight = 'h-64',
  ...props
}: CodeBlockProps) {
  const t = getTranslations(CONFIG.language as Language);
  const match = /language-([a-zA-Z0-9_-]+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children || '').replace(/\n$/, '');

  if (language === 'geojson' || language === 'jsonfg') {
    const fallbackHeightClass = placeholderHeight === 'h-48' ? 'h-48' : placeholderHeight === 'h-56' ? 'h-56' : 'h-64';
    return (
      <ErrorBoundary fallback={<BlockFallback language={language} code={codeContent} />}>
        <Suspense
          fallback={
            <div className={`${fallbackHeightClass} flex flex-col items-center justify-center gap-4 bg-slate-950/90 rounded-2xl border border-white/5 animate-pulse`}>
              <div className="w-8 h-8 rounded-full border border-white/10 border-t-[#FFAF00] animate-spin" />
            </div>
          }
        >
          <GeoJsonMapViewer code={codeContent} language={language} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (language === 'youtube' || language === 'vimeo') {
    const config = parseVideoProperties(codeContent);
    const fallbackHeightClass = placeholderHeight === 'h-48' ? 'h-48' : placeholderHeight === 'h-56' ? 'h-56' : 'h-64';
    return (
      <ErrorBoundary fallback={<BlockFallback language={language} code={codeContent} />}>
        <Suspense
          fallback={
            <div className={`${fallbackHeightClass} flex flex-col items-center justify-center gap-4 bg-slate-950/90 rounded-2xl border border-white/5 animate-pulse`}>
              <div className="w-8 h-8 rounded-full border border-white/10 border-t-brand-accent animate-spin" />
            </div>
          }
        >
          <VideoEmbed platform={language as 'youtube' | 'vimeo'} config={config} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (language === 'mermaid' || language === 'instance' || language === 'mermaid-instance') {
    const isCustomInstance = language === 'instance' || language === 'mermaid-instance';
    const chartData = isCustomInstance ? transpileInstanceToMermaid(codeContent) : codeContent;
    const fallbackHeightClass = placeholderHeight === 'h-48' ? 'h-48' : placeholderHeight === 'h-56' ? 'h-56' : 'h-64';
    return (
      <ErrorBoundary fallback={<BlockFallback language={language} code={codeContent} />}>
        <Suspense
          fallback={
            <div className={`${fallbackHeightClass} flex items-center justify-center text-slate-500 font-mono text-[10px] animate-pulse`}>
              {t.common.loadingChart}
            </div>
          }
        >
          <Mermaid chart={chartData} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (language === 'call-to-action' || language === 'cta') {
    return (
      <ErrorBoundary fallback={<BlockFallback language={language} code={codeContent} />}>
        <CallToActionBlock code={codeContent} />
      </ErrorBoundary>
    );
  }

  if (language === 'data-model-snippet') {
    return (
      <ErrorBoundary fallback={<BlockFallback language={language} code={codeContent} />}>
        <Suspense
          fallback={
            <div className={`${placeholderHeight} flex items-center justify-center text-slate-500 font-mono text-[10px] animate-pulse`}>
              {t.common.loadingChart}
            </div>
          }
        >
          <DataModelSnippetBlock code={codeContent} placeholderHeight={placeholderHeight} language={language} fallbackText={t.common.loadingChart} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  if (match) {
    return (
      <div className="my-10 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="bg-black text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-3 border-b border-white/5 text-white/40 flex justify-between items-center">
          <span>{language}</span>
          {filePath && <span className="text-[8px] opacity-50">{filePath}</span>}
        </div>
        <ErrorBoundary fallback={<BlockFallback language={language} code={codeContent} />}>
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
        </ErrorBoundary>
      </div>
    );
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  );
}
