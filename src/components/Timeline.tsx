import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { PostMetadata } from '../lib/blog';
import { resolveImageUrl } from '../lib/utils';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface TimelineProps {
  posts: PostMetadata[];
  onSelectPost: (slug: string) => void;
  onSelectTag: (tag: string) => void;
}

export function Timeline({ posts, onSelectPost, onSelectTag }: TimelineProps) {
  const t = getTranslations(CONFIG.language as Language);
  return (
    <section className="relative max-w-6xl mx-auto py-12 px-6" aria-label={t.blog.timelineAria}>
      {/* Vertical Line */}
      <div className="absolute left-10 md:left-1/2 top-0 bottom-0 w-[2px] bg-white/10 -translate-x-1/2" aria-hidden="true" />

      <div className="space-y-16 md:space-y-32" role="list">
        {posts.map((post, index) => (
          <motion.div
            key={post.slug}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className={`relative flex items-start flex-col md:flex-row ${
              index % 2 === 0 ? 'md:flex-row-reverse' : ''
            }`}
            role="listitem"
          >
            {/* Center Node */}
            <div className="absolute left-10 md:left-1/2 -translate-x-1/2 flex items-center justify-center pt-2" aria-hidden="true">
              <div className="w-5 h-5 rounded-full bg-white border-4 border-brand-accent shadow-lg shadow-brand-accent/20 z-10 scale-75 md:scale-100" />
            </div>

            {/* Content Area */}
            <div className={`w-full md:w-[48%] pl-20 md:pl-0 ${index % 2 === 0 ? 'md:pl-16' : 'md:pr-16'}`}>
              <div className="mb-6">
                <button
                  onClick={() => onSelectPost(post.slug)}
                  className="group w-full text-left transition-all duration-500 outline-none"
                  aria-label={`${t.post.ariaLabel}: ${post.title}`}
                >
                  <div className="flex items-center gap-4 mb-3">
                    <span className="text-[10px] font-bold tracking-widest text-brand-accent uppercase bg-brand-accent/10 px-2 py-1 rounded-md">
                      {format(parseISO(post.date), 'dd.MM.yyyy')}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{post.author}</span>
                  </div>
                  
                  <h3 className="text-3xl md:text-4xl font-extrabold text-white group-hover:text-brand-accent transition-colors leading-[1.1] mb-5">
                    {post.title}
                  </h3>
                  
                  <p className="text-slate-400 text-lg font-medium leading-relaxed mb-8 line-clamp-3">
                    {post.excerpt}
                  </p>
                </button>

                <div className="flex flex-wrap gap-2 mb-8">
                  {post.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTag(tag);
                      }}
                      className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:border-brand-accent hover:text-brand-accent transition-all"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => onSelectPost(post.slug)}
                  className="group inline-flex items-center gap-4 bg-black text-white border border-white/10 rounded-xl px-8 py-3 transition-all duration-300 hover:bg-brand-bg hover:border-brand-accent hover:text-brand-accent shadow-xl shadow-black/20"
                >
                  <span className="uppercase font-bold tracking-widest text-[10px]">{t.post.readMore}</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {post.coverImage && (
                <button
                  onClick={() => onSelectPost(post.slug)}
                  className="group relative block w-full aspect-[16/8] overflow-hidden rounded-2xl bg-white/5 transition-all duration-700 shadow-2xl"
                >
                  <img
                    src={resolveImageUrl(post.coverImage)}
                    alt={`${t.post.illustrationAlt}: ${post.title}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
