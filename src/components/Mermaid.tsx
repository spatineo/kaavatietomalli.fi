import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ZoomIn, ZoomOut, Maximize, Expand } from 'lucide-react';
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
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
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
        titlePadding: 25,
        barHeight: 30, // Generous bar height to prevent text height-spill and cramped layout
        barGap: 12, // More vertical spacing between bars to avoid overlap
        topPadding: 80, // Adds generous vertical padding on top of the bar section
        leftPadding: 130, // Keeps section labels on the left from overlapping bars/dates
        gridLineStartPadding: 20, // Adds padding on top of grid lines
        fontSize: 13, // Explicit readable font size for Gantt text
        sectionFontSize: 13, // Section header font size
        numberSectionHeaderYOffset: 12,
        useWidth: 1200, // Renders Gantt across wider baseline to avoid squeezing text
        useMaxWidth: false
      },
      themeCSS: `
        /* Chart title font for pie and gantt diagrams */
        .gantt .titleText, .titleText, .pieTitleText, text.titleText, .pie-title {
          font-size: 20px; !important;
          fill: #FFFFFF !important;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: bold !important;
        }

        /* Gantt chart label adjustments */
        .taskText, .taskTextInside {
          font-size: 13px !important;
          fill: #111827 !important; /* High contrast dark text on yellow/orange Gantt bars */
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: 600 !important;
        }
        .gantt .taskTextOutside, .taskTextOutside {
          font-size: 13px !important;
          fill: #A0AEC0 !important;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: 500 !important;
        }
        .gantt .sectionText, .sectionText {
          font-size: 13px !important;
          fill: #FFAF00 !important;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
          font-weight: 600 !important;
        }
        .gantt .tick text, .tick text {
          font-size: 11px !important;
          fill: #A0AEC0 !important;
          font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        }
        .gantt .grid .tick text, .grid .tick text {
          font-size: 11px !important;
          fill: #A0AEC0 !important;
        }

        /* Add some vertical safety margins around the gantt container to ensure bottom padding */
        svg.gantt, svg[id^="gantt"], svg:has(.taskText), svg:has(.sectionText) {
          padding-top: 10px !important;
          padding-bottom: 30px !important;
        }

        /* Prevent black and very dark fills in all diagrams */
        /*
        .node rect, .node circle, .node polygon, .node path, .node ellipse {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
          stroke-width: 1.5px !important;
        }
        */
        
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

        .node.default path {
          fill: #2C303B !important;
          fill-opacity: 1 !important;
          stroke: #FFAF00 !important;
          stroke-width: 1.5px !important;
        }

        .node.codelistClass path {
          fill: #0a191c !important;  
          stroke: #386365 !important;
          stroke-width: 1.5px !important;
        }

        .node.plainClass path {
          fill: #222222 !important;    
          stroke: #616161 !important;
          stroke-width: 1.5px !important;
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
        path.mindmap-edge-0, .mindmap-edge-0, path.section-edge-0, .section-edge-0 { stroke: #FFAF00 !important; stroke-width: 3px !important; }
        path.mindmap-edge-1, .mindmap-edge-1, path.section-edge-1, .section-edge-1 { stroke: #3B82F6 !important; stroke-width: 3px !important; }
        path.mindmap-edge-2, .mindmap-edge-2, path.section-edge-2, .section-edge-2 { stroke: #10B981 !important; stroke-width: 3px !important; }
        path.mindmap-edge-3, .mindmap-edge-3, path.section-edge-3, .section-edge-3 { stroke: #EC4899 !important; stroke-width: 3px !important; }
        path.mindmap-edge-4, .mindmap-edge-4, path.section-edge-4, .section-edge-4 { stroke: #8B5CF6 !important; stroke-width: 3px !important; }
        path.mindmap-edge-5, .mindmap-edge-5, path.section-edge-5, .section-edge-5 { stroke: #F59E0B !important; stroke-width: 3px !important; }

        g.nodes .mindmap-node.section-0 path { fill: #FFAF00 !important; }
        g.nodes .mindmap-node.section-0 .label span { color: #2F2F2F !important; }
        g.nodes .mindmap-node.section-1 path { fill: #3B82F6 !important; }
        g.nodes .mindmap-node.section-2 path { fill: #10B981 !important; }
        g.nodes .mindmap-node.section-2 .label span { color: #2F2F2F !important; }
        g.nodes .mindmap-node.section-3 path { fill: #EC4899 !important; }
        g.nodes .mindmap-node.section-4 path { fill: #8B5CF6 !important; }
        g.nodes .mindmap-node.section-5 path { fill: #F59E0B !important; }
        
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
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
        fontSize: '16px',
        ganttFontSize: '13px',
        sectionFontSize: '13px',
        primaryColor: '#2C303B',
        primaryTextColor: '#FFFFFF',
        primaryBorderColor: '#FFAF00',
        lineColor: '#FFAF00',
        secondaryColor: '#FFAF00',
        tertiaryColor: '#27a6ba',
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

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const t = getTranslations(CONFIG.language as Language);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const glasspaneRef = useRef<HTMLDivElement>(null);
  const bindFunctionsRef = useRef<((el: Element) => void) | null>(null);
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

  const [isZooming, setIsZooming] = useState(false);
  const [continuousZoom, setContinuousZoom] = useState<number | null>(null);
  const zoomTimeoutRef = useRef<any>(null);


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

  // Drag, wheel, and tap state trackers
  const wheelAccumulatorRef = useRef(0);
  const dragStartPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchHasMovedRef = useRef(false);
  const touchIsDraggingRef = useRef(false);

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
            bindFunctionsRef.current = bindFunctions || null;
            if (ref.current) {
              ref.current.innerHTML = svg;
              if (bindFunctions) {
                bindFunctions(ref.current);
              }
            }
            setIsLoading(false);
            window.dispatchEvent(new CustomEvent('mermaid-render-complete'));
          } finally {
            if (tempDiv.parentNode === document.body) {
              document.body.removeChild(tempDiv);
            }
          }
        } catch (error) {
          console.error('Mermaid error:', error);
          setIsLoading(false);
          if (ref.current) {
            ref.current.innerHTML = `<div data-testid="mermaid-fallback" class="text-red-500 text-xs font-mono p-4 border border-red-500/20 rounded bg-red-500/5">${t.mermaid.renderError}</div>`;
          }
        }
      };

      renderDiagram();
    }
  }, [chart]);

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
    // Prevent division by zero if the element has no layout dimensions
    if (size.width === 0 || size.height === 0) {
      return 1;
    }

    // Account for optional margin/padding around the viewport bounds
    const availableWidth = Math.max(0, window.innerWidth - FULL_ZOOM_PADDING * 2);
    const availableHeight = Math.max(0, window.innerHeight - FULL_ZOOM_PADDING * 2);

    // Compute scale factors for both axes
    let scaleX = availableWidth / size.width;
    let scaleY = availableHeight / size.height;
    
    // The smaller scale factor ensures the element fits within BOTH bounds
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
      const progress = -wheelAccumulatorRef.current / threshold; // positive means zooming in (higher index)
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
        
        // Find nearest step in ZOOM_STEPS
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
        const href = current.getAttribute('href') || current.getAttribute('xlink:href');
        if (href) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = href;
          return;
        }
      }
      if (current.classList.contains('clickable') || current.getAttribute('clickable') === 'true') {
        const href = current.getAttribute('href') || current.getAttribute('xlink:href');
        if (href) {
          e.preventDefault();
          e.stopPropagation();
          window.location.href = href;
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

    // 1. Temporarily disable pointer events on the glasspane
    const originalPointerEvents = glasspaneRef.current.style.pointerEvents;
    glasspaneRef.current.style.pointerEvents = 'none';

    // 2. Find the element at the coordinate
    const targetEl = document.elementFromPoint(clientX, clientY) as HTMLElement | null;

    // 3. Restore pointer events on the glasspane
    glasspaneRef.current.style.pointerEvents = originalPointerEvents;

    if (!targetEl) return;

    // Check if the target element is inside our diagram container
    const container = containerRef.current;
    if (container.contains(targetEl)) {
      // Find if we clicked on a link or a clickable element
      let current: HTMLElement | null = targetEl;
      while (current && current !== container) {
        const tagName = current.tagName.toLowerCase();
        if (tagName === 'a') {
          const href = current.getAttribute('href') || current.getAttribute('xlink:href');
          if (href) {
            window.location.href = href;
            return;
          }
        }
        if (current.classList.contains('clickable') || current.getAttribute('clickable') === 'true') {
          const href = current.getAttribute('href') || current.getAttribute('xlink:href');
          if (href) {
            window.location.href = href;
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
      // Clicked outside the diagram container (on the background). Close the modal!
      toggleModal();
    }
  };

  const setModalContainerRef = (el: HTMLDivElement | null) => {
    (containerRef as any).current = el;
    if (el) {
      if (bindFunctionsRef.current) {
        bindFunctionsRef.current(el);
      }

      // Dynamically measure the SVG element inside the modal container
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
    // Only handle left clicks
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
      
      // Threshold to distinguish dragging from clicking
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
      // Enable panning
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
      // Enable pinching, disable panning
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

      // Find nearest step in ZOOM_STEPS
      const nextZoom = ZOOM_STEPS.reduce((prev, curr) => 
        Math.abs(curr - targetZoom) < Math.abs(prev - targetZoom) ? curr : prev
      );
      
      if (nextZoom === zoomRef.current) {
        // Skip updating if we haven't crossed into a new step
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
      // All fingers lifted
      if (touchIsDraggingRef.current && !touchHasMovedRef.current && touchStartRef.current) {
        const duration = Date.now() - touchStartRef.current.time;
        if (duration < 300) {
          // This is a tap!
          handlePointerClick(touchStartRef.current.x, touchStartRef.current.y);
        }
      }
      
      touchIsDraggingRef.current = false;
      setInitialPinchDistance(null);
      setInitialPinchZoom(null);
      setInitialPinchPosition(null);
      setInitialPinchMidpoint(null);
    } else if (count === 1) {
      // One finger remains, transition back to panning mode
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

  return (
    <>
      <div 
        data-testid="mermaid-container"
        className="flex justify-center my-12 bg-black/40 backdrop-blur-sm p-10 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group cursor-pointer relative min-h-[200px]"
        role="button"
        aria-label={t.mermaid.expand}
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
            data-testid="mermaid-modal"
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
                  title={t.mermaid.zoomOut}
                >
                  <ZoomOut size={18} className="text-white/70" />
                </button>
                <button 
                  onClick={handleZoomToFit}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors transition-transform active:scale-95"
                  title={t.mermaid.zoomToFit}
                >
                  <Maximize size={18} className="text-white/70">
                    <Expand size={12}  x={6} y={6} className="text-white/70"/>
                  </Maximize>
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
                className="bg-white/10 border border-white/10 text-white p-3 backdrop-blur-md rounded-full hover:bg-white/20 transition-colors shadow-2xl active:scale-95 group/close"
                aria-label={t.mermaid.close}
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
                    {/* The vertical track line */}
                    <div className="absolute inset-y-0 w-0.5 bg-white/15 rounded-full" />
                    
                    {/* Discrete Tick Marks */}
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

                    {/* Dynamic continuous zoom pointer (Amber color to show micro-movements) */}
                    {continuousZoom !== null && (
                      <div
                        className="absolute w-5 h-1 bg-amber-400 rounded-full shadow-lg shadow-amber-400/50 -translate-x-1/2 left-1/2 transition-all duration-75 z-20 border border-black/40"
                        style={{ bottom: `calc(${(continuousIdx / 19) * 100}% - 1px)` }}
                      />
                    )}

                    {/* Discrete Zoom step pointer (Brand Accent) */}
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
              onClick={e => e.stopPropagation()}
            >
              <div 
                ref={setModalContainerRef}
                className="mermaid modal-container select-none flex items-center justify-center shrink-0"
                style={{ 
                  width: naturalSize.width ? `${naturalSize.width}px` : '100%',
                  height: naturalSize.height ? `${naturalSize.height}px` : '100%',
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: 'center center',
                  flexShrink: 0
                }}
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />

              {/* Transparent Glasspane that catches all mouse/touch gesture inputs */}
              <div
                ref={glasspaneRef}
                data-testid="mermaid-glasspane"
                className="absolute inset-0 cursor-grab active:cursor-grabbing touch-none z-10"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
