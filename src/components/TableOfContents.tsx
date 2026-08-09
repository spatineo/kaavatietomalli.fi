import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { HeaderItem } from './MarkdownHeading';
import { scrollToAnchor } from '../lib/utils';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

interface TableOfContentsProps {
  headings: HeaderItem[];
}

export function TableOfContents({ headings }: TableOfContentsProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleHeadingClick = (id: string) => {
    setIsOpen(false);
    setTimeout(() => {
      scrollToAnchor(id);
    }, 50);
  };

  return (
    <div
      ref={containerRef}
      data-testid="toc-container"
      className="hidden lg:block absolute lg:-left-16 top-0 bottom-0 select-none"
    >
      <div className="sticky top-28 z-30">
        {/* Hamburger Trigger */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={t.page.tableOfContents}
          data-testid="toc-trigger"
          className="p-2.5 bg-brand-muted hover:bg-white/10 text-slate-400 hover:text-brand-accent rounded-xl border border-white/10 transition-all shadow-xl flex items-center justify-center focus-visible:ring-2 focus-visible:ring-brand-accent cursor-pointer"
        >
          {isOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Popup Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              data-testid="toc-popup"
              className="toc absolute left-0 mt-3 w-[720px] xl:w-[820px] max-w-[calc(100vw-8rem)] bg-black/95 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl shadow-black z-40 max-h-[70vh] overflow-y-auto custom-scrollbar"
            >
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">{t.page.tableOfContents}</span>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  aria-label={t.page.close}
                >
                  <X size={16} />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {headings.map((h, i) => {
                  const indentStyle = {
                    paddingLeft: `${Math.max(0, (h.level - 1) * 12)}px`,
                  };

                  return (
                    <button
                      key={i}
                      onClick={() => handleHeadingClick(h.id)}
                      className={`toc-item w-full text-left py-1.5 px-2 hover:bg-white/5 hover:text-brand-accent rounded-lg transition-all text-sm leading-tight text-slate-300 font-medium cursor-pointer`}
                      style={indentStyle}
                    >
                      <span className="heading-number">{h.prefix ? `${h.prefix} ` : ''}</span><span className="heading-content">{h.text}</span>
                    </button>
                  );
                })}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
