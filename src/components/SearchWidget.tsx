import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, BookOpen, FileText, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOramaSearch } from '../hooks/useOramaSearch';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

interface SearchWidgetProps {
  onNavigate: (type: 'post' | 'page' | 'author', slug: string) => void;
  isMobile?: boolean;
}

export function SearchWidget({ onNavigate, isMobile }: SearchWidgetProps) {
  const t = getTranslations(CONFIG.language as Language);
  const { performSearch, isInitializing } = useOramaSearch();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (isOpen && !isMobile) {
      inputRef.current?.focus();
    }
  }, [isOpen, isMobile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleResultClick = (type: string, slug: string) => {
    onNavigate(type as any, slug);
    setIsOpen(false);
    setQuery('');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'post': return <BookOpen size={14} />;
      case 'page': return <FileText size={14} />;
      case 'author': return <User size={14} />;
      default: return null;
    }
  };

  return (
    <div ref={containerRef} className={`${isMobile ? 'w-full' : 'relative'}`}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
          className={`p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-white/5 ${isMobile ? 'flex items-center gap-2 w-full text-sm font-medium px-0' : ''}`}
          aria-label={t.search.title}
        >
          <Search size={20} strokeWidth={1.5} />
          {isMobile && <span>{t.search.title}</span>}
        </button>
      ) : (
        <motion.div 
          initial={isMobile ? {} : { width: 40, opacity: 0 }}
          animate={isMobile ? {} : { width: 300, opacity: 1 }}
          className={`${isMobile ? 'w-full' : 'absolute right-0 top-1/2 -translate-y-1/2 z-50'}`}
        >
          <div className="relative flex items-center bg-white/10 backdrop-blur-md rounded-full border border-white/20 px-3 py-1.5 focus-within:ring-2 focus-within:ring-brand-accent/50 transition-all shadow-lg">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="w-full bg-transparent border-none focus:ring-0 text-sm text-white placeholder:text-slate-500 px-2 h-7"
            />
            {isSearching || isInitializing ? (
              <Loader2 size={16} className="text-slate-400 animate-spin shrink-0" />
            ) : (
              <button 
                onClick={() => {
                  setIsOpen(false);
                  setQuery('');
                }}
                className="text-slate-500 hover:text-white transition-colors"
                aria-label={t.search.close}
              >
                <X size={16} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {query.length >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`${isMobile ? 'relative mt-2' : 'absolute top-full right-0 mt-4'} w-full sm:min-w-[400px] bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]`}
              >
                <div className="max-h-[60vh] overflow-y-auto">
                  {results.length > 0 ? (
                    <div className="p-2 space-y-1">
                      {results.map((result) => (
                        <button
                          key={`${result.document.type}-${result.document.slug}`}
                          onClick={() => handleResultClick(result.document.type, result.document.slug)}
                          className="w-full text-left p-3 hover:bg-white/5 rounded-xl transition-all group flex gap-3 items-start"
                        >
                          <div className="mt-1 text-brand-accent group-hover:scale-110 transition-transform shrink-0">
                            {getIcon(result.document.type)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500 bg-white/5 px-1.5 py-0.5 rounded">
                                {t.search.types[result.document.type as keyof typeof t.search.types] || result.document.type}
                              </span>
                              <div className="text-sm font-bold text-white group-hover:text-brand-accent transition-colors leading-tight">
                                {result.document.name || result.document.title}
                              </div>
                            </div>
                            {result.document.type === 'author' && result.document.name && (result.document.title || result.document.company) && (
                              <div className="text-[10px] text-slate-400 font-medium mb-1 line-clamp-1">
                                {result.document.title}{result.document.company ? `, ${result.document.company}` : ''}
                              </div>
                            )}
                            {result.document.excerpt && (
                              <div className="text-xs text-slate-500 line-clamp-1 leading-relaxed">
                                {result.document.excerpt}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : !isSearching && !isInitializing && (
                    <div className="p-8 text-center text-slate-500 text-sm italic">
                      {t.search.noResults} "{query}"
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
