import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CONFIG } from '../config';
import { getBuildVersion } from './blog';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolves an image URL, handling relative paths by prefixing them with the base path.
 * Supports absolute URLs (http, https, /) and data URLs.
 */
export function resolveImageUrl(url: string | undefined): string {
  if (!url) return '';
  
  // If it's already an absolute URL (http, https, /) or data URL, return it as is
  if (/^(https?:\/\/|\/|data:)/.test(url)) {
    return url;
  }
  
  // Handle relative paths (e.g. ../images/...) 
  // We normalize by removing leading ./ or ../ because our assets are basically at the root of the serving path
  const cleanUrl = url.replace(/^(\.\.?\/)+/, '');
  
  // Ensure basePath ends with / and cleanUrl DOES NOT start with /
  const base = CONFIG.basePath.endsWith('/') ? CONFIG.basePath : `${CONFIG.basePath}/`;
  return `${base}${cleanUrl}`;
}

export async function fetchServerVersion(): Promise<string | null> {
  if (import.meta.env.DEV) {
    return null;
  }
  try {
    const res = await fetch(`${CONFIG.basePath.replace(/\/$/, '')}/version.json?cb=${Date.now()}`);
    if (!res.ok) {
      return null;
    }
    const data = await res.json();
    return data?.version || null;
  } catch (error) {
    console.warn('Failed to verify backend version:', error);
  }
  return null;
}

export async function checkBackendVersion(): Promise<boolean> {
  if (import.meta.env.DEV) {
    return true;
  }
  const sVer = await fetchServerVersion();
  const buildVersion = await getBuildVersion();
  if (sVer && sVer !== buildVersion) {
    console.warn(`Version mismatch detected! Client: ${buildVersion}, Server: ${sVer}`);
    return false;
  }
  return true;
}

/**
 * Smoothly scrolls to an element by its ID and updates the URL hash
 * without triggering the browser's default instant jump scroll.
 */
export function scrollToAnchor(id: string) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    window.history.pushState(null, '', `#${id}`);
    window.dispatchEvent(new Event('hashchange'));
  }
}

/**
 * Formats date strings returned by the plan API (e.g. "1900-01-01Z", "2024-05-15T00:00:00Z", null)
 * using the Finnish date format locale (e.g., "1.1.1900" or "15.5.2024").
 * Handles null, undefined, or invalid date values gracefully by returning a fallback string (default '-').
 */
export function formatPlanDate(dateStr: string | null | undefined, fallback = '-'): string {
  if (!dateStr || typeof dateStr !== 'string') return fallback;
  const trimmed = dateStr.trim();
  if (!trimmed || trimmed === '-') return fallback;

  // Match YYYY-MM-DD pattern at the beginning of the string
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day) && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      // Create UTC Date to avoid local timezone offset shifts (e.g., UTC-7 shifting 1900-01-01Z to 1899-12-31)
      const d = new Date(Date.UTC(year, month - 1, day));
      return d.toLocaleDateString('fi-FI', { timeZone: 'UTC' });
    }
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('fi-FI', { timeZone: 'UTC' });
  }

  return fallback;
}

