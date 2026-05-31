import { CONFIG } from '../config';
import { getConsent } from './consent';

export enum AnalyticsEvent {
  PAGE_VIEW = 'page_view',
  POST_VIEW = 'post_view',
  AUTHOR_VIEW = 'author_view',
  CTA_CLICK = 'cta_click',
}

export interface AnalyticsTracker {
  trackPageView(path: string, title?: string, tags?: string[], partner?: string): void;
  trackPostView(slug: string, title: string, tags?: string[], partner?: string): void;
  trackAuthorView(slug: string, name: string, partner?: string): void;
  trackCTA(label: string, url?: string, context?: string, partner?: string): void;
}

let lastTrackedPageView: { path: string; title?: string; tags?: string[]; partner?: string } | null = null;
let lastTrackedPostView: { slug: string; title: string; tags?: string[]; partner?: string } | null = null;

// Test Spy helper to easily assert analytics submissions in Vitest & E2E tests
export function trackEventSpy(event: string, data: any) {
  if (typeof window !== 'undefined') {
    const win = window as any;
    win._trackedEvents = win._trackedEvents || [];
    win._trackedEvents.push({ event, data, timestamp: Date.now() });
  }
}

// Expose reset helper globally for tests
if (typeof window !== 'undefined') {
  (window as any)._resetTrackedEvents = () => {
    (window as any)._trackedEvents = [];
  };
}

class NullTracker implements AnalyticsTracker {
  trackPageView(path: string, title?: string, tags?: string[], partner?: string) {
    lastTrackedPageView = { path, title, tags, partner };
    trackEventSpy('page_view', { path, title, tags, partner });
  }
  trackPostView(slug: string, title: string, tags?: string[], partner?: string) {
    lastTrackedPostView = { slug, title, tags, partner };
    trackEventSpy('post_view', { slug, title, tags, partner });
  }
  trackAuthorView(slug: string, name: string, partner?: string) {
    trackEventSpy('author_view', { slug, name, partner });
  }
  trackCTA(label: string, url?: string, context?: string, partner?: string) {
    trackEventSpy('cta_click', { label, url, context, partner });
  }
}

class GoogleAnalyticsTracker implements AnalyticsTracker {
  private measurementId: string;
  private initialized: boolean = false;

  constructor(measurementId: string) {
    this.measurementId = measurementId;
    this.init();
    
    // Replay last tracked view if it happened before consent was granted
    if (lastTrackedPostView) {
      this.trackPostView(lastTrackedPostView.slug, lastTrackedPostView.title, lastTrackedPostView.tags, lastTrackedPostView.partner);
      lastTrackedPostView = null;
    }
    if (lastTrackedPageView) {
      this.trackPageView(lastTrackedPageView.path, lastTrackedPageView.title, lastTrackedPageView.tags, lastTrackedPageView.partner);
      lastTrackedPageView = null;
    }
  }

  private init() {
    if (typeof window === 'undefined' || this.initialized) return;

    (window as any).dataLayer = (window as any).dataLayer || [];
    
    const gtag = function(...args: any[]) {
      (window as any).dataLayer.push(arguments); 
    };
    
    (window as any).gtag = gtag;

    gtag('js', new Date());
    gtag('config', this.measurementId, {
      send_page_view: false // Correctly handled manually later
    });
    
    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.measurementId}`;
    script.async = true;
    document.head.appendChild(script);

    this.initialized = true;
  }

  trackPageView(path: string, title?: string, tags?: string[], partner?: string) {
    trackEventSpy('page_view', { path, title, tags, partner });
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const data: any = {
        page_path: path,
        page_title: title,
        content_tags: tags?.join(', '),
        send_to: this.measurementId
      };
      if (partner !== undefined) {
        data.partner = partner;
      }
      (window as any).gtag('event', 'page_view', data);
    }
  }

  trackPostView(slug: string, title: string, tags?: string[], partner?: string) {
    trackEventSpy('post_view', { slug, title, tags, partner });
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const data: any = {
        post_slug: slug,
        post_title: title,
        content_tags: tags?.join(', '),
        send_to: this.measurementId
      };
      if (partner !== undefined) {
        data.partner = partner;
      }
      (window as any).gtag('event', 'post_view', data);
    }
  }

  trackAuthorView(slug: string, name: string, partner?: string) {
    trackEventSpy('author_view', { slug, name, partner });
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const data: any = {
        author_slug: slug,
        author_name: name,
        send_to: this.measurementId
      };
      if (partner !== undefined) {
        data.partner = partner;
      }
      (window as any).gtag('event', 'author_view', data);
    }
  }

  trackCTA(label: string, url?: string, context?: string, partner?: string) {
    trackEventSpy('cta_click', { label, url, context, partner });
    if (typeof window !== 'undefined' && (window as any).gtag) {
      const data: any = {
        cta_label: label,
        cta_url: url,
        cta_context: context,
        send_to: this.measurementId
      };
      if (partner !== undefined) {
        data.partner = partner;
      }
      (window as any).gtag('event', 'cta_click', data);
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
