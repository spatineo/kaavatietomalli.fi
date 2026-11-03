import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';
import { isChunkLoadError } from '../lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
    if (isChunkLoadError(error)) {
      window.dispatchEvent(new CustomEvent('app:chunkLoadError', { detail: { error } }));
    }
  }

  private handleBackToHome = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
    // Navigate home using window location or history, or force home redirect
    window.location.href = window.location.origin + (import.meta.env.BASE_URL || '/');
  };

  private handleReload = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('version', Date.now().toString());
    window.location.replace(url.toString());
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const t = getTranslations(CONFIG.language as Language);
      const isChunk = isChunkLoadError(this.state.error);

      return (
        <div id="error-boundary-card" className="max-w-xl mx-auto my-12 p-8 rounded-2xl bg-red-950/10 border border-red-500/20 text-center backdrop-blur-sm">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 mx-auto mb-6">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-3">
            {isChunk ? t.versionMismatch.title : t.errorBoundary.title}
          </h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            {isChunk ? t.versionMismatch.description : t.errorBoundary.description}
          </p>
          {this.state.error && (
            <pre className="text-[11px] font-mono bg-black/40 text-red-300/80 p-4 rounded-xl mb-6 text-left overflow-x-auto max-h-32 border border-white/5">
              {this.state.error.toString()}
            </pre>
          )}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            {isChunk && (
              <button
                id="error-reload-btn"
                onClick={this.handleReload}
                className="px-5 py-2.5 bg-brand-accent hover:bg-brand-accent/90 text-black rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-brand-accent/5 inline-flex items-center gap-2 cursor-pointer"
              >
                <RefreshCw size={14} />
                <span>{t.versionMismatch.button}</span>
              </button>
            )}
            <button
              id="error-reset-btn"
              onClick={this.handleBackToHome}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg border border-white/10 inline-flex items-center gap-2 cursor-pointer"
            >
              {t.errorBoundary.button}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
