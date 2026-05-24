import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { MessageSquare, Clock, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { fi as fiLocale } from 'date-fns/locale';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

const Giscus = lazy(() => import('@giscus/react'));

interface PostCommentsProps {
  postSlug: string;
  onToggleOpen?: (isOpen: boolean) => void;
}

export function PostComments({ postSlug, onToggleOpen }: PostCommentsProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentStats, setCommentStats] = useState<{ count: number; lastDate: string | null } | null>(null);
  const commentsSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Reset comments state when post changes, but keep open if giscus redirect param is in URL
    const urlParams = new URLSearchParams(window.location.search);
    const hasGiscusParam = urlParams.has('giscus');
    setIsCommentsOpen(hasGiscusParam);
    onToggleOpen?.(hasGiscusParam);
    setCommentStats(null);

    // Fetch Giscus stats from prebuilt giscus-stats.json to avoid CORS issues
    const fetchGiscusStats = async () => {
      try {
        const response = await fetch(`${CONFIG.basePath}content/giscus-stats.json`);
        if (response.ok) {
          const stats = await response.json();
          const postStats = stats[postSlug];
          if (postStats) {
            setCommentStats({
              count: postStats.count,
              lastDate: postStats.lastDate,
            });
          }
        }
      } catch (e) {
        console.warn('Failed to fetch prebuilt Giscus stats.', e);
      }
    };
    fetchGiscusStats();
  }, [postSlug]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('giscus')) {
      const scrollTimeout = setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 750); // Allow motion transition to height: 'auto' to complete
      return () => clearTimeout(scrollTimeout);
    }
  }, [postSlug]);

  useEffect(() => {
    let scrolledOnMessage = false;
    const handleGiscusMessage = (event: MessageEvent) => {
      if (event.origin !== 'https://giscus.app') return;

      const { data } = event;
      if (data && typeof data === 'object' && 'giscus' in data) {
        // Giscus has sent a message, meaning it has loaded and registered the token!
        // Now delete the "giscus" query parameter from the browser address bar and history
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('giscus')) {
          if (!scrolledOnMessage) {
            scrolledOnMessage = true;
            setTimeout(() => {
              commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
            }, 400); // Allow iframe content to settle
          }

          urlParams.delete('giscus');
          const newSearch = urlParams.toString();
          const newUrl = `${window.location.pathname}${newSearch ? '?' + newSearch : ''}${window.location.hash}`;
          window.history.replaceState(null, '', newUrl);
        }
      }
    };

    window.addEventListener('message', handleGiscusMessage);
    return () => {
      window.removeEventListener('message', handleGiscusMessage);
    };
  }, [postSlug]);

  const handleToggleComments = () => {
    const nextState = !isCommentsOpen;
    setIsCommentsOpen(nextState);
    onToggleOpen?.(nextState);
    if (nextState && commentsSectionRef.current) {
      setTimeout(() => {
        commentsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  };

  return (
    <div className="mt-32 pt-20 border-t border-white/5" ref={commentsSectionRef}>
      <button onClick={handleToggleComments} className="w-full text-left group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6 flex-grow">
            <span className="text-xs font-bold uppercase tracking-[0.4em] text-brand-accent">
              {t.post.comments}
            </span>
            <div className="h-[1px] w-12 bg-white/10" />

            <div className="hidden sm:flex items-center gap-6">
              {commentStats ? (
                <>
                  <div className="flex items-center gap-2">
                    <MessageSquare size={12} className="text-slate-500" />
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                      {t.post.commentCount.replace('{{count}}', commentStats.count.toString())}
                    </span>
                  </div>
                  {commentStats.lastDate && (
                    <div className="flex items-center gap-2">
                      <Clock size={12} className="text-slate-500" />
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
                        {t.post.latestComment.replace(
                          '{{date}}',
                          formatDistanceToNow(parseISO(commentStats.lastDate), {
                            addSuffix: true,
                            locale: fiLocale,
                          })
                        )}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest opacity-40">
                  Giscus Discussions
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4 pl-4 border-l border-white/5">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 group-hover:text-brand-accent transition-colors">
              {isCommentsOpen ? t.post.hideComments : t.post.showComments}
            </span>
            <ChevronDown
              size={16}
              className={`text-slate-500 transition-transform duration-500 group-hover:text-brand-accent ${
                isCommentsOpen ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      <AnimatePresence>
        {isCommentsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-20">
              <Suspense
                fallback={
                  <div className="h-64 flex flex-col items-center justify-center gap-4 bg-white/[0.02] rounded-2xl border border-white/5 animate-pulse">
                    <div className="w-10 h-10 rounded-full border-2 border-brand-accent/20 border-t-brand-accent animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      {t.common.loading}
                    </span>
                  </div>
                }
              >
                <Giscus
                  key={postSlug}
                  repo={CONFIG.giscus.repo as any}
                  repoId={CONFIG.giscus.repoId}
                  category={CONFIG.giscus.category}
                  categoryId={CONFIG.giscus.categoryId}
                  mapping={CONFIG.giscus.mapping as any}
                  term={postSlug}
                  strict={CONFIG.giscus.strict as any}
                  reactionsEnabled={CONFIG.giscus.reactionsEnabled as any}
                  emitMetadata={CONFIG.giscus.emitMetadata as any}
                  inputPosition={CONFIG.giscus.inputPosition as any}
                  theme={CONFIG.giscus.theme as any}
                  lang={CONFIG.giscus.lang as any}
                  loading={CONFIG.giscus.loading as any}
                />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
