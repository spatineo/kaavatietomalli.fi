import { useState, useEffect, useRef } from 'react';
import { Search, Loader2, BookOpen, FileText, User, Home, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOramaSearch } from '../hooks/useOramaSearch';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

interface NotFoundViewProps {
  missingSlug?: string;
  onNavigate: (type: 'post' | 'page' | 'author', slug: string) => void;
  onHome: () => void;
}

export function NotFoundView({ missingSlug, onNavigate, onHome }: NotFoundViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  const { performSearch, isInitializing } = useOramaSearch();
  
  // Initialize query from missingSlug if available
  const [query, setQuery] = useState(() => {
    if (missingSlug) {
      // Tokenize slug: replace hyphens and underscores with spaces
      return missingSlug.replace(/[-_]/g, ' ');
    }
    return '';
  });

  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update query if missingSlug changes while component is mounted
  useEffect(() => {
    if (missingSlug) {
      setQuery(missingSlug.replace(/[-_]/g, ' '));
    }
  }, [missingSlug]);

  useEffect(() => {
    const handleSearch = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }
      setIsSearching(true);
      const searchResults = await performSearch(query);
      setResults(searchResults);
      setIsSearching(false);
    };

    const timeout = setTimeout(handleSearch, 300);
    return () => clearTimeout(timeout);
  }, [query, performSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleResultClick = (type: string, slug: string) => {
    onNavigate(type as any, slug);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'post': return <BookOpen size={20} />;
      case 'page': return <FileText size={20} />;
      case 'author': return <User size={20} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start px-6 pt-32 pb-40 bg-brand-bg relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-accent/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-3xl w-full text-center relative z-10"
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-accent/10 border border-brand-accent/20 rounded-full text-brand-accent text-[10px] font-bold uppercase tracking-widest mb-8">
          <span>404</span>
          <div className="w-1 h-1 rounded-full bg-brand-accent/40" />
          <span>Error</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-tight">
          {t.notFound.title}
        </h1>
        
        <p className="text-xl text-slate-400 font-medium mb-12 max-w-2xl mx-auto leading-relaxed">
          {t.notFound.message}
        </p>

        <div className="relative mb-[450px] group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent/20 to-brand-accent/5 rounded-full blur opacity-25 group-focus-within:opacity-100 transition duration-1000 group-focus-within:duration-200" />
          <div className="relative flex items-center bg-white/5 backdrop-blur-2xl rounded-full border border-white/10 px-6 py-4 focus-within:border-brand-accent/50 focus-within:ring-4 focus-within:ring-brand-accent/10 transition-all shadow-2xl">
            <Search className="text-slate-400 mr-4 shrink-0" size={24} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.notFound.searchPrompt}
              className="w-full bg-transparent border-none focus:ring-0 text-lg text-white placeholder:text-slate-400 h-10"
            />
            {(isSearching || isInitializing) && (
              <Loader2 className="text-brand-accent animate-spin shrink-0" size={24} />
            )}
          </div>

          <AnimatePresence>
            {query.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-4 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50 max-h-[400px] overflow-y-auto custom-scrollbar"
              >
                {results.length > 0 ? (
                  <div className="p-2 space-y-1">
                    {results.map((result) => (
                      <button
                        key={`${result.document.type}-${result.document.slug}`}
                        onClick={() => handleResultClick(result.document.type, result.document.slug)}
                        className="w-full text-left p-4 hover:bg-white/5 rounded-2xl transition-all group flex gap-4 items-start"
                      >
                        <div className="mt-1 text-brand-accent group-hover:scale-110 transition-transform shrink-0">
                          {getIcon(result.document.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 bg-white/5 px-2 py-0.5 rounded">
                              {t.search.types[result.document.type as keyof typeof t.search.types] || result.document.type}
                            </span>
                            <div className="text-xl font-bold text-white group-hover:text-brand-accent transition-colors leading-tight">
                              {result.document.name || result.document.title}
                            </div>
                          </div>
                          {result.document.type === 'author' && result.document.name && (result.document.title || result.document.company) && (
                            <div className="text-sm text-slate-400 font-medium mb-1.5 line-clamp-1">
                              {result.document.title}{result.document.company ? `, ${result.document.company}` : ''}
                            </div>
                          )}
                          {result.document.excerpt && (
                            <div className="text-base text-slate-500 line-clamp-1 leading-relaxed">
                              {result.document.excerpt}
                            </div>
                          )}
                        </div>
                        <ArrowRight size={18} className="mt-2 text-slate-600 group-hover:text-brand-accent group-hover:translate-x-1 transition-all shrink-0" />
                      </button>
                    ))}
                  </div>
                ) : !isSearching && !isInitializing && (
                  <div className="p-12 text-center text-slate-500 text-lg italic">
                    {t.search.noResults} "{query}"
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={onHome}
          className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-bold tracking-wider transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
        >
          <Home size={18} className="text-brand-accent" />
          <span>{t.notFound.backToHome}</span>
        </button>
      </motion.div>
    </div>
  );
}
