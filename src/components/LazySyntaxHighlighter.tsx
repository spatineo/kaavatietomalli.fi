import { useState, useEffect } from 'react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface LazySyntaxHighlighterProps {
  language: string;
  children: string;
  [key: string]: any;
}

let SyntaxHighlighter: any = null;
let vscDarkPlus: any = null;
const registeredLanguages = new Set<string>();

async function loadSyntaxHighlighter() {
  if (SyntaxHighlighter) return { SyntaxHighlighter, vscDarkPlus };

  const [
    { PrismLight },
    { default: vscDarkPlusStyle }
  ] = await Promise.all([
    import('react-syntax-highlighter/dist/cjs/index'),
    import('react-syntax-highlighter/dist/cjs/styles/prism/vsc-dark-plus')
  ]);

  SyntaxHighlighter = PrismLight;
  vscDarkPlus = vscDarkPlusStyle;
  return { SyntaxHighlighter, vscDarkPlus };
}

async function getLanguageDefinition(lang: string) {
  const mapping: Record<string, string> = {
    'javascript': 'javascript',
    'js': 'javascript',
    'typescript': 'typescript',
    'ts': 'typescript',
    'bash': 'bash',
    'sh': 'bash',
    'markdown': 'markdown',
    'md': 'markdown',
    'css': 'css',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'markup',
    'markup': 'markup',
    'html': 'markup'
  };

  const realLang = mapping[lang] || lang;
  
  // These are common ones we could support. 
  // For others, Prism might have them but we need to import them specifically.
  try {
    switch (realLang) {
      case 'javascript': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/javascript')).default;
      case 'typescript': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/typescript')).default;
      case 'bash': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/bash')).default;
      case 'markdown': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/markdown')).default;
      case 'css': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/css')).default;
      case 'json': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/json')).default;
      case 'yaml': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/yaml')).default;
      case 'markup': return (await import('react-syntax-highlighter/dist/cjs/languages/prism/markup')).default;
      default: return null;
    }
  } catch (e) {
    console.warn(`Failed to load language: ${realLang}`, e);
    return null;
  }
}

export function LazySyntaxHighlighter({ language, children, ...props }: LazySyntaxHighlighterProps) {
  const [ready, setReady] = useState(false);
  const t = getTranslations(CONFIG.language as Language);

  useEffect(() => {
    let ignore = false;
    
    async function init() {
      const { SyntaxHighlighter: SH } = await loadSyntaxHighlighter();
      const langDef = await getLanguageDefinition(language);
      
      if (!ignore) {
        if (langDef && !registeredLanguages.has(language)) {
          SH.registerLanguage(language, langDef);
          registeredLanguages.add(language);
        }
        setReady(true);
      }
    }

    init();
    return () => { ignore = true; };
  }, [language]);

  if (!ready) {
    return (
      <div className="bg-black p-8 font-mono text-[14px] text-white/40 animate-pulse">
        {children}
      </div>
    );
  }

  const Comp = SyntaxHighlighter;
  return (
    <Comp
      style={vscDarkPlus}
      language={language}
      {...props}
    >
      {children}
    </Comp>
  );
}
