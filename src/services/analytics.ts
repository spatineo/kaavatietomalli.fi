import { CONFIG } from '../config';

export enum AnalyticsEvent {
  PAGE_VIEW = 'page_view',
  POST_VIEW = 'post_view',
  AUTHOR_VIEW = 'author_view',
  CTA_CLICK = 'cta_click',
}

export interface AnalyticsTracker {
  trackPageView(path: string, title?: string): void;
  trackPostView(slug: string, title: string): void;
  trackAuthorView(slug: string, name: string): void;
  trackCTA(label: string, url?: string, context?: string): void;
}

class NullTracker implements AnalyticsTracker {
  trackPageView() {}
  trackPostView() {}
  trackAuthorView() {}
  trackCTA() {}
}

class GoogleAnalyticsTracker implements AnalyticsTracker {
  private measurementId: string;
  private initialized: boolean = false;

  constructor(measurementId: string) {
    this.measurementId = measurementId;
    this.init();
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

  trackPageView(path: string, title?: string) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'page_view', {
        page_path: path,
        page_title: title,
        send_to: this.measurementId
      });
    }
  }

  trackPostView(slug: string, title: string) {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'post_view', {
        post_slug: slug,
        post_title: title,
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

export function getTracker(): AnalyticsTracker {
  if (activeTracker) return activeTracker;

  const gaId = (CONFIG as any).analytics?.gaTrackingId;
  if (gaId) {
    activeTracker = new GoogleAnalyticsTracker(gaId);
  } else {
    activeTracker = new NullTracker();
  }

  return activeTracker;
}
