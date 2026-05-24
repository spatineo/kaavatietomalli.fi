import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BUILD_VERSION } from '../version';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { fetchServerVersion } from '../lib/utils';

export function VersionMismatchPrompt() {
  const [hasMismatch, setHasMismatch] = useState(false);
  const [detectedVersion, setDetectedVersion] = useState<string | null>(null);
  const t = getTranslations(CONFIG.language as Language);

  const performCheck = async () => {
    const sVer = await fetchServerVersion();
    if (sVer && sVer !== BUILD_VERSION) {
      setDetectedVersion(sVer);
      setHasMismatch(true);
    }
  };

  useEffect(() => {
    // Clean up version query parameter from the URL after successful reloading
    const url = new URL(window.location.href);
    if (url.searchParams.has('version')) {
      url.searchParams.delete('version');
      window.history.replaceState({}, '', url.toString());
    }
  }, []);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const startInterval = () => {
      if (!intervalId) {
        intervalId = setInterval(performCheck, 15 * 60 * 1000);
      }
    };

    const stopInterval = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    const checkAndSchedule = () => {
      const isVisible = document.visibilityState === 'visible';
      const isFocused = document.hasFocus();
      
      if (isVisible && isFocused) {
        performCheck();
        startInterval();
      } else {
        stopInterval();
      }
    };

    // Listen to visibility and focus/blur changes
    const handleVisibilityChange = () => {
      checkAndSchedule();
    };

    const handleFocus = () => {
      checkAndSchedule();
    };

    const handleBlur = () => {
      checkAndSchedule();
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Catch ChunkLoadErrors and blank-page triggers instantly
    const handleError = (event: ErrorEvent) => {
      const msg = (event.message || '').toLowerCase();
      if (
        msg.includes('chunk') || 
        msg.includes('loading chunk') || 
        msg.includes('dynamically imported') || 
        msg.includes('failed to fetch dynamically')
      ) {
        performCheck();
      }
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason && reason instanceof Error) {
        const msg = reason.message.toLowerCase();
        if (msg.includes('chunk') || msg.includes('loading') || msg.includes('fetch')) {
          performCheck();
        }
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Initial evaluation on load
    checkAndSchedule();

    return () => {
      stopInterval();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  const handleReload = () => {
    const url = new URL(window.location.href);
    const bypassVersion = detectedVersion || Date.now().toString();
    url.searchParams.set('version', bypassVersion);
    window.location.replace(url.toString());
  };

  return (
    <AnimatePresence>
      {hasMismatch && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-6 font-sans"
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            className="max-w-md w-full bg-brand-bg border border-white/10 rounded-3xl p-10 shadow-2xl relative overflow-hidden"
          >
            {/* Ambient subtle color background highlight */}
            <div className="absolute -top-16 -right-16 w-32 h-32 bg-brand-accent/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-8">
                <AlertTriangle className="w-8 h-8 text-brand-accent" />
              </div>

              <h2 className="text-2xl font-black tracking-tighter text-white mb-4">
                {t.versionMismatch.title}
              </h2>

              <p className="text-slate-400 mb-8 leading-relaxed font-medium text-sm">
                {t.versionMismatch.description}
              </p>

              <button
                onClick={handleReload}
                className="w-full flex items-center justify-center gap-3 bg-brand-accent text-brand-bg font-black uppercase tracking-widest py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand-accent/20 cursor-pointer"
              >
                <RefreshCw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
                <span>{t.versionMismatch.button}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
