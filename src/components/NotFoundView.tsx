import { useEffect } from 'react';
import { Home } from 'lucide-react';
import { motion } from 'motion/react';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { getTracker } from '../services/analytics';
import { SearchBox } from './SearchBox';

interface NotFoundViewProps {
  missingSlug?: string;
  onNavigate: (type: 'post' | 'page' | 'author', slug: string) => void;
  onHome: () => void;
}

export function NotFoundView({ missingSlug, onNavigate, onHome }: NotFoundViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  
  // Format initial search query from missingSlug
  const initialQuery = missingSlug ? missingSlug.replace(/[-_]/g, ' ') : '';

  const handleNavigate = (type: 'post' | 'page' | 'author', slug: string) => {
    getTracker().trackCTA('404 Search Result Click', `${type}:${slug}`, '404_page');
    onNavigate(type, slug);
  };

  return (
    <div 
      data-testid="not-found-view"
      className="min-h-screen flex flex-col items-center justify-start px-6 pt-32 pb-40 bg-brand-bg relative overflow-hidden"
    >
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

        <div className="relative mb-[450px] group/search">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-accent/20 to-brand-accent/5 rounded-full blur opacity-25 group-focus-within/search:opacity-100 transition duration-1000 group-focus-within/search:duration-200" />
          <SearchBox 
            size="lg"
            onNavigate={handleNavigate}
            initialQuery={initialQuery}
            autoFocus={true}
            placeholder={t.notFound.searchPrompt}
            className="relative z-20"
          />
        </div>

        <button
          onClick={() => {
            getTracker().trackCTA('404 Back to Home', undefined, '404_page');
            onHome();
          }}
          className="inline-flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white font-bold tracking-wider transition-all hover:-translate-y-1 hover:shadow-xl active:translate-y-0"
        >
          <Home size={18} className="text-brand-accent" />
          <span>{t.notFound.backToHome}</span>
        </button>
      </motion.div>
    </div>
  );
}

