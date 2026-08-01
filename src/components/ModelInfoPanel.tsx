import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Info, BookOpen, ExternalLink, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Translations } from '../i18n/types';

interface ModelInfoPanelProps {
  metadata: any;
  dataLang: string;
  getLocalized: (obj: any) => string;
  t: Translations;
}

export function ModelInfoPanel({ metadata, dataLang, getLocalized, t }: ModelInfoPanelProps) {
  const [isDocOpen, setIsDocOpen] = useState(false);

  return (
    <div className="flex flex-col gap-6">
    
      {/* Description */}
      <div className="bg-black/30 border border-white/5 rounded-3xl p-8 flex flex-col gap-4 animate-fade-in">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Info size={18} className="text-brand-accent" />
          {t.dataModel.description}
        </h2>
        <p className="text-slate-300 leading-relaxed">
          {getLocalized(metadata.description) || t.dataModel.noDescription}
        </p>
      </div>

      {/* Documentation Text (Foldable Section) */}
      {metadata.documentation && (
        <div className="bg-black/30 border border-white/5 rounded-3xl flex flex-col overflow-hidden">
          <button
            onClick={() => setIsDocOpen(!isDocOpen)}
            className="w-full text-left p-8 flex items-center justify-between group transition-colors hover:bg-white/[0.02]"
          >
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BookOpen size={18} className="text-brand-accent" />
              {t.dataModel.documentationAndHistory}
            </h2>
            <div className="flex items-center gap-4 pl-4 border-l border-white/5">
              <span className="hidden sm:inline text-xs font-semibold text-slate-400 group-hover:text-brand-accent transition-colors">
                {isDocOpen ? t.dataModel.hideDocumentation : t.dataModel.showDocumentation}
              </span>
              <ChevronDown
                size={18}
                className={`text-slate-500 transition-transform duration-500 group-hover:text-brand-accent ${
                  isDocOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          <AnimatePresence>
            {isDocOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-8 pb-8 border-t border-white/5 pt-6">
                  <div className="markdown-body prose prose-invert max-w-none text-slate-300 max-h-[480px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                    <ReactMarkdown>{getLocalized(metadata.documentation)}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
