import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Github, Twitter, Mail, Menu, X, ChevronDown } from 'lucide-react';
import SpatineoLogo from './SpatineoLogo';
import { SearchWidget } from './SearchWidget';
import { CONFIG, NavItem } from '../config';
import { getTranslations, Language } from '../i18n';
import { getTracker } from '../services/analytics';
import { BUILD_VERSION } from '../version';

interface HeaderProps {
  onNavigatePage: (slug: string | null) => void;
  onNavigateTag: (tag: string | null) => void;
  onNavigatePost: (slug: string) => void;
  onNavigateAuthor: (slug: string) => void;
  onHome: () => void;
  onBlog: () => void;
}

export function Header({ onNavigatePage, onNavigateTag, onNavigatePost, onNavigateAuthor, onHome, onBlog }: HeaderProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openSubmenuIndex, setOpenSubmenuIndex] = useState<number | null>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    setOpenSubmenuIndex(null);
  };

  const handleNavClick = (action: () => void) => {
    action();
    setIsMenuOpen(false);
    setOpenSubmenuIndex(null);
  };

  const onItemClick = (item: NavItem, index: number) => {
    const isSubmenu = (item.subitems && item.subitems.length > 0) || item.type === 'menu';
    
    if (isSubmenu) {
      setOpenSubmenuIndex(openSubmenuIndex === index ? null : index);
    } else {
      if (item.type === 'blog') handleNavClick(onBlog);
      else if (item.type === 'page' && item.slug) handleNavClick(() => onNavigatePage(item.slug!));
      else if (item.type === 'tag' && item.slug) handleNavClick(() => onNavigateTag(item.slug!));
    }
  };

  // Close submenus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenSubmenuIndex(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchNavigate = (type: 'post' | 'page' | 'author', slug: string) => {
    if (type === 'post') onNavigatePost(slug);
    else if (type === 'page') onNavigatePage(slug);
    else if (type === 'author') onNavigateAuthor(slug);
    setIsMenuOpen(false);
  };

  const processedNav: NavItem[] = CONFIG.nav.map(item => {
    if (item.type === 'blog') {
      return {
        ...item,
        subitems: [
          { label: t.navigation.newest, type: 'blog' },
          ...CONFIG.themes.map(theme => ({
            label: theme.label,
            type: 'tag' as const,
            slug: theme.tag
          }))
        ]
      };
    }
    if (item.subitems) {
      return {
        ...item,
        subitems: item.subitems.filter(sub => sub.type !== 'blog')
      };
    }
    return item;
  });

  const renderNavItems = (isMobile = false) => {
    return processedNav.map((item, index) => {
      const isSubmenu = (item.subitems && item.subitems.length > 0) || item.type === 'menu';
      const isOpen = openSubmenuIndex === index;
      const label = item.label || item.slug || (item.type === 'blog' ? t.navigation.blog : '');
      
      if (isMobile) {
        return (
          <div key={index} className="flex flex-col gap-4">
            <button 
              onClick={() => onItemClick(item, index)} 
              className="flex items-center justify-between hover:text-brand-accent transition-colors text-left"
            >
              {label}
              <div className="flex items-center gap-3">
                {isSubmenu && (
                  <ChevronDown 
                    size={20} 
                    className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
                  />
                )}
                <div className={`w-2 h-2 rounded-full ${index === 0 ? 'bg-brand-accent' : 'bg-brand-accent/40'}`} />
              </div>
            </button>
            <AnimatePresence>
              {isSubmenu && isOpen && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-4 pl-6 border-l border-white/10"
                >
                  {item.subitems!.map((sub, sIdx) => {
                    const subLabel = sub.label || sub.slug || '';
                    return (
                      <button
                        key={`${index}-${sIdx}`}
                        onClick={() => {
                          if (sub.type === 'blog') handleNavClick(onBlog);
                          else if (sub.type === 'page' && sub.slug) handleNavClick(() => onNavigatePage(sub.slug!));
                          else if (sub.type === 'tag' && sub.slug) handleNavClick(() => onNavigateTag(sub.slug!));
                        }}
                        className="text-slate-400 hover:text-brand-accent transition-colors text-left text-base font-medium"
                      >
                        {subLabel}
                      </button>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      }

      return (
        <div key={index} className="relative">
          <button 
            onClick={() => onItemClick(item, index)} 
            className={`flex items-center gap-1.5 hover:text-brand-accent transition-colors whitespace-nowrap ${isOpen ? 'text-brand-accent' : ''}`}
          >
            {label}
            {isSubmenu && (
              <ChevronDown 
                size={14} 
                className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
              />
            )}
          </button>

          <AnimatePresence>
            {isSubmenu && isOpen && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-4 py-2 min-w-[200px] bg-black/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl shadow-black"
                role="menu"
              >
                {item.subitems!.map((sub, sIdx) => {
                  const subLabel = sub.label || sub.slug || '';
                  return (
                    <button
                      key={`${index}-${sIdx}`}
                      onClick={() => {
                        if (sub.type === 'blog') handleNavClick(onBlog);
                        else if (sub.type === 'page' && sub.slug) handleNavClick(() => onNavigatePage(sub.slug!));
                        else if (sub.type === 'tag' && sub.slug) handleNavClick(() => onNavigateTag(sub.slug!));
                      }}
                      className="w-full px-6 py-2.5 text-left text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                      role="menuitem"
                    >
                      {subLabel}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  return (
    <header 
      ref={headerRef}
      data-testid="header"
      className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-12">
          <button 
            onClick={onHome}
            className="text-lg md:text-xl font-black tracking-tight text-white hover:text-brand-accent transition-colors flex items-center gap-3"
            aria-label={`${t.navigation.home} - Kaavatietomalli.fi`}
          >
            <div className="relative w-8 h-8 md:w-10 md:h-10 flex items-center justify-center">
              {/* Fallback CSS Logo - hidden if image is found or can be replaced by user */}
              <img 
                src={`${CONFIG.basePath.replace(/\/$/, '')}/images/kaavatietomalli-logo.svg`} 
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
            <span className="hidden sm:inline">Kaavatietomalli.fi</span>
            <span className="sm:hidden text-brand-accent">Kaavatietomalli.fi</span>
          </button>
          
          <nav className="hidden md:flex gap-10 text-sm font-semibold text-slate-400" aria-label={t.navigation.mainNav}>
            {renderNavItems()}
          </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden sm:flex items-center gap-6">
            <SearchWidget onNavigate={handleSearchNavigate} />
            <div className="w-[1px] h-4 bg-white/10" />
            <a 
              href={`https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-white transition-colors" 
              aria-label={t.navigation.githubRepo}
              onClick={() => getTracker().trackCTA('GitHub Repo', `https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}`, 'header')}
            >
              <Github size={20} strokeWidth={1.5} />
            </a>
          </div>
          
          {/* Mobile Menu Button */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
            onClick={toggleMenu}
            aria-label={isMenuOpen ? t.navigation.closeMenu : t.navigation.openMenu}
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
              <div className="pb-4 border-b border-white/5">
                <SearchWidget onNavigate={handleSearchNavigate} isMobile />
              </div>
              {renderNavItems(true)}
              
              <div className="flex gap-6 pt-6 border-t border-white/5 mt-2">
                <a 
                  href={`https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium"
                  onClick={() => getTracker().trackCTA('GitHub Repo', `https://github.com/${CONFIG.repoOwner}/${CONFIG.repoName}`, 'mobile_nav')}
                >
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
  const t = getTranslations(CONFIG.language as Language);

  const buildYear = (() => {
    try {
      const versionNum = Number(BUILD_VERSION);
      if (versionNum && versionNum > 0) {
        const year = new Date(versionNum).getFullYear();
        if (!isNaN(year) && year > 1970) return year.toString();
      }
    } catch (e) {}
    return new Date().getFullYear().toString();
  })();

  return (
    <footer data-testid="footer" className="py-12 border-t border-white/5 bg-black/40">
      <div className="max-w-7xl mx-auto px-6 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 pb-4">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.common.rights}</span>
              <span className="text-sm font-semibold text-slate-200">&copy; {buildYear} Spatineo Oy ja kirjoittajat</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t.common.contact}</span>
              <span className="text-sm font-semibold text-slate-200">kaavatietomalli@spatineo.com</span>
            </div>
          </div>
          <div className="text-left md:text-left">
            <SpatineoLogo width={250} height={70} className="header-logo" />
          </div>
        </div>
        <div className="border-t border-white/5 pt-4 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-600 font-mono">
          <span>Versio: {BUILD_VERSION}</span>
        </div>
      </div>
    </footer>
  );
}
