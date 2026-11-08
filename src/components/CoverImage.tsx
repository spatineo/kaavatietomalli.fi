import { useState } from 'react';
import { Maximize2 } from 'lucide-react';
import { getCoverImageSrc, getCoverImageSrcSet } from '../lib/images';
import { ImageLightbox } from './ImageLightbox';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

export interface CoverImageProps {
  src: string;
  alt: string;
  title?: string;
  isSponsored?: boolean;
  className?: string;
  aspectRatioClassName?: string;
}

export function CoverImage({
  src,
  alt,
  title,
  isSponsored = false,
  className = '',
  aspectRatioClassName = 'aspect-[21/9]',
}: CoverImageProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const t = getTranslations(CONFIG.language as Language);

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={`${t.lightbox.openImage}: ${title || alt}`}
        onClick={() => setIsLightboxOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsLightboxOpen(true);
          }
        }}
        data-testid="cover-image-trigger"
        className={`group relative ${aspectRatioClassName} overflow-hidden rounded-3xl shadow-2xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-accent/60 ${isSponsored ? 'border border-amber-400/15' : ''
          } ${className}`}
      >
        <img
          src={getCoverImageSrc(src, 1200)}
          srcSet={getCoverImageSrcSet(src)}
          sizes="(min-width: 1024px) 840px, (min-width: 768px) 720px, calc(100vw - 48px)"
          alt={alt}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />

      </div>

      <ImageLightbox
        isOpen={isLightboxOpen}
        onClose={() => setIsLightboxOpen(false)}
        src={src}
        alt={alt}
        title={title}
      />
    </>
  );
}

