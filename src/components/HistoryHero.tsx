import { format, parseISO } from 'date-fns';
import { fi } from 'date-fns/locale';
import { motion } from 'motion/react';
import { ArrowRight, History as HistoryIcon } from 'lucide-react';
import { PostMetadata } from '../lib/blog';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface HistoryHeroProps {
  posts: PostMetadata[];
  onSelectPost: (slug: string) => void;
}

export function HistoryHero({ posts, onSelectPost }: HistoryHeroProps) {
  const t = getTranslations(CONFIG.language as Language);
  // Sort by date ascending for the hero
  const chronologicalPosts = [...posts].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <section className="bg-black text-white py-32 overflow-hidden border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 mb-12">
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
        {/* The Time Line */}
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white/10 -translate-y-1/2 z-0" />
        
        <div className="flex gap-8 px-6 pb-12 overflow-x-auto no-scrollbar scroll-smooth relative z-10" role="list">
          {chronologicalPosts.map((post, idx) => (
            <motion.button
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1, duration: 0.6 }}
              className="flex-shrink-0 w-80 group text-left outline-none cursor-pointer"
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

              <div className="bg-white/5 p-8 border border-white/10 rounded-2xl group-hover:border-brand-accent/50 group-focus-visible:border-brand-accent transition-all backdrop-blur-sm shadow-2xl">
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
    </section>
  );
}
