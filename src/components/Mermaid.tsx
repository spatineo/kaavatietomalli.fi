import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

// Lazy load mermaid library
let mermaidInstance: any = null;
let isInitialized = false;

async function getMermaid() {
  if (mermaidInstance) return mermaidInstance;
  const m = await import('../lib/mermaid');
  mermaidInstance = m.default;
  
  if (!isInitialized) {
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'loose',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
      fontSize: 16,
      flowchart: {
        htmlLabels: true,
        useMaxWidth: false,
        curve: 'basis',
        padding: 20
      },
      class: {
        htmlLabels: true,
        useMaxWidth: false,
        padding: 20
      },
      gantt: {
        htmllabels: true,
        titlePadding: 15,
        barHeight: 30, // Generous bar height to prevent text height-spill
        barGap: 8, // Spacing between bars to avoid overlap
        topPadding: 50,
        sidePadding: 130, // Keeps section labels on the left from overlapping bars/dates
        gridLineStartPadding: 35,
        fontSize: 10, // Explicit small font size for Gantt text
        sectionFontSize: 11, // Section header font size
        numberSectionHeaderYOffset: 12,
        useWidth: 1200, // Renders Gantt across wider baseline to avoid squeezing text
        useMaxWidth: false
      },
      themeCSS: `
        /* Gantt chart label adjustments */
        .taskText {
          font-size: 11px !important;
          fill: #111827 !important; /* High contrast dark text on yellow/orange Gantt bars */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: 600 !important;
        }
        .gantt .taskTextOutside {
          font-size: 11px !important;
          fill: #A0AEC0 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: 500;
        }
        .gantt .sectionText {
          font-size: 11px !important;
          fill: #FFAF00 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: 600;
        }
        .gantt .tick text {
          font-size: 10px !important;
          fill: #A0AEC0 !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .gantt .grid .tick text {
          font-size: 10px !important;
          fill: #A0AEC0 !important;
        }
        .gantt .titleText {
          font-size: 16px !important;
          fill: #FFFFFF !important;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: bold;
        }

        /* Prevent black and very dark fills in all diagrams */
        .node rect, .node circle, .node polygon, .node path, .node ellipse {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
          stroke-width: 1.5px !important;
        }
        
        /* Flowchart cluster / group container styling */
        .cluster rect {
          fill: #1A1C23 !important;
          fill-opacity: 1 !important;
          stroke: #4B5563 !important;
          stroke-width: 1.5px !important;
        }

        /* Sequence diagram participants and notes */
        g.actor rect {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
        }
        g.note rect {
          fill: #363A45 !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
        }

        /* Class diagram styling */
        g.classGroup rect {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
        }
        g.classGroup line {
          stroke: #FFAF00 !important;
        }

        /* State diagram styling and text visibility */
        g.stateGroup rect {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
          stroke-width: 1.5px !important;
        }
        g.stateGroup text, g.stateGroup span, g.stateGroup div, .stateText, .stateText text, .state-title, .state-head, .stateText span {
          fill: #FFFFFF !important;
          color: #601a1a !important;
        }
        .transition-text, .transition-text text, .transition-text span {
          fill: #FFFFFF !important;
          color: #FFFFFF !important;
        }
        .statediagram-state .nodeLabel {
          color: #FFFFFF !important;
        }
        
        /* Entity Relationship diagram styling */
        rect.entityBox {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
        }
        rect.attributeBox {
          fill: #363A45 !important;
          fill-opacity: 1 !important;
          stroke: #4B5563 !important;
        }

        /* Mindmap and other shapes default fallback fills */
        .mindmap-node rect, .mindmap-node circle {
          fill: #2C303B !important;
          stroke: #FFAF00 !important;
        }

        /* High-contrast colors for mindmap branches to prevent invisible dark lines */
        path.mindmap-edge-0, .mindmap-edge-0 { stroke: #FFAF00 !important; stroke-width: 3px !important; }
        path.mindmap-edge-1, .mindmap-edge-1 { stroke: #3B82F6 !important; stroke-width: 3px !important; }
        path.mindmap-edge-2, .mindmap-edge-2 { stroke: #10B981 !important; stroke-width: 3px !important; }
        path.mindmap-edge-3, .mindmap-edge-3 { stroke: #EC4899 !important; stroke-width: 3px !important; }
        path.mindmap-edge-4, .mindmap-edge-4 { stroke: #8B5CF6 !important; stroke-width: 3px !important; }
        path.mindmap-edge-5, .mindmap-edge-5 { stroke: #F59E0B !important; stroke-width: 3px !important; }
        
        /* Fallback for general mindmap edge/curves */
        .mindmap-edge {
          stroke: #FFAF00 !important;
          stroke-width: 3px !important;
        }

        /* Ensure flowchart / state / class diagram connector lines are clearly visible on dark background */
        .edgePath .path, .edgePaths .path, g.edgePath path, path.transition, .relation, line.relation, .transition-line {
          stroke: #FFAF00 !important;
          stroke-width: 1.5px !important;
        }
        .edgePath .arrowheadPath, g.edgePath marker path {
          fill: #FFAF00 !important;
          stroke: #FFAF00 !important;
        }

        /* Flowchart edge label background fallback */
        .edgeLabel rect {
          fill: #20242E !important;
          fill-opacity: 1 !important;
        }
      `,
      themeVariables: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
        fontSize: '16px',
        ganttFontSize: '11px',
        sectionFontSize: '11px',
        primaryColor: '#2C303B',
        primaryTextColor: '#FFFFFF',
        primaryBorderColor: '#FFAF00',
        lineColor: '#FFAF00',
        secondaryColor: '#FFAF00',
        tertiaryColor: '#363A45',
        mainBkg: '#2C303B',
        nodeBorder: '#FFAF00',
        clusterBkg: '#1A1C23',
        clusterBorder: '#4B5563',
        titleColor: '#FFFFFF',
        edgeLabelBackground: '#20242E',
        nodeTextColor: '#FFFFFF',

        // Sequence Diagram variables
        actorBkg: '#2C303B',
        actorBorder: '#FFAF00',
        actorTextColor: '#FFFFFF',
        actorLineColor: '#FFAF00',
        signalColor: '#FFAF00',
        signalTextColor: '#FFFFFF',
        labelBoxBkgColor: '#2C303B',
        labelBoxBorderColor: '#FFAF00',
        noteBkgColor: '#363A45',
        noteBorderColor: '#FFAF00',
        noteTextColor: '#FFFFFF',

        // Class & ER diagram variables
        classBkg: '#2C303B',
        classBorder: '#FFAF00',
        classText: '#FFFFFF',
        relationColor: '#FFAF00',
        relationLabelBkgColor: '#20242E',
        attributeBkgColor: '#2C303B',
        attributeBkgColorAlt: '#363A45',

        // State diagram variables
        stateBkg: '#2C303B',
        stateBorder: '#FFAF00',
        stateText: '#FFFFFF',
        transitionColor: '#FFAF00',
        transitionLabelBoxBkgColor: '#20242E',

        // Gantt diagram variables (ensuring light/distinguishable color fills)
        activeTaskBkgColor: '#3B82F6',
        activeTaskBorderColor: '#60A5FA',
        doneTaskBkgColor: '#10B981',
        doneTaskBorderColor: '#34D399',
        taskBkgColor: '#FFAF00',
        taskBorderColor: '#FFC340',
        critBkgColor: '#EF4444',
        critBorderColor: '#F87171',
        todayLineColor: '#FFAF00',
      }
    });
    isInitialized = true;
  }
  return mermaidInstance;
}

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const t = getTranslations(CONFIG.language as Language);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
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
  const [isLoading, setIsLoading] = useState(true);

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

  useEffect(() => {
    if (chart) {
      const renderDiagram = async () => {
        setIsLoading(true);
        try {
          const mermaid = await getMermaid();
          
          if ('fonts' in document) {
            await document.fonts.ready;
          }
          
          // Clear previous content
          if (ref.current) {
            ref.current.innerHTML = '';
          }
          
          const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
          
          // Render to a temporary div to ensure clean measurement
          // Passing the container to mermaid.render helps it measure fonts accurately
          const tempDiv = document.createElement('div');
          tempDiv.className = 'mermaid'; // Critical to apply CSS resets during measurement
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '-9999px';
          tempDiv.style.visibility = 'hidden';
          document.body.appendChild(tempDiv);
          
          try {
            const { svg, bindFunctions } = await mermaid.render(id, chart, tempDiv);
            
            setSvgContent(svg);
            if (ref.current) {
              ref.current.innerHTML = svg;
              if (bindFunctions) {
                bindFunctions(ref.current);
              }
            }
            setIsLoading(false);
          } finally {
            if (tempDiv.parentNode === document.body) {
              document.body.removeChild(tempDiv);
            }
          }
        } catch (error) {
          console.error('Mermaid error:', error);
          setIsLoading(false);
          if (ref.current) {
            ref.current.innerHTML = `<div class="text-red-500 text-xs font-mono p-4 border border-red-500/20 rounded bg-red-500/5">${t.mermaid.renderError}</div>`;
          }
        }
      };

      renderDiagram();
    }
  }, [chart]);

  const getNaturalSize = (svgStr: string) => {
    if (!svgStr) return { width: 0, height: 0 };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg');
      if (!svg) return { width: 0, height: 0 };

      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.trim().split(/\s+/).map(Number);
        if (parts.length === 4) {
          return { width: parts[2], height: parts[3] };
        }
      }
      
      return {
        width: parseFloat(svg.getAttribute('width') || '0'),
        height: parseFloat(svg.getAttribute('height') || '0')
      };
    } catch (e) {
      console.error('Error parsing SVG size:', e);
    }
    return { width: 0, height: 0 };
  };

  const calculateFitZoom = (size: { width: number, height: number }) => {
    if (!size.width || !size.height) return 1;
    
    const padding = 0.92; // Use 92% of viewport
    const zoomX = (window.innerWidth * padding) / size.width;
    const zoomY = (window.innerHeight * padding) / size.height;
    
    return Math.min(zoomX, zoomY);
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

  const zoomRef = useRef(zoom);
  const positionRef = useRef(position);
  const gestureStartZoomRef = useRef<number | null>(null);

  const pendingUpdateRef = useRef<{ zoom: number; position: { x: number; y: number } } | null>(null);
  const rafIdRef = useRef<number | null>(null);

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
    };
  }, []);

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextZoom = Math.min(zoomRef.current * 1.2, 10);
    updateTransform(nextZoom, positionRef.current);
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextZoom = Math.max(zoomRef.current * 0.8, 0.05);
    updateTransform(nextZoom, positionRef.current);
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    const fitZoom = calculateFitZoom(naturalSize);
    updateTransform(fitZoom, { x: 0, y: 0 });
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

    const onWheelEvent = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // On trackpads, pinches send wheel events with e.ctrlKey === true.
      // We use a higher scale base for pinch-to-zoom than standard scrolling to make it snappier.
      const isPinch = e.ctrlKey;
      const base = isPinch ? 1.008 : 1.003;
      const factor = Math.pow(base, -e.deltaY);
      
      const currentZoom = zoomRef.current;
      const currentPos = positionRef.current;
      
      const nextZoom = Math.min(Math.max(currentZoom * factor, 0.05), 10);
      const scaleChange = nextZoom / currentZoom;
      
      const rect = el.getBoundingClientRect();
      const C_orig_x = rect.left + rect.width / 2;
      const C_orig_y = rect.top + rect.height / 2;
      
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      
      const nextX = (mouseX - C_orig_x) * (1 - scaleChange) + currentPos.x * scaleChange;
      const nextY = (mouseY - C_orig_y) * (1 - scaleChange) + currentPos.y * scaleChange;
      
      updateTransform(nextZoom, { x: nextX, y: nextY });
    };

    // Handle Safari high-precision native trackpad gestures
    const onGestureStart = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      gestureStartZoomRef.current = zoomRef.current;
    };

    const onGestureChange = (e: any) => {
      e.preventDefault();
      e.stopPropagation();
      if (gestureStartZoomRef.current !== null) {
        // Boost pinch speed by a factor of 1.5 to make it feel more responsive
        const adjustedScale = 1 + (e.scale - 1) * 1.5;
        const nextZoom = Math.min(Math.max(gestureStartZoomRef.current * adjustedScale, 0.05), 10);
        
        const currentZoom = zoomRef.current;
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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      // e.buttons !== 1 check ensures dragging ends if user releases the mouse button outside the window
      if (e.buttons !== 1) {
        setIsDragging(false);
        return;
      }
      const nextX = e.clientX - dragStart.x;
      const nextY = e.clientY - dragStart.y;
      updateTransform(zoomRef.current, { x: nextX, y: nextY });
    };

    const handleGlobalMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // We don't preventDefault here to allow clicks to possibly go through if needed, 
    // but we stop propagation to keep the modal from closing.
    e.stopPropagation();
    
    const count = e.touches.length;
    if (count === 1) {
      // Enable panning
      const touch = e.touches[0];
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      setIsDragging(true);
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else if (count === 2) {
      // Enable pinching, disable panning
      setIsDragging(false);
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      setInitialPinchDistance(dist);
      setInitialPinchZoom(zoom);
      setInitialPinchPosition(position);
      const midX = (touch1.clientX + touch2.clientX) / 2;
      const midY = (touch1.clientY + touch2.clientY) / 2;
      setInitialPinchMidpoint({ x: midX, y: midY });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Essential for iPad to prevent system-level gestures like page scroll/zoom
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    const count = e.touches.length;
    
    if (count === 1 && isDragging) {
      const touch = e.touches[0];
      const nextX = touch.clientX - dragStart.x;
      const nextY = touch.clientY - dragStart.y;
      updateTransform(zoomRef.current, { x: nextX, y: nextY });
    } else if (count === 2 && initialPinchDistance !== null && initialPinchZoom !== null && initialPinchPosition && initialPinchMidpoint) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
      const factor = dist / initialPinchDistance;
      const nextZoom = Math.min(Math.max(initialPinchZoom * factor, 0.05), 10);
      
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
    const count = e.touches.length;
    
    if (count === 0) {
      // All fingers lifted
      setIsDragging(false);
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else if (count === 1) {
      // One finger remains, transition back to panning mode
      const touch = e.touches[0];
      // Reset drag start relative to current position to avoid jumps
      setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
      setIsDragging(true);
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else {
      // More than 1 finger remains but wasn't handled, reset pinch
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    }
  };

  return (
    <>
      <div 
        className="flex justify-center my-12 bg-black/40 backdrop-blur-sm p-10 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group cursor-pointer relative min-h-[200px]"
        role="button"
        aria-label={t.mermaid.expand}
        onClick={toggleModal}
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
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{t.common.loadingChart}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="absolute top-4 right-4 p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-20">
          <Maximize2 size={16} className="text-brand-accent" />
        </div>
        <div ref={ref} className="mermaid w-full flex justify-center transition-transform duration-500 group-hover:scale-[1.01]" />
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            onClick={toggleModal}
          >
            <div className="absolute top-6 right-6 flex items-center gap-4 z-[110]">
              <div className="flex bg-white/10 backdrop-blur-md border border-white/10 rounded-full p-1 shadow-2xl">
                <button 
                  onClick={handleZoomOut}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.mermaid.zoomOut}
                >
                  <ZoomOut size={18} className="text-white/70" />
                </button>
                <button 
                  onClick={handleResetZoom}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.mermaid.reset}
                >
                  <RotateCcw size={18} className="text-white/70" />
                </button>
                <button 
                  onClick={handleZoomIn}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.mermaid.zoomIn}
                >
                  <ZoomIn size={18} className="text-white/70" />
                </button>
              </div>

              <button 
                onClick={toggleModal}
                className="bg-white/10 border border-white/10 text-white p-3 rounded-full hover:bg-white/20 transition-colors shadow-2xl active:scale-95 group/close"
                aria-label={t.mermaid.close}
              >
                <X size={20} className="group-hover/close:rotate-90 transition-transform duration-300" />
              </button>
            </div>

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing touch-none"
              onClick={e => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
            <div 
                ref={containerRef}
                className="mermaid select-none flex items-center justify-center pointer-events-none"
                style={{ 
                  width: naturalSize.width ? `${naturalSize.width}px` : '100%',
                  height: naturalSize.height ? `${naturalSize.height}px` : '100%',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center'
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </motion.div>

            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
              <div className="px-6 py-2 bg-white/5 border border-white/10 rounded-full backdrop-blur-md shadow-2xl">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-300">
                  {Math.round(zoom * 100)}% {t.mermaid.viewInfo}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
