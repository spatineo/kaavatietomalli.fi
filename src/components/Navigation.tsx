import { motion, AnimatePresence } from 'motion/react';
import { History, Github, Twitter, Mail, Menu, X } from 'lucide-react';
import { useState } from 'react';
import SpatineoLogo from './SpatineoLogo';
import { CONFIG } from '../config';

interface HeaderProps {
  onNavigatePage: (slug: string | null) => void;
  onHome: () => void;
  onBlog: () => void;
}

export function Header({ onNavigatePage, onHome, onBlog }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const handleNavClick = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <button 
            onClick={onHome}
            className="text-lg md:text-xl font-black tracking-tight text-white hover:text-brand-accent transition-colors flex items-center gap-3"
            aria-label="Etusivu - Kaavatietomalli.fi"
          >
            <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
              {/* Fallback CSS Logo - hidden if image is found or can be replaced by user */}
              <img 
                src={`${CONFIG.basePath.replace(/\/$/, '')}/images/logo.svg`} 
                alt="" 
                className="absolute inset-0 w-full h-full object-contain hidden"
                onError={(e) => (e.currentTarget.style.display = 'none')}
                onLoad={(e) => {
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.fallback-logo');
                    if (fallback) (fallback as HTMLElement).style.display = 'none';
                    e.currentTarget.style.display = 'block';
                  }
                }}
              />
              <div className="fallback-logo w-6 h-6 md:w-8 md:h-8 rounded-lg bg-brand-accent flex items-center justify-center shadow-lg shadow-brand-accent/20" aria-hidden="true">
                <div className="w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-brand-primary" />
              </div>
            </div>
            <span className="hidden sm:inline">Kaavatietomalli.</span>
            <span className="sm:hidden text-brand-accent">Kaavatietomalli.</span>
          </button>
          
          <nav className="hidden md:flex gap-10 text-sm font-semibold text-slate-400" aria-label="Päänavigaatio">
            <button onClick={onBlog} className="hover:text-brand-accent transition-colors whitespace-nowrap">Blogi</button>
            <button onClick={() => onNavigatePage('tietomallit')} className="hover:text-brand-accent transition-colors whitespace-nowrap">Tietomallit</button>
            <button onClick={() => onNavigatePage('sparraus')} className="hover:text-brand-accent transition-colors whitespace-nowrap">Sparrausapua</button>
            <button onClick={() => onNavigatePage('kumppanit')} className="hover:text-brand-accent transition-colors whitespace-nowrap">Kumppanit</button>
            <button onClick={() => onNavigatePage('tietoa')} className="hover:text-brand-accent transition-colors whitespace-nowrap">Tietoa sivustosta</button>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-4 text-slate-400 hover:text-white transition-colors">
            <a href={`https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}`} target="_blank" rel="noopener noreferrer" aria-label="GitHub repository">
              <Github size={20} strokeWidth={1.5} />
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? "Sulje valikko" : "Avaa valikko"}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-t border-white/5 bg-black/95 absolute w-full overflow-hidden"
          >
            <nav className="flex flex-col p-6 gap-6 text-lg font-bold text-slate-200">
              <button 
                onClick={() => handleNavClick(onBlog)} 
                className="flex items-center justify-between hover:text-brand-accent transition-colors"
              >
                Blogi
                <div className="w-2 h-2 rounded-full bg-brand-accent" />
              </button>
              <button 
                onClick={() => handleNavClick(() => onNavigatePage('tietomallit'))} 
                className="flex items-center justify-between hover:text-brand-accent transition-colors"
              >
                Tietomallit
                <div className="w-2 h-2 rounded-full bg-brand-accent/40" />
              </button>
              <button 
                onClick={() => handleNavClick(() => onNavigatePage('sparraus'))} 
                className="flex items-center justify-between hover:text-brand-accent transition-colors"
              >
                Sparrausapua
                <div className="w-2 h-2 rounded-full bg-brand-accent/40" />
              </button>
              <button 
                onClick={() => handleNavClick(() => onNavigatePage('kumppanit'))} 
                className="flex items-center justify-between hover:text-brand-accent transition-colors"
              >
                Kumppanit
                <div className="w-2 h-2 rounded-full bg-brand-accent/40" />
              </button>
              <button 
                onClick={() => handleNavClick(() => onNavigatePage('tietoa'))} 
                className="flex items-center justify-between hover:text-brand-accent transition-colors"
              >
                Tietoa sivustosta
                <div className="w-2 h-2 rounded-full bg-brand-accent/40" />
              </button>
              
              <div className="flex gap-6 pt-6 border-t border-white/5 mt-2">
                <a href={`https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}`} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium">
                  <Github size={20} /> GitHub
                </a>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="py-12 border-t border-white/5 bg-black/40">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-8">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Oikeudet</span>
            <span className="text-sm font-semibold text-slate-200">&copy; Spatineo Oy ja kirjoittajat</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Yhteys</span>
            <span className="text-sm font-semibold text-slate-200">kaavatietomalli@spatineo.com</span>
          </div>
        </div>
        <div className="text-left md:text-left">
          <SpatineoLogo width={250} height={70} className="header-logo" />
        </div>
      </div>
    </footer>
  );
}
