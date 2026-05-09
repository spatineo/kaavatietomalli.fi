import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { CONFIG } from '../config';

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
