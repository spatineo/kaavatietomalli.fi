import { ArrowLeft } from 'lucide-react';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

interface ContentFooterProps {
  onBack?: () => void;
  className?: string;
}

export function ContentFooter({ onBack, className = '' }: ContentFooterProps) {
  const t = getTranslations(CONFIG.language as Language);

  return (
    <footer className={`pt-20 border-t border-white/10 transition-all duration-500 ${className}`}>
      <div className="grid md:grid-cols-2 gap-12 md:gap-20">
        <div>
          <h3 className="text-3xl font-extrabold mb-6 tracking-tighter text-white">
            {t.common.footerTitle}
          </h3>
          <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-xl">
            {t.common.footerText}
          </p>
        </div>
        {onBack && (
          <div className="flex flex-col justify-end items-start md:items-end">
            <button
              onClick={onBack}
              className="group flex items-center gap-6 bg-black text-white border border-white/10 px-10 py-5 rounded-xl transition-all duration-300 hover:bg-brand-bg hover:border-brand-accent hover:text-brand-accent shadow-xl shadow-black/20"
            >
              <span className="uppercase font-bold tracking-widest text-xs">
                {t.common.backToHome}
              </span>
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
