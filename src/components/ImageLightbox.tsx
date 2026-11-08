import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { getLightboxImageSrc, getCoverImageSrcSet } from '../lib/images';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

export interface ImageLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  src: string;
  alt?: string;
  title?: string;
}

export function ImageLightbox({
  isOpen,
  onClose,
  src,
  alt,
  title,
}: ImageLightboxProps) {
  const t = getTranslations(CONFIG.language as Language);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (typeof document === 'undefined') {
    return null;
  }

  const lightboxContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={title || alt || t.lightbox.openImage}
          data-testid="image-lightbox-backdrop"
          onClick={onClose}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-8 cursor-pointer select-none"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label={t.lightbox.close}
            data-testid="image-lightbox-close"
            className="absolute top-4 right-4 md:top-6 md:right-6 z-50 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white/90 hover:text-white transition-colors cursor-pointer border border-white/10 shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Image & optional caption */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              // Clicking the image itself closes the lightbox as requested
              e.stopPropagation();
              onClose();
            }}
            className="relative max-w-full max-h-full flex flex-col items-center justify-center cursor-pointer"
          >
            <img
              src={getLightboxImageSrc(src)}
              srcSet={getCoverImageSrcSet(src)}
              sizes="(min-width: 2048px) 2048px, 100vw"
              alt={alt || title || ''}
              data-testid="image-lightbox-img"
              className="max-w-full max-h-[85vh] md:max-h-[90vh] w-auto h-auto object-contain rounded-2xl shadow-2xl border border-white/10 hover:opacity-95 transition-opacity"
            />
            {title && (
              <p
                data-testid="image-lightbox-title"
                className="mt-4 text-center text-sm md:text-base text-slate-300 font-medium max-w-3xl line-clamp-2 drop-shadow-md px-4"
              >
                {title}
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(lightboxContent, document.body);
}

