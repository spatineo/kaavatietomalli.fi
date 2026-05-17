import { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useOramaSearch } from '../hooks/useOramaSearch';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { SearchResultItem } from './SearchResultItem';

interface SearchBoxProps {
  size?: 'sm' | 'lg';
  onNavigate: (type: 'post' | 'page' | 'author', slug: string) => void;
  initialQuery?: string;
  autoFocus?: boolean;
  showClose?: boolean;
  onClose?: () => void;
  className?: string;
  placeholder?: string;
  isMobile?: boolean;
}

export function SearchBox({ 
  size = 'sm', 
  onNavigate, 
  initialQuery = '', 
  autoFocus = false,
  showClose = false,
  onClose,
  className = '',
  placeholder,
  isMobile = false
}: SearchBoxProps) {
  const t = getTranslations(CONFIG.language as Language);
  const { performSearch, isInitializing } = useOramaSearch();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const isLarge = size === 'lg';

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

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

  const handleResultClick = (type: string, slug: string) => {
    onNavigate(type as any, slug);
    if (onClose) onClose();
    setQuery('');
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className={`relative flex items-center bg-white/10 backdrop-blur-md rounded-full border border-white/20 px-3 transition-all focus-within:ring-2 focus-within:ring-brand-accent/50 ${
        isLarge ? 'py-3 px-6' : 'py-1.5 px-3'
      }`}>
        <Search size={isLarge ? 24 : 18} className="text-slate-400 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t.search.placeholder}
          className={`w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-slate-400 px-2 ${
            isLarge ? 'text-lg h-10' : 'text-sm h-7'
          }`}
        />
        {isSearching || isInitializing ? (
          <Loader2 size={isLarge ? 24 : 16} className="text-slate-400 animate-spin shrink-0" />
        ) : showClose ? (
          <button 
            onClick={() => {
              setQuery('');
              if (onClose) onClose();
            }}
            className="text-slate-500 hover:text-white transition-colors"
            aria-label={t.search.close}
          >
            <X size={isLarge ? 24 : 16} />
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {query.length >= 2 && (
          <motion.div
            ref={resultsRef}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`${
              isMobile ? 'relative mt-2' : isLarge ? 'absolute top-full left-0 right-0 mt-4' : 'absolute top-full right-0 mt-4'
            } ${
              isLarge ? 'w-full' : 'w-full sm:min-w-[400px]'
            } bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[60]`}
          >
            <div className={`overflow-y-auto custom-scrollbar ${isLarge ? 'max-h-[400px]' : 'max-h-[60vh]'}`}>
              {results.length > 0 ? (
                <div className="p-2 space-y-1">
                  {results.map((result) => (
                    <SearchResultItem
                      key={`${result.document.type}-${result.document.slug}`}
                      result={result}
                      size={size}
                      onClick={handleResultClick}
                    />
                  ))}
                </div>
              ) : !isSearching && !isInitializing && (
                <div className={`text-center text-slate-500 italic ${isLarge ? 'p-12 text-lg' : 'p-8 text-sm'}`}>
                  {t.search.noResults} "{query}"
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
