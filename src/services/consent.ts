
export type CookieConsentState = {
  analytics: boolean;
  timestamp: string;
};

const CONSENT_KEY = 'cookie_consent_settings';

export function getConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setConsent(analytics: boolean) {
  const state: CookieConsentState = {
    analytics,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
  
  // Trigger a custom event so the analytics service can react
  window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: state }));
}
