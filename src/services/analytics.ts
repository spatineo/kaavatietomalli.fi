import { CONFIG } from '../config';
import { getConsent } from './consent';

export enum AnalyticsEvent {
  PAGE_VIEW = 'page_view',
  POST_VIEW = 'post_view',
  AUTHOR_VIEW = 'author_view',
  CTA_CLICK = 'cta_click',
}

export interface AnalyticsTracker {
  trackPageView(path: string, title?: string, tags?: string[]): void;
  trackPostView(slug: string, title: string, tags?: string[]): void;
  trackAuthorView(slug: string, name: string): void;
  trackCTA(label: string, url?: string, context?: string): void;
}

let lastTrackedPageView: { path: string; title?: string; tags?: string[] } | null = null;
let lastTrackedPostView: { slug: string; title: string; tags?: string[] } | null = null;

class NullTracker implements AnalyticsTracker {
  trackPageView(path: string, title?: string, tags?: string[]) {
    lastTrackedPageView = { path, title, tags };
  }
  trackPostView(slug: string, title: string, tags?: string[]) {
    lastTrackedPostView = { slug, title, tags };
  }
  trackAuthorView() {}
  trackCTA() {}
}

class GoogleAnalyticsTracker implements AnalyticsTracker {
  private measurementId: string;
  private initialized: boolean = false;

  constructor(measurementId: string) {
    this.measurementId = measurementId;
    this.init();
    
    // Replay last tracked view if it happened before consent was granted
    if (lastTrackedPostView) {
      this.trackPostView(lastTrackedPostView.slug, lastTrackedPostView.title, lastTrackedPostView.tags);
      lastTrackedPostView = null;
    }
    if (lastTrackedPageView) {
      this.trackPageView(lastTrackedPageView.path, lastTrackedPageView.title, lastTrackedPageView.tags);
      lastTrackedPageView = null;
    }
  }

  private init() {
    if (typeof window === 'undefined' || this.initialized) return;

    // Load GA4 script
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    // Initialize dataLayer
    (window as any).dataLayer = (window as any).dataLayer || [];
    function gtag(...args: any[]) {
      (window as any).dataLayer.push(args);
    }
    (window as any).gtag = gtag;
    gtag('js', new Date());
    gtag('config', this.measurementId, {
      send_page_view: false // We'll handle page views manually
    });

    this.initialized = true;
  }

  trackPageView(path: string, title?: string, tags?: string[]) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: path,
        page_title: title,
        content_tags: tags?.join(', '),
        send_to: this.measurementId
      });
    }
  }

  trackPostView(slug: string, title: string, tags?: string[]) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'post_view', {
        post_slug: slug,
        post_title: title,
        content_tags: tags?.join(', '),
        send_to: this.measurementId
      });
    }
  }

  trackAuthorView(slug: string, name: string) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'author_view', {
        author_slug: slug,
        author_name: name,
        send_to: this.measurementId
      });
    }
  }

  trackCTA(label: string, url?: string, context?: string) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'cta_click', {
        cta_label: label,
        cta_url: url,
        cta_context: context,
        send_to: this.measurementId
      });
    }
  }
}

let activeTracker: AnalyticsTracker | null = null;
let currentConsent: boolean | null = null;

export function getTracker(): AnalyticsTracker {
  const consent = getConsent();
  const consentGranted = consent?.analytics || false;

  // If consent changed, we might need to swap the tracker
  if (currentConsent !== consentGranted) {
    activeTracker = null;
    currentConsent = consentGranted;
    
    // Handle GA-specific unloading/disabling
    const gaId = (CONFIG as any).analytics?.gaTrackingId;
    if (gaId && typeof window !== 'undefined') {
      if (!consentGranted) {
        (window as any)[`ga-disable-${gaId}`] = true;
      } else {
        (window as any)[`ga-disable-${gaId}`] = false;
      }
    }
  }

  if (activeTracker) return activeTracker;

  const gaId = (CONFIG as any).analytics?.gaTrackingId;
  
  if (gaId && consentGranted) {
    activeTracker = new GoogleAnalyticsTracker(gaId);
  } else {
    activeTracker = new NullTracker();
  }

  return activeTracker;
}

// Global listener for consent updates to ensure immediate reaction
if (typeof window !== 'undefined') {
  window.addEventListener('cookie_consent_updated', () => {
    getTracker(); // This will trigger the currentConsent check and disable GA if needed
  });
}
