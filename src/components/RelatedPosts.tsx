import { format, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { PostMetadata } from '../lib/blog';
import { resolveImageUrl } from '../lib/utils';
import { Calendar, ArrowRight } from 'lucide-react';

interface RelatedPostsProps {
  posts: PostMetadata[];
  onSelectPost: (slug: string) => void;
}

export function RelatedPosts({ posts, onSelectPost }: RelatedPostsProps) {
  return (
    <div className="grid gap-6">
      {posts.map((post, index) => (
        <motion.button
          key={post.slug}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          onClick={() => onSelectPost(post.slug)}
          className="group flex gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-brand-accent/30 transition-all text-left"
        >
          {/* Thumbnail */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-800">
            {post.coverImage ? (
              <img
                src={resolveImageUrl(post.coverImage)}
                alt={post.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center opacity-20">
                <div className="w-8 h-8 rounded-full border-2 border-white" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
          </div>

          {/* Content */}
          <div className="flex flex-col justify-center flex-grow py-1">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-3 h-3 text-slate-500" />
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
                {post.dateLabel || format(parseISO(post.date), 'dd.MM.yyyy')}
              </span>
            </div>
            
            <h4 className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors mb-2">
              {post.title}
            </h4>

            {post.excerpt && (
              <p className="text-xs text-slate-400 line-clamp-2 mb-3 leading-relaxed">
                {post.excerpt}
              </p>
            )}

            <div className="mt-auto">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 group-hover:text-brand-accent transition-colors">
                Lue artikkeli <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
              </span>
            </div>
          </div>
        </motion.button>
      ))}
    </div>
  );
}
