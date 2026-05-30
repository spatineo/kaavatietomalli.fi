import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getConsent, setConsent } from './consent';
import { getTracker, trackEventSpy, AnalyticsEvent } from './analytics';
import { CONFIG } from '../config';

const CONSENT_KEY = 'cookie_consent_settings';

describe('Cookie Consent Service', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('dispatchEvent', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return null when no consent has been configured', () => {
    expect(getConsent()).toBeNull();
  });

  it('should persist consent analytics granted to localStorage with a timestamp', () => {
    setConsent(true);
    const stored = localStorage.getItem(CONSENT_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.analytics).toBe(true);
    expect(parsed.timestamp).toBeDefined();
    expect(new Date(parsed.timestamp).getTime()).not.toBeNaN();

    const consent = getConsent();
    expect(consent).not.toBeNull();
    expect(consent!.analytics).toBe(true);
  });

  it('should persist consent analytics rejected to localStorage with a timestamp', () => {
    setConsent(false);
    const stored = localStorage.getItem(CONSENT_KEY);
    expect(stored).not.toBeNull();

    const parsed = JSON.parse(stored!);
    expect(parsed.analytics).toBe(false);
    expect(parsed.timestamp).toBeDefined();

    const consent = getConsent();
    expect(consent).not.toBeNull();
    expect(consent!.analytics).toBe(false);
  });

  it('should return null if the stored value is malformed JSON', () => {
    localStorage.setItem(CONSENT_KEY, '{invalid_json}');
    expect(getConsent()).toBeNull();
  });

  it('should dispatch cookie_consent_updated window custom event on consent update', () => {
    const dispatchSpy = vi.fn();
    vi.stubGlobal('dispatchEvent', dispatchSpy);

    setConsent(true);

    expect(dispatchSpy).toHaveBeenCalledTimes(1);
    const dispatchedEvent = dispatchSpy.mock.calls[0][0];
    expect(dispatchedEvent.type).toBe('cookie_consent_updated');
    expect(dispatchedEvent.detail).toBeDefined();
    expect(dispatchedEvent.detail.analytics).toBe(true);
  });
});

describe('Analytics Tracking Service and Blocking Integrity', () => {
  const gaId = CONFIG.analytics?.gaTrackingId || 'G-E9YTLR7C10';
  let appendedScripts: any[] = [];

  beforeEach(() => {
    localStorage.clear();
    appendedScripts = [];

    // Reset global window traces
    const win = window as any;
    win._trackedEvents = [];
    delete win.gtag;
    delete win.dataLayer;
    delete win[`ga-disable-${gaId}`];

    // Mock document.head.appendChild to intercept tracking scripts and avoid Happy DOM script loading warnings
    const originalAppendChild = document.head.appendChild;
    vi.spyOn(document.head, 'appendChild').mockImplementation(function (this: any, el: any) {
      if (el && el.tagName === 'SCRIPT' && el.src && el.src.includes('googletagmanager.com')) {
        appendedScripts.push(el);
        return el;
      }
      return originalAppendChild.call(this, el);
    });

    // Mock document.head.querySelector to search our intercepted scripts list
    const originalQuerySelector = document.head.querySelector;
    vi.spyOn(document.head, 'querySelector').mockImplementation(function (this: any, selector: string) {
      if (selector.includes('googletagmanager.com')) {
        return appendedScripts.find(s => s.src && s.src.includes('googletagmanager.com')) || null;
      }
      return originalQuerySelector.call(this, selector);
    });

    // Remove any previously added analytics scripts from head
    const scripts = document.head.querySelectorAll('script');
    scripts.forEach(script => {
      if (script.src.includes('googletagmanager.com')) {
        script.remove();
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('by default (no consent given), uses a NullTracker and does not load Google Analytics scripts', () => {
    const tracker = getTracker();
    expect(tracker).toBeDefined();

    // The document head should not have standard gtag script
    const script = document.head.querySelector('script[src*="googletagmanager.com"]');
    expect(script).toBeNull();
    expect((window as any).gtag).toBeUndefined();

    // Tracking events still end up in tracker event spy list but not standard ga
    tracker.trackPageView('/some-path', 'Some page');
    expect((window as any)._trackedEvents).toContainEqual(
      expect.objectContaining({ event: 'page_view', data: expect.objectContaining({ path: '/some-path' }) })
    );
  });

  it('upon explicit rejection, completely disables Google Analytics tracking and marks ga-disable global flag', () => {
    // 1. Grant consent first to initialize
    setConsent(true);
    let tracker = getTracker();
    expect(tracker).toBeDefined();
    
    // Google Analytics should be enabled
    expect((window as any)[`ga-disable-${gaId}`]).toBe(false);
    expect((window as any).gtag).toBeDefined();

    // 2. Reject consent
    setConsent(false);
    
    // Triggers global event listener which resets or toggles tracker
    tracker = getTracker();
    
    // Check ga-disable tracking global override flag is true
    expect((window as any)[`ga-disable-${gaId}`]).toBe(true);

    // Verify it doesn't log standard google events. If we mock gtag, it should not be fired during Null tracker calls
    const gtagSpy = vi.fn();
    (window as any).gtag = gtagSpy;

    tracker.trackPageView('/sensitive-page', 'Secret');
    expect(gtagSpy).not.toHaveBeenCalled();
  });

  it('when consent is granted, constructs GoogleAnalyticsTracker, appends GTM scripts and passes correct event tags', () => {
    setConsent(true);
    const tracker = getTracker();
    expect(tracker).toBeDefined();

    // Tag manager script appended to DOM
    const script = document.head.querySelector('script[src*="googletagmanager.com"]') as HTMLScriptElement | null;
    expect(script).not.toBeNull();
    expect(script!.src).toContain(gaId);

    // Gtag is defined and dataLayer pushes work
    expect((window as any).gtag).toBeDefined();
    expect((window as any).dataLayer).toBeDefined();

    // Spy on the global gtag function
    const gRecord: any[] = [];
    (window as any).gtag = (...args: any[]) => {
      gRecord.push(args);
    };

    tracker.trackPageView('/services', 'Spatineo Services', ['spatial', 'modern']);
    expect(gRecord).toContainEqual([
      'event',
      'page_view',
      {
        page_path: '/services',
        page_title: 'Spatineo Services',
        content_tags: 'spatial, modern',
        send_to: gaId,
      }
    ]);

    tracker.trackPostView('spatial-docs', 'Kaavatietomalli FAQ', ['faq', 'ryhti']);
    expect(gRecord).toContainEqual([
      'event',
      'post_view',
      {
        post_slug: 'spatial-docs',
        post_title: 'Kaavatietomalli FAQ',
        content_tags: 'faq, ryhti',
        send_to: gaId,
      }
    ]);

    tracker.trackAuthorView('ilkka', 'Ilkka Rinne');
    expect(gRecord).toContainEqual([
      'event',
      'author_view',
      {
        author_slug: 'ilkka',
        author_name: 'Ilkka Rinne',
        send_to: gaId,
      }
    ]);

    tracker.trackCTA('Subscribe', 'https://spatineo.com', 'sidebar-cta');
    expect(gRecord).toContainEqual([
      'event',
      'cta_click',
      {
        cta_label: 'Subscribe',
        cta_url: 'https://spatineo.com',
        cta_context: 'sidebar-cta',
        send_to: gaId,
      }
    ]);
  });
});
