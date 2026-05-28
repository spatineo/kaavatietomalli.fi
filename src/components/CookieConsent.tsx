import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { getConsent, setConsent } from '../services/consent';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  
  const t = getTranslations(CONFIG.language as Language);

  useEffect(() => {
    const handleOpenConsent = () => {
      console.log('[DEBUG] open_cookie_consent event received');
      const current = getConsent();
      if (current) {
        setAnalyticsEnabled(current.analytics);
      }
      setIsVisible(false); // Reset to trigger AnimatePresence if it was already open
      setTimeout(() => {
        setIsVisible(true);
        setIsExpanded(true);
      }, 50);
    };

    const handleConsentUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.analytics === 'boolean') {
        setAnalyticsEnabled(customEvent.detail.analytics);
      }
    };

    window.addEventListener('open_cookie_consent', handleOpenConsent);
    window.addEventListener('cookie_consent_updated', handleConsentUpdate);
    // Add global fallback
    (window as any).openCookieSettings = handleOpenConsent;

    const consent = getConsent();
    if (consent) {
      setAnalyticsEnabled(consent.analytics);
    } else {
      // Delay showing the banner for better UX if no consent yet
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('open_cookie_consent', handleOpenConsent);
        window.removeEventListener('cookie_consent_updated', handleConsentUpdate);
      };
    }

    return () => {
      window.removeEventListener('open_cookie_consent', handleOpenConsent);
      window.removeEventListener('cookie_consent_updated', handleConsentUpdate);
      delete (window as any).openCookieSettings;
    };
  }, []);

  useEffect(() => {
    if (isVisible) {
      const consent = getConsent();
      if (consent) {
        setAnalyticsEnabled(consent.analytics);
      }
    }
  }, [isVisible]);

  const handleAcceptAll = () => {
    setConsent(true);
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    setConsent(false);
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    setConsent(analyticsEnabled);
    setIsVisible(false);
  };

  return (
    <>
      <AnimatePresence>
        {!isVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed bottom-6 right-6 z-[90] pointer-events-auto"
          >
            <motion.button
              whileHover="hover"
              initial="initial"
              onClick={() => setIsVisible(true)}
              className="flex items-center bg-slate-900 border border-white/10 rounded-full shadow-2xl overflow-hidden group"
            >
              <div className="p-3 bg-brand-accent/10 text-brand-accent">
                <Cookie size={20} />
              </div>
              <motion.div
                variants={{
                  initial: { width: 0, opacity: 0 },
                  hover: { width: 'auto', opacity: 1 }
                }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="pr-5 pl-1 text-[11px] font-black uppercase tracking-wider text-slate-200">
                  {t.consent.customize}
                </span>
              </motion.div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isVisible && (
          <motion.div
            key="cookie-consent-banner"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 z-[100] p-4 sm:p-6 pointer-events-none"
          >
          <div className="max-w-4xl mx-auto bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl pointer-events-auto overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="p-3 bg-brand-accent/10 rounded-2xl text-brand-accent shrink-0">
                  <Cookie size={32} />
                </div>
                
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-2">{t.consent.title}</h3>
                  <p className="text-slate-400 text-sm sm:text-base leading-relaxed mb-6">
                    {t.consent.description}
                  </p>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mb-6 space-y-4"
                      >
                        {/* Essentials */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-white text-sm">{t.consent.essentials.title}</h4>
                            <div className="px-2 py-0.5 bg-brand-accent/20 text-brand-accent text-[10px] font-bold uppercase rounded">
                              {t.common.all}
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">{t.consent.essentials.description}</p>
                        </div>
                        
                        {/* Analytics */}
                        <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-bold text-white text-sm">{t.consent.analytics.title}</h4>
                            <button 
                              onClick={() => setAnalyticsEnabled(!analyticsEnabled)}
                              className={`w-10 h-5 rounded-full transition-colors relative ${analyticsEnabled ? 'bg-brand-accent' : 'bg-slate-700'}`}
                            >
                              <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${analyticsEnabled ? 'left-6' : 'left-1'}`} />
                            </button>
                          </div>
                          <p className="text-xs text-slate-500">{t.consent.analytics.description}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <div className="flex flex-wrap gap-3">
                    {!isExpanded ? (
                      <>
                        <button 
                          onClick={handleAcceptAll}
                          className="px-6 py-3 bg-brand-accent text-brand-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity"
                        >
                          {t.consent.acceptAll}
                        </button>
                        <button 
                          onClick={handleRejectAll}
                          className="px-6 py-3 bg-white/5 text-white border border-white/10 rounded-xl font-bold text-sm hover:bg-white/10 transition-colors"
                        >
                          {t.consent.rejectAll}
                        </button>
                        <button 
                          onClick={() => setIsExpanded(true)}
                          className="px-6 py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          {t.consent.customize} <ChevronDown size={16} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button 
                          onClick={handleSavePreferences}
                          className="px-6 py-3 bg-brand-accent text-brand-primary rounded-xl font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-2"
                        >
                          <Check size={18} /> {t.consent.save}
                        </button>
                        <button 
                          onClick={() => setIsExpanded(false)}
                          className="px-6 py-3 text-slate-400 hover:text-white transition-colors text-sm font-medium flex items-center gap-2"
                        >
                          <ChevronUp size={16} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
