import { useEffect, useRef, useState } from 'react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';
import { InteractiveImage } from './InteractiveImage';

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
          font-size: 20px !important;
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

interface MermaidProps {
  chart: string;
}

export function Mermaid({ chart }: MermaidProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [svgContent, setSvgContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bindFunctionsRef = useRef<((el: Element) => void) | null>(null);

  useEffect(() => {
    if (chart) {
      const renderDiagram = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const mermaid = await getMermaid();
          
          if ('fonts' in document) {
            await document.fonts.ready;
          }
          
          const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
          
          const tempDiv = document.createElement('div');
          tempDiv.className = 'mermaid';
          tempDiv.style.position = 'absolute';
          tempDiv.style.left = '-9999px';
          tempDiv.style.top = '-9999px';
          tempDiv.style.visibility = 'hidden';
          document.body.appendChild(tempDiv);
          
          try {
            const { svg, bindFunctions } = await mermaid.render(id, chart, tempDiv);
            setSvgContent(svg);
            bindFunctionsRef.current = bindFunctions || null;
            setIsLoading(false);
            window.dispatchEvent(new CustomEvent('mermaid-render-complete'));
          } finally {
            if (tempDiv.parentNode === document.body) {
              document.body.removeChild(tempDiv);
            }
          }
        } catch (err) {
          console.error('Mermaid error:', err);
          setIsLoading(false);
          setError(t.mermaid.renderError);
        }
      };

      renderDiagram();
    }
  }, [chart]);

  if (error) {
    return (
      <div data-testid="mermaid-fallback" className="text-red-500 text-xs font-mono p-4 border border-red-500/20 rounded bg-red-500/5 my-6">
        {error}
      </div>
    );
  }

  return (
    <InteractiveImage
      svgContent={svgContent}
      bindFunctions={bindFunctionsRef.current || undefined}
      isLoading={isLoading}
      dataTestId="mermaid"
      className="mermaid"
    />
  );
}
