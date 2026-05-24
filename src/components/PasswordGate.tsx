import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { checkBackendVersion } from './VersionMismatchPrompt';

interface PasswordGateProps {
  children: React.ReactNode;
}

export function PasswordGate({ children }: PasswordGateProps) {
  const password = import.meta.env.VITE_PRELAUNCH_PASSWORD;
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Check if previously authenticated in this session
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('prelaunch_authenticated') === 'true';
    }
    return false;
  });

  // If no password is set, allow access
  if (!password) {
    return <>{children}</>;
  }

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (input === password) {
      const compatible = await checkBackendVersion();
      if (!compatible) {
        // Version mismatch detected. Global prompt will catch this and show.
        return;
      }
      sessionStorage.setItem('prelaunch_authenticated', 'true');
      setIsAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setInput('');
    }
  };

  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-10 backdrop-blur-xl shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-accent/10 flex items-center justify-center mb-8">
            <Lock className="w-8 h-8 text-brand-accent" />
          </div>
          
          <h1 className="text-3xl font-black tracking-tighter text-white mb-4">
            Kaavatietomalli<span className="text-brand-accent">.fi</span>
          </h1>
          
          <p className="text-slate-400 mb-10 leading-relaxed font-medium">
            Sivusto on vielä työn alla. Syötä salasana jatkaaksesi.
          </p>
          
          <form onSubmit={handleSubmit} className="w-full space-y-6">
            <div className="relative">
              <input
                id="prelaunch-password"
                type="password"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Salasana"
                className={`w-full bg-white/5 border ${error ? 'border-red-500/50' : 'border-white/10'} rounded-2xl px-6 py-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-accent/50 transition-all text-left tracking-widest`}
                autoFocus
              />
              {error && (
                <motion.p 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-400 text-xs font-bold uppercase tracking-widest mt-4"
                >
                  Väärä salasana
                </motion.p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full bg-brand-accent text-brand-bg font-black uppercase tracking-widest py-4 rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-brand-accent/20"
            >
              Kirjaudu sisään
            </button>
          </form>
          
          <div className="mt-12 pt-8 border-t border-white/5 w-full">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">
              Spatineo Oy
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
