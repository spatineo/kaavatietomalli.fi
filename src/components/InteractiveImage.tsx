import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ZoomIn, ZoomOut, Maximize, Expand, AlertTriangle } from 'lucide-react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

const ZOOM_STEPS = [0.05, 0.1, 0.15, 0.25, 0.35, 0.5, 0.65, 0.8, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0, 4.0, 5.0, 6.0, 8.0, 10.0];
const FULL_ZOOM_PADDING = 20; // px for each side

function getZoomFractionalIndex(z: number): number {
  if (z <= ZOOM_STEPS[0]) return 0;
  if (z >= ZOOM_STEPS[ZOOM_STEPS.length - 1]) return ZOOM_STEPS.length - 1;
  for (let i = 0; i < ZOOM_STEPS.length - 1; i++) {
    const low = ZOOM_STEPS[i];
    const high = ZOOM_STEPS[i + 1];
    if (z >= low && z <= high) {
      const ratio = (z - low) / (high - low);
      return i + ratio;
    }
  }
  return 0;
}

interface InteractiveImageProps {
  svgContent?: string;
  href?: string;
  title?: string;
  alt?: string;
  style?: string;
  bindFunctions?: (el: Element) => void;
  isLoading?: boolean;
  dataTestId?: string;
  note?: string;
  className?: string;
}

function parseStyleStringToDict(styleStr: string | undefined): React.CSSProperties {
  if (!styleStr) return {};
  const dict: Record<string, string> = {};
  
  let cleanStr = styleStr.trim();
  if (cleanStr.includes('{') && cleanStr.includes('}')) {
    const startIdx = cleanStr.indexOf('{');
    const endIdx = cleanStr.lastIndexOf('}');
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
      cleanStr = cleanStr.slice(startIdx + 1, endIdx).trim();
    }
  }

  const declarations = cleanStr.split(';');
  const bannedProps = new Set(['note', 'href', 'title', 'alt', 'svgcontent', 'svg-content']);

  for (const dec of declarations) {
    const trimmed = dec.trim();
    if (!trimmed) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;
    const prop = trimmed.slice(0, colonIdx).trim();
    const val = trimmed.slice(colonIdx + 1).trim();
    if (!prop || !val) continue;

    const lowerProp = prop.toLowerCase();
    if (bannedProps.has(lowerProp)) continue;

    const camelProp = prop.replace(/-([a-z])/gi, (g) => g[1].toUpperCase());
    dict[camelProp] = val;
  }
  
  return dict as React.CSSProperties;
}

