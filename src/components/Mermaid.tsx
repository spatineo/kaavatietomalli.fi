import { useEffect, useRef, useState } from 'react';
import mermaid from '../lib/mermaid';
import { motion, AnimatePresence } from 'motion/react';
import { X, Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

mermaid.initialize({
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
  themeVariables: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    fontSize: '16px',
    primaryColor: '#1A1A1C',
    primaryTextColor: '#FFFFFF',
    primaryBorderColor: '#FFAF00',
    lineColor: '#FFAF00',
    secondaryColor: '#2563EB',
    tertiaryColor: '#121214',
    mainBkg: '#1A1A1C',
    nodeBorder: '#FFAF00',
    clusterBkg: '#000000',
    clusterBorder: '#888888',
    titleColor: '#FFFFFF',
    edgeLabelBackground: '#121214',
    nodeTextColor: '#FFFFFF',
  }
});

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const t = getTranslations(CONFIG.language as Language);
  const ref = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });

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
        try {
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
          } finally {
            document.body.removeChild(tempDiv);
          }
        } catch (error) {
          console.error('Mermaid error:', error);
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
      setZoom(calculateFitZoom(size));
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(prev => Math.min(prev * 1.2, 10)); // Progressive zoom, up to 1000%
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoom(prev => Math.max(prev * 0.8, 0.05)); // Progressive zoom, down to 5%
  };

  const handleResetZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZoom(calculateFitZoom(naturalSize));
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    
    // Sensitivity factor for wheel/trackpad
    // Mice typically have deltaY around 100 per notch, trackpads around 1-10
    const factor = Math.pow(1.001, -e.deltaY);
    
    setZoom(prev => {
      const nextZoom = prev * factor;
      return Math.min(Math.max(nextZoom, 0.05), 10);
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <>
      <div 
        className="flex justify-center my-12 bg-black/40 backdrop-blur-sm p-10 rounded-3xl border border-white/10 overflow-hidden shadow-2xl group cursor-pointer relative"
        role="button"
        aria-label={t.mermaid.expand}
        onClick={toggleModal}
      >
        <div className="absolute top-4 right-4 p-2 bg-white/5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 size={16} className="text-brand-accent" />
        </div>
        <div ref={ref} className="mermaid w-full flex justify-center transition-transform duration-500 group-hover:scale-[1.01]" />
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
            onClick={toggleModal}
            onWheel={handleWheel}
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
              className="w-full h-full overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
              onClick={e => e.stopPropagation()}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
            <div 
                ref={containerRef}
                className="mermaid select-none flex items-center justify-center"
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
