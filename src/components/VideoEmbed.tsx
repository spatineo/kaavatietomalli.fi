import { useState, useEffect } from 'react';
import { Play, EyeOff, ShieldAlert } from 'lucide-react';
import { getConsent, setConsent } from '../services/consent';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface VideoEmbedProps {
  platform: 'youtube' | 'vimeo';
  config: Record<string, any>;
}

export function VideoEmbed({ platform, config }: VideoEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasConsent, setHasConsent] = useState(() => {
    const consent = getConsent();
    return consent ? consent.analytics : false;
  });

  const t = getTranslations(CONFIG.language as Language);

  useEffect(() => {
    const handleConsentUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && typeof customEvent.detail.analytics === 'boolean') {
        setHasConsent(customEvent.detail.analytics);
      }
    };

    window.addEventListener('cookie_consent_updated', handleConsentUpdate);
    return () => {
      window.removeEventListener('cookie_consent_updated', handleConsentUpdate);
    };
  }, []);

  // Extract common/player configuration options
  const id = String(config.id || '').trim();
  const title = config.title;
  const aspectRatio = String(config.aspectRatio || '16:9').trim();

  // Parse aspect ratio into elegant Tailwind custom class
  const getAspectClass = (ratio: string) => {
    if (ratio === '4:3') return 'aspect-[4/3]';
    if (ratio === '1:1') return 'aspect-square';
    if (ratio === '9:16') return 'aspect-[9/16]';
    return 'aspect-video'; // Default 16:9
  };

  const aspectClass = getAspectClass(aspectRatio);

  let embedUrl = '';
  let iframeTitle = platform === 'youtube' ? 'YouTube Video Embed' : 'Vimeo Video Embed';

  if (platform === 'youtube') {
    const params = new URLSearchParams();

    // Map each official YouTube player parameter
    // 1. autoplay (needs mute=1 for most browsers to actually function on load)
    const isAutoplay = config.autoplay === true || config.autoplay === 1 || String(config.autoplay).toLowerCase() === 'true';
    if (isAutoplay) {
      params.set('autoplay', '1');
    }

    // 2. mute (or force for autoplay)
    const isMuted = config.mute === true || config.mute === 1 || String(config.mute).toLowerCase() === 'true' || isAutoplay;
    if (isMuted) {
      params.set('mute', '1');
    }

    // 3. controls
    if (config.controls !== undefined) {
      const controlsVal = config.controls === false || config.controls === 0 ? '0' : String(config.controls);
      params.set('controls', controlsVal);
    }

    // 4. cc_load_policy
    if (config.cc_load_policy !== undefined) {
      const ccVal = config.cc_load_policy === true || config.cc_load_policy === 1 ? '1' : '0';
      params.set('cc_load_policy', ccVal);
    }

    // 5. disablekb
    if (config.disablekb !== undefined) {
      const kbVal = config.disablekb === true || config.disablekb === 1 ? '1' : '0';
      params.set('disablekb', kbVal);
    }

    // 6. enablejsapi
    if (config.enablejsapi !== undefined) {
      const jsapiVal = config.enablejsapi === true || config.enablejsapi === 1 ? '1' : '0';
      params.set('enablejsapi', jsapiVal);
    }

    // 7. end
    if (config.end !== undefined) {
      params.set('end', String(config.end));
    }

    // 8. fs (fullscreen)
    if (config.fs !== undefined) {
      const fsVal = config.fs === false || config.fs === 0 ? '0' : '1';
      params.set('fs', fsVal);
    }

    // 9. hl (language)
    if (config.hl !== undefined) {
      params.set('hl', String(config.hl));
    }

    // 10. iv_load_policy
    if (config.iv_load_policy !== undefined) {
      params.set('iv_load_policy', String(config.iv_load_policy));
    }

    // 11. loop and playlist (YouTube requires the playlist parameter to contain the video ID to loop a single video)
    const isLoop = config.loop === true || config.loop === 1 || String(config.loop).toLowerCase() === 'true';
    if (isLoop) {
      params.set('loop', '1');
      params.set('playlist', config.playlist ? String(config.playlist) : id);
    } else if (config.playlist !== undefined) {
      params.set('playlist', String(config.playlist));
    }

    // 12. modestbranding
    if (config.modestbranding !== undefined) {
      const mbVal = config.modestbranding === true || config.modestbranding === 1 || String(config.modestbranding).toLowerCase() === 'true' ? '1' : '0';
      params.set('modestbranding', mbVal);
    }

    // 13. playsinline
    if (config.playsinline !== undefined) {
      const piVal = config.playsinline === true || config.playsinline === 1 || String(config.playsinline).toLowerCase() === 'true' ? '1' : '0';
      params.set('playsinline', piVal);
    }

    // 14. rel
    if (config.rel !== undefined) {
      const relVal = config.rel === true || config.rel === 1 || String(config.rel).toLowerCase() === 'true' ? '1' : '0';
      params.set('rel', relVal);
    }

    // 15. start
    if (config.start !== undefined) {
      params.set('start', String(config.start));
    }

    // Handle Title attribute
    if (typeof title === 'string') {
      iframeTitle = title;
    }

    const queryStr = params.toString();
    embedUrl = `https://www.youtube-nocookie.com/embed/${id}${queryStr ? '?' + queryStr : ''}`;

  } else if (platform === 'vimeo') {
    const params = new URLSearchParams();

    // Extract potential private video embed hash if formatted as "76979871/abc12345"
    let finalId = id;
    let finalHash = config.hash ? String(config.hash) : '';
    if (finalId.includes('/')) {
      const parts = finalId.split('/');
      finalId = parts[0];
      finalHash = parts[1];
    }

    if (finalHash) {
      params.set('h', finalHash);
    }

    // Map each official Vimeo player parameter
    // 1. autoplay (needs muted=1 for standard browsers to allow)
    const isAutoplay = config.autoplay === true || config.autoplay === 1 || String(config.autoplay).toLowerCase() === 'true';
    if (isAutoplay) {
      params.set('autoplay', '1');
    }

    // 2. autopause
    if (config.autopause !== undefined) {
      const apVal = config.autopause === false || config.autopause === 0 ? '0' : '1';
      params.set('autopause', apVal);
    }

    // 3. background (forces looping, muted, hide controls)
    const isBackground = config.background === true || config.background === 1 || String(config.background).toLowerCase() === 'true';
    if (isBackground) {
      params.set('background', '1');
    }

    // 4. byline
    if (config.byline !== undefined) {
      const bylineVal = config.byline === false || config.byline === 0 ? '0' : '1';
      params.set('byline', bylineVal);
    }

    // 5. color
    if (config.color !== undefined) {
      params.set('color', String(config.color));
    }

    // 6. controls
    if (config.controls !== undefined) {
      const ctrlVal = config.controls === false || config.controls === 0 ? '0' : '1';
      params.set('controls', ctrlVal);
    }

    // 7. dnt (Do Not Track)
    if (config.dnt !== undefined) {
      const dntVal = config.dnt === true || config.dnt === 1 || String(config.dnt).toLowerCase() === 'true' ? '1' : '0';
      params.set('dnt', dntVal);
    }

    // 8. keyboard
    if (config.keyboard !== undefined) {
      const kbVal = config.keyboard === false || config.keyboard === 0 ? '0' : '1';
      params.set('keyboard', kbVal);
    }

    // 9. loop
    const isLoop = config.loop === true || config.loop === 1 || String(config.loop).toLowerCase() === 'true';
    if (isLoop) {
      params.set('loop', '1');
    }

    // 10. muted / mute
    const muteVal = config.muted !== undefined ? config.muted : config.mute;
    const isMuted = muteVal === true || muteVal === 1 || String(muteVal).toLowerCase() === 'true' || isAutoplay || isBackground;
    if (isMuted) {
      params.set('muted', '1');
    }

    // 11. pip
    if (config.pip !== undefined) {
      const pipVal = config.pip === false || config.pip === 0 ? '0' : '1';
      params.set('pip', pipVal);
    }

    // 12. playsinline
    if (config.playsinline !== undefined) {
      const piVal = config.playsinline === false || config.playsinline === 0 ? '0' : '1';
      params.set('playsinline', piVal);
    }

    // 13. portrait
    if (config.portrait !== undefined) {
      const portVal = config.portrait === false || config.portrait === 0 ? '0' : '1';
      params.set('portrait', portVal);
    }

    // 14. quality
    if (config.quality !== undefined) {
      params.set('quality', String(config.quality));
    }

    // 15. speed
    if (config.speed !== undefined) {
      const speedVal = config.speed === true || config.speed === 1 || String(config.speed).toLowerCase() === 'true' ? '1' : '0';
      params.set('speed', speedVal);
    }

    // 16. title (boolean or string)
    if (typeof title === 'boolean') {
      params.set('title', title ? '1' : '0');
    } else if (config.title !== undefined) {
      const tVal = config.title === false || config.title === 0 ? '0' : '1';
      params.set('title', tVal);
    }

    // Handle Title attribute
    if (typeof title === 'string') {
      iframeTitle = title;
    }

    const queryStr = params.toString();
    embedUrl = `https://player.vimeo.com/video/${finalId}${queryStr ? '?' + queryStr : ''}`;
  }

  if (!id) {
    return (
      <div className="flex items-center gap-2 p-4 border border-dashed border-red-500/30 rounded-xl bg-red-500/5 text-red-500 text-xs font-mono">
        <EyeOff size={14} />
        <span>Video container matches empty ID value.</span>
      </div>
    );
  }

  return (
    <div className="my-10 relative rounded-2xl border border-white/10 overflow-hidden bg-black shadow-2xl group">
      {/* Top status bar describing video embed platform */}
      <div className="bg-black text-[10px] uppercase font-bold tracking-[0.2em] px-4 py-3 border-b border-white/5 text-white/40 flex justify-between items-center select-none">
        <span className="flex items-center gap-2">
          <Play size={10} className="text-brand-accent animate-pulse" />
          {platform} media player
        </span>
        {aspectRatio !== '16:9' && (
          <span className="text-[8px] opacity-60 font-mono tracking-widest">{aspectRatio} AR</span>
        )}
      </div>

      <div className={`relative w-full ${aspectClass} overflow-hidden bg-slate-950 flex flex-col items-center justify-center`}>
        {!hasConsent ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-slate-950/95 z-10">
            <div className="p-3.5 rounded-full bg-amber-500/10 text-amber-400 mb-4 border border-amber-500/20 shadow-inner">
              <ShieldAlert size={28} className="animate-pulse text-brand-accent" />
            </div>
            <p className="max-w-md text-sm text-slate-300 mb-6 font-medium leading-relaxed">
              {t.video.consentRequired}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <button
                type="button"
                onClick={() => setConsent(true)}
                className="px-5 py-2.5 rounded-lg bg-brand-accent text-slate-950 hover:bg-opacity-90 font-semibold text-xs tracking-wider uppercase transition-all duration-200 shadow-md cursor-pointer"
              >
                {t.video.enableAnalytics}
              </button>
              <button
                type="button"
                onClick={() => (window as any).openCookieSettings?.()}
                className="px-4 py-2.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 text-xs font-semibold tracking-wider uppercase transition-all duration-200 cursor-pointer border border-white/5"
              >
                {t.consent.customize}
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Skeleton/Loading State */}
            {isLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-slate-500 text-xs font-mono animate-pulse">
                <div className="w-8 h-8 rounded-full border border-white/10 border-t-brand-accent animate-spin" />
                <span className="text-[8px] uppercase tracking-[0.3em] font-bold text-slate-400">Loading {platform} component...</span>
              </div>
            )}

            <iframe
              src={embedUrl}
              title={iframeTitle}
              onLoad={() => setIsLoading(false)}
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              loading="lazy"
            />
          </>
        )}
      </div>
    </div>
  );
}
