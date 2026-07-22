import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CONFIG } from '../config';
import { BUILD_VERSION } from '../version';

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
    console.error('Failed to verify backend version:', error);
  }
  return null;
}

export async function checkBackendVersion(): Promise<boolean> {
  if (import.meta.env.DEV) {
    return true;
  }
  const sVer = await fetchServerVersion();
  if (sVer && sVer !== BUILD_VERSION) {
    console.warn(`Version mismatch detected! Client: ${BUILD_VERSION}, Server: ${sVer}`);
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

