
export const GRANT_ANALYTICS_ONLY = {
  analyticsStorage: "granted",
  adUserData: "denied",
  adStorage: "denied",
  addPersonalization: "denied"
} as ConsentProperties;

export const DENY_ALL = {
  analyticsStorage: "denied",
  adUserData: "denied",
  adStorage: "denied",
  addPersonalization: "denied"
} as ConsentProperties;

export interface ConsentProperties {
  analyticsStorage: "granted" | "denied";
  adUserData: "granted" | "denied";
  adStorage: "granted" | "denied";
  addPersonalization: "granted" | "denied";
};

export type CookieConsentState = {
  consent: ConsentProperties;
  timestamp: string;
};

const CONSENT_KEY = 'cookie_consent_settings';

export function getConsentState(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CONSENT_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

export function setConsent(concent: ConsentProperties) {
  const state: CookieConsentState = {
    consent: concent,
    timestamp: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(state));

  // Trigger a custom event so the analytics service can react
  window.dispatchEvent(new CustomEvent('cookie_consent_updated', { detail: state }));
}
