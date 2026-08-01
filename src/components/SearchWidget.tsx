import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import { motion } from 'motion/react';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { getTracker } from '../services/analytics';
import { SearchBox } from './SearchBox';

interface SearchWidgetProps {
  onNavigate: (type: string, slug: string) => void;
  isMobile?: boolean;
}

export function SearchWidget({ onNavigate, isMobile }: SearchWidgetProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleNavigate = (type: string, slug: string) => {
    getTracker().trackCTA('Search Result Click', `${type}:${slug}`, 'widget');
    onNavigate(type, slug);
    setIsOpen(false);
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
          <SearchBox 
            onNavigate={handleNavigate}
            showClose={true}
            onClose={() => setIsOpen(false)}
            autoFocus={!isMobile}
            isMobile={isMobile}
          />
        </motion.div>
      )}
    </div>
  );
}

