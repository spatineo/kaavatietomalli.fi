import { resolveImageUrl } from './utils';

export const COVER_IMAGE_WIDTHS = [320, 640, 960, 1200, 1600] as const;
export type CoverImageWidth = (typeof COVER_IMAGE_WIDTHS)[number];

/**
 * Checks whether the given image URL is an eligible local raster cover image
 * that should be scaled (excludes external HTTP/HTTPS, data URLs, and SVGs).
 */
export function isScalableCoverImage(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^(https?:\/\/|data:)/i.test(trimmed)) return false;
  if (trimmed.toLowerCase().endsWith('.svg')) return false;
  return true;
}

/**
 * Returns the standard scaled filename for a given cover image and target width in pixels.
 * Naming pattern: `<basename>-<width>px.<ext>`
 * Example: `matti-kaavakartta-testi.png` + 640 -> `matti-kaavakartta-testi-640px.png`
 */
export function getScaledCoverImageFilename(originalFileName: string, width: number): string {
  const filename = originalFileName.split(/[/\\]/).pop() || originalFileName;
  const lastDot = filename.lastIndexOf('.');
  if (lastDot === -1) {
    return `${filename}-${width}px`;
  }
  const base = filename.substring(0, lastDot);
  const ext = filename.substring(lastDot);
  return `${base}-${width}px${ext}`;
}

/**
 * Returns the resolved image source URL for displaying a cover image.
 * For local scalable cover images, returns the scaled image URL for the requested width (defaults to 1200px).
 * For external or SVG images, falls back to standard resolveImageUrl.
 */
export function getCoverImageSrc(url: string | undefined, targetWidth: number = 1200): string {
  if (!url) return '';
  if (!isScalableCoverImage(url)) {
    return resolveImageUrl(url);
  }
  const scaledFilename = getScaledCoverImageFilename(url, targetWidth);
  return resolveImageUrl(`/images/${scaledFilename}`);
}

/**
 * Returns the srcset string for responsive cover images across standard widths.
 * Returns undefined for external or non-scalable images.
 */
export function getCoverImageSrcSet(
  url: string | undefined,
  widths: readonly number[] = COVER_IMAGE_WIDTHS
): string | undefined {
  if (!url || !isScalableCoverImage(url)) {
    return undefined;
  }
  return widths
    .map(w => {
      const scaledFilename = getScaledCoverImageFilename(url, w);
      return `${resolveImageUrl(`/images/${scaledFilename}`)} ${w}w`;
    })
    .join(', ');
}