export function InteractiveImage({
  svgContent: propSvgContent,
  href,
  title,
  alt,
  style,
  bindFunctions,
  isLoading: propIsLoading = false,
  dataTestId = 'interactive-image',
  note,
  className = 'interactive-image',
}: InteractiveImageProps) {
  const t = getTranslations(CONFIG.language as Language);
  const customStyles = parseStyleStringToDict(style);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const glasspaneRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [internalIsLoading, setInternalIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPinchDistance, setInitialPinchDistance] = useState<number | null>(null);
  const [initialPinchZoom, setInitialPinchZoom] = useState<number | null>(null);
  const [initialPinchPosition, setInitialPinchPosition] = useState<{ x: number; y: number } | null>(null);
  const [initialPinchMidpoint, setInitialPinchMidpoint] = useState<{ x: number; y: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

  const [isZooming, setIsZooming] = useState(false);
  const [continuousZoom, setContinuousZoom] = useState<number | null>(null);
  const zoomTimeoutRef = useRef<any>(null);

  const zoomRef = useRef(zoom);
  const positionRef = useRef(position);
  const gestureStartZoomRef = useRef<number | null>(null);

  const pendingUpdateRef = useRef<{ zoom: number; position: { x: number; y: number } } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  // Drag, wheel, and tap state trackers
  const wheelAccumulatorRef = useRef(0);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchHasMovedRef = useRef(false);
  const touchIsDraggingRef = useRef(false);

  const isLoading = propIsLoading || internalIsLoading;

  // Load SVG content from href if provided
  useEffect(() => {
    if (propSvgContent) {
      setSvgContent(propSvgContent);
      setInternalIsLoading(false);
      setError(null);
    } else if (href) {
      setInternalIsLoading(true);
      setError(null);
      fetch(href)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Failed to load SVG image: HTTP ${res.status}`);
          }
          return res.text();
        })
        .then((text) => {
          setSvgContent(text);
          setInternalIsLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setError(err.message || 'Error fetching SVG content');
          setInternalIsLoading(false);
        });
    }
  }, [href, propSvgContent]);

  // Bind function actions to rendered preview SVG elements
  useEffect(() => {
    if (svgContent && ref.current) {
      ref.current.innerHTML = svgContent;
      
      const svgEl = ref.current.querySelector('svg');
      if (svgEl) {
        // Ensure the SVG has a viewBox to allow responsive resizing
        const widthAttr = svgEl.getAttribute('width');
        const heightAttr = svgEl.getAttribute('height');
        const viewBoxAttr = svgEl.getAttribute('viewBox');
        
        if (!viewBoxAttr && widthAttr && heightAttr) {
          const w = parseFloat(widthAttr);
          const h = parseFloat(heightAttr);
          if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
            svgEl.setAttribute('viewBox', `0 0 ${w} ${h}`);
          }
        }
        
        // Remove hardcoded absolute sizing and replace with percentage attributes
        svgEl.setAttribute('width', '100%');
        svgEl.setAttribute('height', '100%');
        
        // Apply styling to ensure it is bounded nicely
        svgEl.style.width = '100%';
        svgEl.style.height = 'auto';
        svgEl.style.maxWidth = '100%';
        svgEl.style.maxHeight = '550px';
        svgEl.style.display = 'block';
      }
      
      if (bindFunctions) {
        bindFunctions(ref.current);
      }
    }
  }, [svgContent, bindFunctions]);

  const triggerZoomFeedback = (targetZ: number) => {
    setContinuousZoom(targetZ);
    setIsZooming(true);
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = setTimeout(() => {
      setIsZooming(false);
      setContinuousZoom(null);
    }, 750);
  };

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModalOpen]);

  const extractSvgDimensions = (svgEl: SVGElement | null): { width: number; height: number } => {
    if (!svgEl) return { width: 0, height: 0 };
    
    const viewBox = svgEl.getAttribute('viewBox');
    let width = 0;
    let height = 0;
    
    if (viewBox) {
      const parts = viewBox.trim().split(/\s+/).map(Number);
      if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
        width = parts[2];
        height = parts[3];
      }
    }
    
    if (width === 0 || height === 0) {
      const widthAttr = parseFloat(svgEl.getAttribute('width') || '0');
      const heightAttr = parseFloat(svgEl.getAttribute('height') || '0');
      if (widthAttr > 0 && heightAttr > 0) {
        width = widthAttr;
        height = heightAttr;
      } else {
        try {
          const bbox = (svgEl as any).getBBox();
          if (bbox.width > 0 && bbox.height > 0) {
            width = bbox.width;
            height = bbox.height;
          }
        } catch (e) {
          // Ignore
        }
      }
    }
    
    return { width, height };
  };

  const getNaturalSize = (svgStr: string) => {
    if (!svgStr) return { width: 0, height: 0 };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      return extractSvgDimensions(svg);
    } catch (e) {
      console.error('Error parsing SVG size:', e);
    }
    return { width: 0, height: 0 };
  };

  const calculateFitZoom = (size: { width: number, height: number }) => {
    if (size.width === 0 || size.height === 0) {
      return 1;
    }

    const availableWidth = Math.max(0, window.innerWidth - FULL_ZOOM_PADDING * 2);
    const availableHeight = Math.max(0, window.innerHeight - FULL_ZOOM_PADDING * 2);

    let scaleX = availableWidth / size.width;
    let scaleY = availableHeight / size.height;
    
    return Math.min(scaleX, scaleY);
  };

  const toggleModal = () => {
    const newState = !isModalOpen;
    setIsModalOpen(newState);
    if (newState && svgContent) {
      const size = getNaturalSize(svgContent);
      setNaturalSize(size);
      const fitZoom = calculateFitZoom(size);
      setZoom(fitZoom);
      setPosition({ x: 0, y: 0 });
      zoomRef.current = fitZoom;
      positionRef.current = { x: 0, y: 0 };
    }
  };

  const updateTransform = (nextZoom: number, nextPos: { x: number; y: number }) => {
    zoomRef.current = nextZoom;
    positionRef.current = nextPos;
    
    pendingUpdateRef.current = { zoom: nextZoom, position: nextPos };
    if (rafIdRef.current === null) {
      rafIdRef.current = requestAnimationFrame(() => {
        if (pendingUpdateRef.current) {
          setZoom(pendingUpdateRef.current.zoom);
          setPosition(pendingUpdateRef.current.position);
          pendingUpdateRef.current = null;
        }
        rafIdRef.current = null;
      });
    }
  };

  useEffect(() => {
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, []);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentZoom = zoomRef.current;
    const nextZoom = ZOOM_STEPS.find(s => s > currentZoom + 0.001) || 10.0;
    updateTransform(nextZoom, positionRef.current);
    triggerZoomFeedback(nextZoom);
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const currentZoom = zoomRef.current;
    const reversedSteps = [...ZOOM_STEPS].reverse();
    const nextZoom = reversedSteps.find(s => s < currentZoom - 0.001) || 0.05;
    updateTransform(nextZoom, positionRef.current);
    triggerZoomFeedback(nextZoom);
  };

  const handleZoomToFit = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fitZoom = calculateFitZoom(naturalSize);
    updateTransform(fitZoom, { x: 0, y: 0 });
    triggerZoomFeedback(fitZoom);
  };

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    const el = modalRef.current;
    if (!el || !isModalOpen) return;

    wheelAccumulatorRef.current = 0;

    const onWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const isPinch = e.ctrlKey;
      const threshold = isPinch ? 15 : 80;
      
      wheelAccumulatorRef.current += e.deltaY;
      
      const currentZoom = zoomRef.current;
      const currentIdx = ZOOM_STEPS.indexOf(currentZoom);
      
      let tempContinuousZoom = currentZoom;
      const progress = -wheelAccumulatorRef.current / threshold;
      if (progress > 0 && currentIdx < ZOOM_STEPS.length - 1) {
        const nextZoom = ZOOM_STEPS[currentIdx + 1];
        tempContinuousZoom = currentZoom + progress * (nextZoom - currentZoom);
      } else if (progress < 0 && currentIdx > 0) {
        const prevZoom = ZOOM_STEPS[currentIdx - 1];
        tempContinuousZoom = currentZoom + Math.abs(progress) * (prevZoom - currentZoom);
      }
      
      triggerZoomFeedback(tempContinuousZoom);
      
      if (Math.abs(wheelAccumulatorRef.current) >= threshold) {
        const zoomIn = wheelAccumulatorRef.current < 0;
        
        let nextZoom;
        if (zoomIn) {
          nextZoom = ZOOM_STEPS.find(s => s > currentZoom + 0.001) || 10.0;
        } else {
          const reversedSteps = [...ZOOM_STEPS].reverse();
          nextZoom = reversedSteps.find(s => s < currentZoom - 0.001) || 0.05;
        }
        
        wheelAccumulatorRef.current = 0;
        
        if (nextZoom === currentZoom) return;
        
        const scaleChange = nextZoom / currentZoom;
        const currentPos = positionRef.current;
        
        const rect = el.getBoundingClientRect();
        const C_orig_x = rect.left + rect.width / 2;
        const C_orig_y = rect.top + rect.height / 2;
        
        const mouseX = e.clientX;
        const mouseY = e.clientY;
        
        const nextX = (mouseX - C_orig_x) * (1 - scaleChange) + currentPos.x * scaleChange;
        const nextY = (mouseY - C_orig_y) * (1 - scaleChange) + currentPos.y * scaleChange;
        
        updateTransform(nextZoom, { x: nextX, y: nextY });
        triggerZoomFeedback(nextZoom);
      }
    };

    const onGestureStart = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      gestureStartZoomRef.current = zoomRef.current;
    };

    const onGestureChange = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      if (gestureStartZoomRef.current !== null) {
        const adjustedScale = 1 + (e.scale - 1) * 1.5;
        const targetZoom = Math.min(Math.max(gestureStartZoomRef.current * adjustedScale, 0.05), 10);
        
        triggerZoomFeedback(targetZoom);
        
        const nextZoom = ZOOM_STEPS.reduce((prev, curr) => 
          Math.abs(curr - targetZoom) < Math.abs(prev - targetZoom) ? curr : prev
        );
        
        const currentZoom = zoomRef.current;
        if (nextZoom === currentZoom) return;
        
        const currentPos = positionRef.current;
        const scaleChange = nextZoom / currentZoom;
        
        const rect = el.getBoundingClientRect();
        const C_orig_x = rect.left + rect.width / 2;
        const C_orig_y = rect.top + rect.height / 2;
        
        const mouseX = e.clientX !== undefined ? e.clientX : C_orig_x;
        const mouseY = e.clientY !== undefined ? e.clientY : C_orig_y;
        
        const nextX = (mouseX - C_orig_x) * (1 - scaleChange) + currentPos.x * scaleChange;
        const nextY = (mouseY - C_orig_y) * (1 - scaleChange) + currentPos.y * scaleChange;
        
        updateTransform(nextZoom, { x: nextX, y: nextY });
      }
    };

    const onGestureEnd = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      gestureStartZoomRef.current = null;
    };

    el.addEventListener('wheel', onWheelEvent, { passive: false });
    el.addEventListener('gesturestart', onGestureStart, { passive: false });
    el.addEventListener('gesturechange', onGestureChange, { passive: false });
    el.addEventListener('gestureend', onGestureEnd, { passive: false });

    return () => {
      el.removeEventListener('wheel', onWheelEvent);
      el.removeEventListener('gesturestart', onGestureStart);
      el.removeEventListener('gesturechange', onGestureChange);
      el.removeEventListener('gestureend', onGestureEnd);
    };
  }, [isModalOpen]);

  const handleMainContainerClick = (e: React.MouseEvent) => {
    let current = e.target as HTMLElement | null;
    while (current && current !== e.currentTarget) {
      const tagName = current.tagName.toLowerCase();
      if (tagName === 'a') {
        const hrefAttr = current.getAttribute('href') || current.getAttribute('xlink:href');
        if (hrefAttr) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = hrefAttr;
          return;
        }
      }
      if (current.classList.contains('clickable') || current.getAttribute('clickable') === 'true') {
        const hrefAttr = current.getAttribute('href') || current.getAttribute('xlink:href');
        if (hrefAttr) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = hrefAttr;
          return;
        }
        const anchor = current.querySelector('a');
        if (anchor) {
          const aHref = anchor.getAttribute('href') || anchor.getAttribute('xlink:href');
          if (aHref) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = aHref;
            return;
          }
        }
      }
      current = current.parentElement;
    }
    toggleModal();
  };

  const handlePointerClick = (clientX: number, clientY: number) => {
    if (!glasspaneRef.current || !containerRef.current) return;

    const originalPointerEvents = glasspaneRef.current.style.pointerEvents;
    glasspaneRef.current.style.pointerEvents = 'none';

    const targetEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

    glasspaneRef.current.style.pointerEvents = originalPointerEvents;

    if (!targetEl) return;

    const container = containerRef.current;
    if (container.contains(targetEl)) {
      let current: HTMLElement | null = targetEl;
      while (current && current !== container) {
        const tagName = current.tagName.toLowerCase();
        if (tagName === 'a') {
          const hrefAttr = current.getAttribute('href') || current.getAttribute('xlink:href');
          if (hrefAttr) {
            window.location.href = hrefAttr;
            return;
          }
        }
        if (current.classList.contains('clickable') || current.getAttribute('clickable') === 'true') {
          const hrefAttr = current.getAttribute('href') || current.getAttribute('xlink:href');
          if (hrefAttr) {
            window.location.href = hrefAttr;
            return;
          }
          const anchor = current.querySelector('a');
          if (anchor) {
            const aHref = anchor.getAttribute('href') || anchor.getAttribute('xlink:href');
            if (aHref) {
              window.location.href = aHref;
              return;
            }
          }
        }
        current = current.parentElement;
      }
    } else {
      toggleModal();
    }
  };

  const setModalContainerRef = (el: HTMLDivElement | null) => {
    (containerRef as any).current = el;
    if (el) {
      if (bindFunctions) {
        bindFunctions(el);
      }

      const svgEl = el.querySelector('svg');
      if (svgEl) {
        const { width, height } = extractSvgDimensions(svgEl);

        if (width > 0 && height > 0 && (width !== naturalSize.width || height !== naturalSize.height)) {
          const size = { width, height };
          setNaturalSize(size);
          const fitZoom = calculateFitZoom(size);
          setZoom(fitZoom);
          setPosition({ x: 0, y: 0 });
          zoomRef.current = fitZoom;
          positionRef.current = { x: 0, y: 0 };
        }
      }
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    hasMovedRef.current = false;
    
    dragStartPosRef.current = { x: e.clientX, y: e.clientY };
    setDragStart({ x: e.clientX - positionRef.current.x, y: e.clientY - positionRef.current.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (e.buttons !== 1) {
        setIsDragging(false);
        return;
      }
      
      const dx = e.clientX - dragStartPosRef.current.x;
      const dy = e.clientY - dragStartPosRef.current.y;
      
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMovedRef.current = true;
      }
      
      const nextX = e.clientX - dragStart.x;
      const nextY = e.clientY - dragStart.y;
      updateTransform(zoomRef.current, { x: nextX, y: nextY });
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      setIsDragging(false);
      if (!hasMovedRef.current) {
        handlePointerClick(e.clientX, e.clientY);
      }
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    
    const count = e.touches.length;
    if (count === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      setDragStart({ x: touch.clientX - positionRef.current.x, y: touch.clientY - positionRef.current.y });
      touchIsDraggingRef.current = true;
      touchHasMovedRef.current = false;
      
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else if (count === 2) {
      touchIsDraggingRef.current = false;
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      setInitialPinchDistance(dist);
      setInitialPinchZoom(zoomRef.current);
      setInitialPinchPosition(positionRef.current);
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setInitialPinchMidpoint({ x: midX, y: midY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const count = e.touches.length;
    
    if (count === 1 && touchIsDraggingRef.current) {
      const touch = e.touches[0];
      
      const dx = touch.clientX - (touchStartRef.current?.x ?? touch.clientX);
      const dy = touch.clientY - (touchStartRef.current?.y ?? touch.clientY);
      
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        touchHasMovedRef.current = true;
      }
      
      const nextX = touch.clientX - dragStart.x;
      const nextY = touch.clientY - dragStart.y;
      updateTransform(zoomRef.current, { x: nextX, y: nextY });
    } else if (count === 2 && initialPinchDistance !== null && initialPinchZoom !== null && initialPinchPosition && initialPinchMidpoint) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / initialPinchDistance;
      const targetZoom = Math.min(Math.max(initialPinchZoom * factor, 0.05), 10);
      
      triggerZoomFeedback(targetZoom);

      const nextZoom = ZOOM_STEPS.reduce((prev, curr) => 
        Math.abs(curr - targetZoom) < Math.abs(prev - targetZoom) ? curr : prev
      );
      
      if (nextZoom === zoomRef.current) {
        return;
      }
      
      const currentMidX = (touch1.clientX + touch2.clientX) / 2;
      const currentMidY = (touch1.clientY + touch2.clientY) / 2;
      
      const el = modalRef.current;
      if (el) {
        const rect = el.getBoundingClientRect();
        const C_orig_x = rect.left + rect.width / 2;
        const C_orig_y = rect.top + rect.height / 2;
        
        const relativeScale = nextZoom / initialPinchZoom;
        const dx = initialPinchMidpoint.x - C_orig_x;
        const dy = initialPinchMidpoint.y - C_orig_y;
        
        const nextX = (currentMidX - C_orig_x) - relativeScale * (dx - initialPinchPosition.x);
        const nextY = (currentMidY - C_orig_y) - relativeScale * (dy - initialPinchPosition.y);
        
        updateTransform(nextZoom, { x: nextX, y: nextY });
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const count = e.touches.length;
    
    if (count === 0) {
      if (touchIsDraggingRef.current && !touchHasMovedRef.current && touchStartRef.current) {
        const duration = Date.now() - touchStartRef.current.time;
        if (duration < 300) {
          handlePointerClick(touchStartRef.current.x, touchStartRef.current.y);
        }
      }
      
      touchIsDraggingRef.current = false;
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else if (count === 1) {
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
      setDragStart({ x: touch.clientX - positionRef.current.x, y: touch.clientY - positionRef.current.y });
      touchIsDraggingRef.current = true;
      touchHasMovedRef.current = false;
      
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else {
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    }
  };

  const currentStepIdx = ZOOM_STEPS.reduce((closestIdx, step, idx) => {
    const currentDiff = Math.abs(ZOOM_STEPS[closestIdx] - zoom);
    const thisDiff = Math.abs(step - zoom);
    return thisDiff < currentDiff ? idx : closestIdx;
  }, 8);

  const continuousIdx = continuousZoom !== null ? getZoomFractionalIndex(continuousZoom) : currentStepIdx;

  if (error) {
    return (
      <div className="my-6 p-6 rounded-2xl border border-red-500/20 bg-red-950/10 text-left">
        <div className="flex items-center gap-3 text-red-400 mb-3 font-semibold text-sm">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
        <p className="text-xs text-slate-400">
          Kuvan tai kaavion esittäminen epäonnistui kohteesta {href || 'inline'}.
        </p>
      </div>
    );
  }

  return (
    <>
      <div 
        data-testid={`${dataTestId}-container`}
        className={`${className} flex flex-col justify-center my-12 bg-black/40 backdrop-blur-sm p-10 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group cursor-pointer relative min-h-[200px]`}
        role="button"
        aria-label={t.interactiveImage.expand}
        onClick={handleMainContainerClick}
      >
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
                  {t.common.loading}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="absolute top-4 right-4 p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <Maximize2 size={16} className="text-brand-accent" />
        </div>

        {title && (
          <div className="title text-xs text-white/50 mb-3 font-semibold select-none">
            {title}
          </div>
        )}

        <div 
          ref={ref} 
          className="interactive-image-content w-full flex justify-center transition-transform duration-500 group-hover:scale-[1.01]" 
          aria-label={alt || title}
          style={customStyles}
        />

        {note && (
          <div className="note text-[11px] text-white/40 mt-4 text-center italic select-none">
            {note}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            ref={modalRef}
            data-testid={`${dataTestId}-modal`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            onClick={toggleModal}
          >
            <div className="absolute top-6 right-6 flex items-center gap-4 z-[110]">
              <div className="flex items-center bg-white/10 backdrop-blur-md border border-white/10 rounded-full p-1 px-3 shadow-2xl gap-1">
                <span className="text-xs text-white/95 font-bold tracking-wider px-2 select-none border-r border-white/10 pr-3 font-mono">
                  {Math.round(zoom * 100)}%
                </span>
                <button 
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.interactiveImage.zoomOut}
                >
                  <ZoomOut size={18} className="text-white/70" />
                </button>
                <button 
                  onClick={handleZoomToFit}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.interactiveImage.zoomToFit}
                >
                  <Maximize size={18} className="text-white/70">
                    <Expand size={12} x={6} y={6} className="text-white/70"/>
                  </Maximize>
                </button>
                <button 
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.interactiveImage.zoomIn}
                >
                  <ZoomIn size={18} className="text-white/70" />
                </button>                
              </div>

              <button 
                onClick={toggleModal}
                className="bg-white/10 border border-white/10 text-white p-3 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors shadow-2xl active:scale-95 group/close"
                aria-label={t.interactiveImage.close}
              >
                <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            <AnimatePresence>
              {isZooming && (
                <motion.div
                  initial={{ opacity: 0, x: 0 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 0 }}
                  className="absolute right-21 top-55 -translate-y-1/2 flex flex-col items-center bg-black/55 backdrop-blur-xl border border-white/10 rounded-2xl pr-4 py-5 shadow-2xl z-[110] pointer-events-none w-25"
                >
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white mb-3 ml-3 text-center min-w-[11em]">
                    ZOOM {Math.round(zoom * 100)}%
                  </span>
                  
                  <div className="relative h-48 w-6 flex items-center justify-center mr-4">
                    <div className="absolute inset-y-0 w-0.5 bg-white/15 rounded-full" />
                    
                    {ZOOM_STEPS.map((step, idx) => {
                      const isKey = idx === 0 || idx === 5 || idx === 8 || idx === 14 || idx === 19;
                      return (
                        <div
                          key={idx}
                          className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center"
                          style={{ bottom: `${(idx / 19) * 100}%` }}
                        >
                          <div 
                            className={`h-[2px] transition-all rounded-full ${
                              idx === currentStepIdx 
                                ? 'w-3.5 bg-brand-accent' 
                                : isKey 
                                  ? 'w-2 bg-white/45' 
                                  : 'w-1 bg-white/20'
                            }`} 
                          />
                          {isKey && (
                            <span className="absolute left-4 text-[8px] font-bold text-white/40 tracking-wider min-w-[4em]">
                              {Math.round(step * 100)}%
                            </span>
                          )}
                        </div>
                      );
                    })}

                    {continuousZoom !== null && (
                      <div
                        className="absolute w-5 h-1 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50 -translate-x-1/2 left-1/2 transition-all duration-75 z-20 border border-black/40"
                        style={{ bottom: `calc(${(continuousIdx / 19) * 100}% - 1px)` }}
                      />
                    )}

                    <div
                      className="absolute w-3 h-3 bg-brand-accent rounded-full -translate-x-1/2 left-1/2 shadow-md transition-all duration-150 z-10 border border-white/50"
                      style={{ bottom: `calc(${(currentStepIdx / 19) * 100}% - 6px)` }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div 
              className="relative w-full h-full overflow-hidden flex items-center justify-center touch-none"
              onClick={(e) => e.stopPropagation()}
            >
              <div 
                ref={setModalContainerRef}
                className={`${className} modal-container select-none flex items-center justify-center shrink-0`}
                style={{ 
                  width: naturalSize.width ? `${naturalSize.width}px` : '100%',
                  height: naturalSize.height ? `${naturalSize.height}px` : '100%',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  flexShrink: 0,
                  ...customStyles
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />

              <div
                ref={glasspaneRef}
                data-testid={`${dataTestId}-glasspane`}
                className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none z-10"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>

            {note && (
              <div className="title absolute bottom-6 left-6 z-[110] text-[11px] text-white/50 font-medium bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/5 shadow-2xl select-none pointer-events-none max-w-xl truncate italic">
                {note}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
