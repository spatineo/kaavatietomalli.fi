import { useEffect, useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import { motion } from 'motion/react';
import { ArrowRight, History as HistoryIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { PostMetadata } from '../lib/blog';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface HistoryHeroProps {
  posts: PostMetadata[];
  onSelectPost: (slug: string) => void;
}

export function HistoryHero({ posts, onSelectPost }: HistoryHeroProps) {
  const t = getTranslations(CONFIG.language as Language);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  // Sort by date ascending for the hero
  const chronologicalPosts = [...posts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 5);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 5);
      
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollProgress((scrollLeft / maxScroll) * 100);
      } else {
        setScrollProgress(0);
      }
    }
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', checkScroll);
      // Initial check
      checkScroll();
      
      const observer = new ResizeObserver(checkScroll);
      observer.observe(container);
      
      return () => {
        container.removeEventListener('scroll', checkScroll);
        observer.disconnect();
      };
    }
  }, [posts]);

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.6; // Scroll roughly 60% of viewport width
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="bg-black text-white py-32 overflow-hidden border-b border-white/5">
      <div className="max-w-7xl ml-5 lg:ml-20 mr-auto px-6 mb-12">
        <div className="flex flex-col">
          <div className="flex items-center gap-6 mb-8 uppercase">
            <HistoryIcon size={20} className="text-brand-accent" aria-hidden="true" />
            <span className="text-xs font-bold tracking-[0.4em] text-slate-500">{t.history.sectionSubtitle}</span>
            <div className="h-[1px] flex-grow bg-white/10" aria-hidden="true" />
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-6">
            {t.history.titleMain} <span className="text-brand-accent">{t.history.titleAccent}</span> <span className="text-white/30">{t.history.titleOlta}</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-3xl leading-relaxed">
            {t.history.description} 
          </p>
        </div>
      </div>

      <div className="relative">
        <div 
          ref={scrollContainerRef}
          className="flex gap-8 pb-12 pt-4 overflow-x-auto no-scrollbar scroll-smooth relative z-10" 
          role="list"
        >
        
          {/* The Time Line */}
          {chronologicalPosts.length > 1 && (
            <div 
              className="absolute h-[2px] bg-white/35 top-[70px] z-0 pointer-events-none" 
              style={{
                left:0,
                width: `${(chronologicalPosts.length - 1) * 450}px`
              }}
            />
          )}
          
          {chronologicalPosts.map((post, idx) => (
            <motion.button
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="flex-shrink-0 w-80 group text-left mx-5 outline-none cursor-pointer"
              onClick={() => onSelectPost(post.slug)}
              role="listitem"
              aria-label={`${t.post.readMore}: ${post.title}`}
            >
              <div className="relative mb-8 flex flex-col items-center">
                {!post.dateLabel ? (
                <span className="text-2xl font-extrabold text-brand-accent mb-4 transition-transform group-hover:-translate-y-2 group-focus-visible:-translate-y-2">
                  {format(parseISO(post.date), 'MMM yyyy', {locale:fi})}
                </span>
                ) : (
                <span className="text-2xl font-extrabold text-brand-accent mb-4 transition-transform group-hover:-translate-y-2 group-focus-visible:-translate-y-2">
                  {post.dateLabel}
                </span>
                )}
                <div className="w-3 h-3 rounded-full bg-black border-4 border-brand-accent group-hover:scale-125 group-focus-visible:scale-125 transition-transform" />
              </div>

              <div className="bg-white/5 p-8 border border-white/10 rounded-2xl group-hover:border-brand-accent/50 group-focus-visible:border-brand-accent transition-all backdrop-blur-sm shadow-2xl min-h-[16em]">
                <h3 className="text-xl font-bold leading-tight mb-4 group-hover:text-brand-accent transition-colors">
                  {post.title}
                </h3>
                <p className="text-slate-400 text-sm font-medium line-clamp-3 mb-8 leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-brand-accent transition-opacity">
                  {t.history.exploreData} <ArrowRight size={12} />
                </div>
              </div>
            </motion.button>
          ))}
          
          {/* End cap padding */}
          <div className="w-20 flex-shrink-0" />
        </div>
      </div>

      {/* Modern carousel control widget: progress line indicator & chevron buttons by proximity */}
      <div className="max-w-7xl ml-5 lg:ml-20 mr-auto px-6 mt-8 flex items-center justify-between gap-8">
        {/* Progress Line */}
        <div className="flex-grow h-[2px] bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-brand-accent transition-all duration-300 ease-out rounded-full"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Carousel Navigation Buttons */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => handleScroll('left')}
            disabled={!canScrollLeft}
            className={`p-3 rounded-full border transition-all duration-300 ${
              canScrollLeft 
                ? 'border-white/20 text-white hover:bg-white/10 hover:border-brand-accent cursor-pointer' 
                : 'border-white/5 text-white/20 cursor-not-allowed'
            }`}
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={!canScrollRight}
            className={`p-3 rounded-full border transition-all duration-300 ${
              canScrollRight 
                ? 'border-white/20 text-white hover:bg-white/10 hover:border-brand-accent cursor-pointer' 
                : 'border-white/5 text-white/20 cursor-not-allowed'
            }`}
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
