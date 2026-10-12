import { describe, it, expect } from 'vitest';
import {
  COVER_IMAGE_WIDTHS,
  isScalableCoverImage,
  getScaledCoverImageFilename,
  getCoverImageSrc,
  getCoverImageSrcSet,
} from './images';

describe('images utility', () => {
  describe('COVER_IMAGE_WIDTHS', () => {
    it('contains standard breakpoints matching layout requirements', () => {
      expect(COVER_IMAGE_WIDTHS).toEqual([320, 640, 960, 1200, 1600]);
    });
  });

  describe('isScalableCoverImage', () => {
    it('returns false for empty or undefined paths', () => {
      expect(isScalableCoverImage(undefined)).toBe(false);
      expect(isScalableCoverImage('')).toBe(false);
      expect(isScalableCoverImage('   ')).toBe(false);
    });

    it('returns false for external HTTP/HTTPS and data URLs', () => {
      expect(isScalableCoverImage('https://images.unsplash.com/photo-123')).toBe(false);
      expect(isScalableCoverImage('http://example.com/cover.png')).toBe(false);
      expect(isScalableCoverImage('data:image/png;base64,abc')).toBe(false);
    });

    it('returns false for SVG vector images', () => {
      expect(isScalableCoverImage('/images/logo.svg')).toBe(false);
      expect(isScalableCoverImage('images/diagram.SVG')).toBe(false);
    });

    it('returns true for local raster images', () => {
      expect(isScalableCoverImage('/images/matti-kaavakartta-testi.png')).toBe(true);
      expect(isScalableCoverImage('images/Gemini_Generated_Image.jpeg')).toBe(true);
      expect(isScalableCoverImage('/images/photo.jpg')).toBe(true);
      expect(isScalableCoverImage('/images/graphic.webp')).toBe(true);
    });
  });

  describe('getScaledCoverImageFilename', () => {
    it('formats filename with standard width in pixels pattern', () => {
      expect(getScaledCoverImageFilename('matti-kaavakartta-testi.png', 640)).toBe(
        'matti-kaavakartta-testi-640px.png'
      );
      expect(getScaledCoverImageFilename('/images/Gemini_Generated_Image.jpeg', 1200)).toBe(
        'Gemini_Generated_Image-1200px.jpeg'
      );
      expect(getScaledCoverImageFilename('images/sub/photo.jpg', 320)).toBe('photo-320px.jpg');
    });

    it('handles files without extensions', () => {
      expect(getScaledCoverImageFilename('raw-image', 960)).toBe('raw-image-960px');
    });
  });

  describe('getCoverImageSrc', () => {
    it('returns empty string for missing input', () => {
      expect(getCoverImageSrc(undefined)).toBe('');
      expect(getCoverImageSrc('')).toBe('');
    });

    it('returns original URL for external or vector images', () => {
      const unsplashUrl = 'https://images.unsplash.com/photo-123?w=1200';
      expect(getCoverImageSrc(unsplashUrl)).toBe(unsplashUrl);
      expect(getCoverImageSrc('/images/icon.svg')).toBe('/images/icon.svg');
    });

    it('returns scaled image URL for local raster images with default 1200px', () => {
      expect(getCoverImageSrc('/images/matti.png')).toBe('/images/matti-1200px.png');
    });

    it('returns scaled image URL for custom width', () => {
      expect(getCoverImageSrc('/images/matti.png', 320)).toBe('/images/matti-320px.png');
      expect(getCoverImageSrc('images/matti.png', 640)).toBe('/images/matti-640px.png');
    });
  });

  describe('getCoverImageSrcSet', () => {
    it('returns undefined for non-scalable images', () => {
      expect(getCoverImageSrcSet(undefined)).toBeUndefined();
      expect(getCoverImageSrcSet('https://unsplash.com/image.jpg')).toBeUndefined();
      expect(getCoverImageSrcSet('/images/logo.svg')).toBeUndefined();
    });

    it('returns correctly formatted srcset string for local raster images', () => {
      const srcSet = getCoverImageSrcSet('/images/matti.png');
      expect(srcSet).toBeDefined();
      expect(srcSet).toContain('/images/matti-320px.png 320w');
      expect(srcSet).toContain('/images/matti-640px.png 640w');
      expect(srcSet).toContain('/images/matti-960px.png 960w');
      expect(srcSet).toContain('/images/matti-1200px.png 1200w');
      expect(srcSet).toContain('/images/matti-1600px.png 1600w');
    });
  });
});
