import { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Map, Code, Maximize2, Minimize2, Info, Layers, AlertCircle } from 'lucide-react';
import { LazySyntaxHighlighter } from './LazySyntaxHighlighter';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

// Lazy load Leaflet and Proj4 libraries
let LeafletInstance: any = null;
let Proj4Instance: any = null;
let mapLibsReady = false;

async function getMapLibraries() {
  if (mapLibsReady) return { L: LeafletInstance, proj4: Proj4Instance };

  const [leafletModule, proj4Module] = await Promise.all([
    import('leaflet'),
    import('proj4')
  ]);

  try {
    await import('leaflet/dist/leaflet.css');
  } catch (e) {
    console.warn('Leaflet CSS failed to load dynamically', e);
  }

  LeafletInstance = leafletModule.default || leafletModule;
  Proj4Instance = proj4Module.default || proj4Module;

  const p4 = Proj4Instance;
  p4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
  p4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs');
  p4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');

  // Register Finnish Gauss-Kruger coordinate systems GK19 to GK31 (EPSG:3873 to EPSG:3885)
  for (let i = 19; i <= 31; i++) {
    const epsgCode = `EPSG:${3854 + i}`;
    const centralMeridian = i;
    const falseEasting = i * 1000000 + 500000;
    p4.defs(epsgCode, `+proj=tmerc +lat_0=0 +lon_0=${centralMeridian} +k=1 +x_0=${falseEasting} +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs`);
  }

  mapLibsReady = true;
  return { L: LeafletInstance, proj4: Proj4Instance };
}

function detectCrs(rawCrs: any): string | null {
  if (!rawCrs) return null;
  let crsStr = '';
  if (typeof rawCrs === 'string') {
    crsStr = rawCrs;
  } else if (rawCrs && typeof rawCrs === 'object' && typeof rawCrs.href === 'string') {
    crsStr = rawCrs.href;
  } else {
    return null;
  }

  const normalized = crsStr.toLowerCase();
  
  // Check for CRS84 / WGS84 first
  if (normalized.includes('crs84') || normalized.includes('4326')) {
    return 'EPSG:4326';
  }

  // Split on delimiters and scan backwards for the first positive numeric segment
  // This correctly avoids version segments like /0/ in "http://www.opengis.net/def/crs/EPSG/0/3067"
  const parts = crsStr.replace(/\/$/, '').split(/[\/:#=]+/);
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].trim();
    if (/^\d+$/.test(p)) {
      const code = parseInt(p, 10);
      if (code > 0) {
        return `EPSG:${code}`;
      }
    }
  }

  return null;
}

function transformCoordinates(coords: any, sourceCrs: string, proj4Instance: any): any {
  if (!Array.isArray(coords)) return coords;

  // Check if it's a coordinate pair [X, Y] or [X, Y, Z]
  if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
    try {
      if (!proj4Instance) return coords;
      // transform from sourceCrs to EPSG:4326 (WGS84)
      const transformed = proj4Instance(sourceCrs, 'EPSG:4326', [coords[0], coords[1]]);
      if (coords.length > 2) {
        return [transformed[0], transformed[1], coords[2]]; // Keep altitude/Z if present
      }
      return transformed;
    } catch (e) {
      console.warn(`Reprojection error with CRS ${sourceCrs} for coordinates:`, coords, e);
      return coords;
    }
  }

  // Otherwise recurse down for arrays of coordinates (Polygons, MultiPolygons, LineStrings, etc.)
  return coords.map((c: any) => transformCoordinates(c, sourceCrs, proj4Instance));
}

// For JSON-FG (JSON Features for Geometry) support
// Validates, parses coordRefSys, and transforms JSON-FG/GeoJSON non-WGS84 coordinate systems to EPSG:4326
function normalizeGeoJSON(inputStr: string, proj4Instance: any): { data: any; error: string | null; crs: string | null } {
  try {
    const parsed = JSON.parse(inputStr);
    if (!parsed || typeof parsed !== 'object') {
      return { data: null, error: 'Input is not a valid JSON Object', crs: null };
    }

    // Clone to safely mutate if need be
    const clone = JSON.parse(JSON.stringify(parsed));

    // Detect coordinate reference system (CRS) at top-level
    const rootCrs = detectCrs(clone.coordRefSys);
    let activeCrs = rootCrs || 'EPSG:4326';

    const processFeature = (feature: any, collectionCrs: string | null) => {
      if (!feature || typeof feature !== 'object') return feature;

      // Detect feature-level CRS if present, fallback to collection CRS
      const featureCrs = detectCrs(feature.coordRefSys) || collectionCrs || 'EPSG:4326';

      // JSON-FG support: If feature.geometry is missing but feature.place is present,
      // map place to geometry so standard GeoJSON renders can paint it.
      if (!feature.geometry && feature.place) {
        feature.geometry = feature.place;
      }

      // If we have a non-WGS84 CRS, reproject the geometry to base EPSG:4326 (WGS84) in-memory
      if (featureCrs && featureCrs !== 'EPSG:4326' && feature.geometry) {
        try {
          if (proj4Instance && proj4Instance.defs(featureCrs)) {
            const reprojectedGeom = JSON.parse(JSON.stringify(feature.geometry));
            reprojectedGeom.coordinates = transformCoordinates(reprojectedGeom.coordinates, featureCrs, proj4Instance);
            feature.geometry = reprojectedGeom;
            
            // Store original CRS in properties for UI display in popups
            feature.properties = feature.properties || {};
            feature.properties['_ALKUPERÄINEN_CRS'] = featureCrs;
          } else {
            console.warn(`Definition for CRS ${featureCrs} is not registered in Proj4 or library not loaded yet.`);
          }
        } catch (e) {
          console.error(`Error transforming feature geometry with CRS ${featureCrs}:`, e);
        }
      }

      return feature;
    };

    if (clone.type === 'FeatureCollection' && Array.isArray(clone.features)) {
      clone.features = clone.features.map((f: any) => processFeature(f, rootCrs));
      return { data: clone, error: null, crs: rootCrs };
    }

    if (clone.type === 'Feature') {
      const processed = processFeature(clone, rootCrs);
      return { data: processed, error: null, crs: detectCrs(processed.coordRefSys) || rootCrs };
    }

    // Geometry direct translation
    const geometryTypes = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection'];
    if (clone.type && geometryTypes.includes(clone.type)) {
      let finalGeometry = clone;
      if (activeCrs && activeCrs !== 'EPSG:4326') {
        try {
          if (proj4Instance && proj4Instance.defs(activeCrs)) {
            finalGeometry = JSON.parse(JSON.stringify(clone));
            finalGeometry.coordinates = transformCoordinates(finalGeometry.coordinates, activeCrs, proj4Instance);
          }
        } catch (e) {
          console.error(`Error transforming geometry coordinates:`, e);
        }
      }
      return {
        data: {
          type: 'Feature',
          geometry: finalGeometry,
          properties: { _ALKUPERÄINEN_CRS: activeCrs }
        },
        error: null,
        crs: activeCrs
      };
    }

    // Fallback if it has some custom list of coordinates
    return { data: clone, error: null, crs: activeCrs };
  } catch (err: any) {
    return { data: null, error: err?.message || 'Failed to parse JSON content', crs: null };
  }
}

interface GeoJsonMapViewerProps {
  code: string;
  language?: string;
}

const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>'
  }
};

export function GeoJsonMapViewer({ code, language = 'geojson' }: GeoJsonMapViewerProps) {
  const t = getTranslations(CONFIG.language as Language);
  const [activeTab, setActiveTab] = useState<'map' | 'code'>('map');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tileStyle, setTileStyle] = useState<'dark' | 'light'>('dark');

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const geojsonLayerRef = useRef<any | null>(null);
  const tileLayerRef = useRef<any | null>(null);

  const [libs, setLibs] = useState<{ L: any; proj4: any } | null>(() => {
    if (mapLibsReady) return { L: LeafletInstance, proj4: Proj4Instance };
    return null;
  });
  const [libsError, setLibsError] = useState<string | null>(null);

  useEffect(() => {
    if (libs) return;
    let ignore = false;
    getMapLibraries()
      .then(loadedLibs => {
        if (!ignore) {
          setLibs(loadedLibs);
        }
      })
      .catch(err => {
        console.error('Failed to load map libraries:', err);
        if (!ignore) {
          setLibsError(err.message || String(err));
        }
      });
    return () => { ignore = true; };
  }, [libs]);

  const { data: geojsondata, error: parseError, crs: detectedCrs } = useMemo(() => {
    return normalizeGeoJSON(code, libs?.proj4);
  }, [code, libs?.proj4]);

  // Prevent body scrolling when the map viewer is inside Fullscreen mode
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // If there's an error parsing, force the 'code' tab
  useEffect(() => {
    if (parseError) {
      setActiveTab('code');
    }
  }, [parseError]);

  // Handle map initialization and cleanup
  useEffect(() => {
    if (activeTab !== 'map' || parseError || !mapContainerRef.current || !libs) {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        geojsonLayerRef.current = null;
        tileLayerRef.current = null;
      }
      return;
    }

    const { L } = libs;

    try {
      // Initialize map if it doesn't exist
      if (!mapRef.current) {
      // Default to center of Finland
      const map = L.map(mapContainerRef.current, {
        zoomControl: false, // Custom placed zoom controls for clean UI
        attributionControl: true
      }).setView([62.0, 26.0], 5);

      // Disable scroll and click event propagation on popup container elements to avoid background scroll leakage
      map.on('popupopen', (e: any) => {
        const container = e.popup.getElement();
        if (container) {
          L.DomEvent.disableScrollPropagation(container);
          L.DomEvent.disableClickPropagation(container);
        }
      });

      mapRef.current = map;

      // Add zoom control in top right
      L.control.zoom({
        position: 'topright'
      }).addTo(map);
    }

    const map = mapRef.current;

    // Remove existing tile layer if style changed
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    // Set map background map tiles
    const selectedTile = TILE_LAYERS[tileStyle];
    const tileLayer = L.tileLayer(selectedTile.url, {
      attribution: selectedTile.attribution,
      maxZoom: 19
    }).addTo(map);
    tileLayerRef.current = tileLayer;

    // Remove old geojson layers
    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }

    // Load and style the GeoJSON
    if (geojsondata) {
      try {
        // Aesthetic custom brand styles
        const defaultColor = tileStyle === 'dark' ? '#FFAF00' : '#E08A00'; // high contrast orange-yellow

        // Vibrant color palette matching the modern slate style
        const PALETTE = [
          '#FFAF00', // Amber/Gold
          '#38BDF8', // Sky Blue
          '#34D399', // Emerald/Mint
          '#A78BFA', // Violet/Purple
          '#F472B6', // Pink
          '#F97316', // Orange
          '#2DD4BF', // Teal
          '#FB7185', // Rose
          '#818CF8', // Indigo
          '#10B981'  // Green
        ];

        const featureTypeToColorMap: Record<string, string> = {};
        let colorCounter = 0;

        const getFeatureColor = (feature: any): string => {
          const typeVal = feature?.featureType ?? feature?.properties?.featureType;
          if (typeVal === undefined || typeVal === null) {
            return defaultColor;
          }
          const typeStr = String(typeVal).trim();
          if (!typeStr) {
            return defaultColor;
          }
          if (!featureTypeToColorMap[typeStr]) {
            const color = PALETTE[colorCounter % PALETTE.length];
            featureTypeToColorMap[typeStr] = color;
            colorCounter++;
          }
          return featureTypeToColorMap[typeStr];
        };

        const geojsonLayer = L.geoJSON(geojsondata, {
          style: (feature) => {
            const featColor = getFeatureColor(feature);
            return {
              color: featColor,
              weight: 3,
              opacity: 0.85,
              fillColor: featColor,
              fillOpacity: 0.2
            };
          },
          pointToLayer: (feature, latlng) => {
            const isDark = tileStyle === 'dark';
            const featColor = getFeatureColor(feature);
            const strokeColor = isDark ? '#000000' : '#FFFFFF';

            // High-contrast custom HTML marker with precise pixel coordinates and anchoring
            const customIcon = L.divIcon({
              className: 'custom-leaflet-marker',
              html: `
                <div style="width: 24px; height: 24px; position: relative; display: flex; align-items: center; justify-content: center; margin: 0; padding: 0;">
                  <div class="shadow-md" style="width: 10px; height: 10px; background-color: ${featColor}; border: 1.5px solid ${strokeColor}; border-radius: 9999px; position: relative; z-index: 10;"></div>
                </div>
              `,
              iconSize: [24, 24],
              iconAnchor: [12, 12],
              popupAnchor: [0, -10]
            });
            return L.marker(latlng, { icon: customIcon });
          },
          onEachFeature: (feature, layer) => {
            if (feature.properties) {
              const entries = Object.entries(feature.properties);
              if (entries.length > 0) {
                let html = `
                  <div class="p-3 max-h-56 overflow-y-auto custom-scrollbar leading-normal min-w-[200px] font-sans">
                    <div class="font-bold border-b border-white/20 pb-1 mb-2 text-white text-[10px] tracking-wider uppercase">
                      ${t.geojson.propertiesTitle}
                    </div>
                    <table class="w-full border-collapse text-[11px] text-slate-200">
                      <tbody>
                `;
                entries.forEach(([key, val]) => {
                  const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                  html += `
                    <tr class="border-b border-white/5 last:border-0 hover:bg-white/5">
                      <td class="font-mono text-amber-400 font-semibold pr-4 py-1 align-top break-all">${key}</td>
                      <td class="break-words py-1 text-white/95 align-top">${valStr}</td>
                    </tr>
                  `;
                });
                html += `
                      </tbody>
                    </table>
                  </div>
                `;
                layer.bindPopup(html, {
                  className: 'custom-leaflet-popup',
                  maxWidth: 320
                });
              }
            }

            // Hover effects
            layer.on({
              mouseover: (e: any) => {
                const l = e.target;
                if (typeof l.setStyle === 'function') {
                  l.setStyle({
                    weight: 5,
                    color: '#FFFFFF',
                    fillOpacity: 0.35
                  });
                }
              },
              mouseout: (e: any) => {
                const l = e.target;
                if (typeof l.setStyle === 'function') {
                  const baseAccent = tileStyle === 'dark' ? '#FFAF00' : '#E08A00';
                  l.setStyle({
                    color: baseAccent,
                    weight: 3,
                    fillOpacity: 0.2
                  });
                }
              }
            });
          }
        }).addTo(map);

        geojsonLayerRef.current = geojsonLayer;

        // Auto fly/fit boundaries
        const bounds = geojsonLayer.getBounds();
        if (bounds.isValid()) {
          // Check if single coordinate/bound
          if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
            map.setView(bounds.getNorthEast(), 14);
          } else {
            map.fitBounds(bounds, { padding: [30, 30] });
          }
        }
      } catch (err) {
        console.error('Leaflet parsing of geojson data failed', err);
      }
    }

      // Refresh size representation on build
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, 150);
    } catch (err: any) {
      console.error('Failed to initialize map fully:', err);
      setLibsError(err.message || String(err));
    }

    return () => {
      // Cleanup leaflet mapping hook cleanly
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        geojsonLayerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, [activeTab, tileStyle, geojsondata, parseError, isFullscreen, libs]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };  const viewerTitle = language.toUpperCase() === 'JSONFG' ? 'JSON-FG (OGC Features & Geometries)' : 'GeoJSON Map';const viewerContent = (
    <div
      id={`viewer-${viewerTitle.toLowerCase().replace(/\s+/g, '-')}`}
      className={`border border-white/10 overflow-hidden shadow-2xl bg-black flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] bg-[#0A0A0C] border-none rounded-none w-screen h-screen m-0 p-0'
          : 'relative my-10 min-h-[480px] w-full rounded-2xl'
      }`}
    >
      {/* Viewer Header */}
      <div className="bg-[#09090B] px-5 py-4 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FFAF00]/10 border border-[#FFAF00]/30 flex items-center justify-center text-[#FFAF00]">
            <Map className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
              {t.geojson.interactiveMapBlock}
            </h4>
            <div className="flex flex-col gap-1.5 mt-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {t.geojson.formatLabel}:
                </span>
                <span className="text-[11px] text-[#FFAF00] font-semibold tracking-wide uppercase">
                  {language.toUpperCase() === 'JSONFG' ? 'OGC Features and Geometries JSON' : 'GeoJSON'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {t.geojson.crsLabel}:
                </span>
                <span className="text-[11px] text-amber-400 font-semibold tracking-wide uppercase">
                  {(() => {
                    const crsVal = detectedCrs || 'EPSG:4326';
                    return crsVal === 'EPSG:4326' 
                      ? 'WGS 84 (EPSG:4326)' 
                      : crsVal === 'EPSG:3067' 
                      ? 'ETRS89 / TM35FIN (EPSG:3067)' 
                      : crsVal === 'EPSG:3857' 
                      ? 'Web Mercator (EPSG:3857)' 
                      : crsVal === 'EPSG:3879' 
                      ? 'ETRS89 / GK25FIN (EPSG:3879)' 
                      : `${crsVal} (${t.geojson.reprojectedSuffix})`;
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
 
        {/* Action Controls */}
        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <div className="flex items-center gap-2">
            {/* Segmented active layout view tab toggles */}
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                id="btn-view-map"
                type="button"
                disabled={!!parseError}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                  parseError ? 'opacity-30 cursor-not-allowed' : ''
                } ${
                  activeTab === 'map'
                    ? 'bg-white/15 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('map')}
              >
                <Map className="w-3.5 h-3.5 text-[#FFAF00]" />
                <span>{t.geojson.mapTab}</span>
              </button>
              <button
                id="btn-view-code"
                type="button"
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-2 transition-all ${
                  activeTab === 'code'
                    ? 'bg-white/15 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                onClick={() => setActiveTab('code')}
              >
                <Code className="w-3.5 h-3.5" />
                <span>{t.geojson.codeTab}</span>
              </button>
            </div>

            {/* Expand Mode Fullscreen triggers */}
            <button
              id="btn-toggle-fullscreen"
              type="button"
              className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-all ml-1"
              onClick={toggleFullscreen}
              title={isFullscreen ? t.geojson.exitFullscreen : t.geojson.enterFullscreen}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>

          {/* Custom Base map layers chooser - Only active when "map" mode is on, placed vertically below the rendering selector */}
          {activeTab === 'map' && !parseError && (
            <div className="flex items-center bg-white/5 rounded-lg p-0.5 border border-white/10">
              <button
                id="btn-tile-dark"
                type="button"
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  tileStyle === 'dark' ? 'bg-[#FFAF00] text-black' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setTileStyle('dark')}
                title={t.geojson.darkThemeTooltip}
              >
                {t.geojson.darkTheme}
              </button>
              <button
                id="btn-tile-light"
                type="button"
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  tileStyle === 'light' ? 'bg-[#FFAF00] text-black' : 'text-slate-400 hover:text-white'
                }`}
                onClick={() => setTileStyle('light')}
                title={t.geojson.lightThemeTooltip}
              >
                {t.geojson.lightTheme}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Body panels */}
      <div className="relative flex-1 min-h-0 bg-black flex flex-col">
        {activeTab === 'map' && !parseError ? (
          libsError ? (
            <div 
              data-testid="geojson-map-viewer-fallback"
              className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center min-h-[360px]"
            >
              <AlertCircle className="w-8 h-8 text-amber-500 mb-3 animate-pulse" />
              <h5 className="text-sm font-bold text-slate-300">{t.geojson.interactiveMapBlock || 'Map Rendering Fallback'}</h5>
              <p className="text-xs text-slate-400 max-w-sm mt-1 mx-auto leading-relaxed">
                The map visualization is unavailable in this workspace or test environment. You can read and inspect the full raw data coordinates at any time via the Code tab above.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <a
                  href={`data:application/json;charset=utf-8,${encodeURIComponent(code)}`}
                  download="map-data.geojson"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 transition-colors text-black font-semibold text-xs rounded-lg inline-flex items-center gap-1.5"
                  data-testid="geojson-download-link"
                >
                  Download GeoJSON
                </a>
              </div>
              <span className="text-[10px] text-slate-600 font-mono mt-3 break-all block max-w-md mx-auto">Error: {libsError}</span>
            </div>
          ) : (
            <div className="relative w-full h-full flex-1 flex flex-col min-h-[360px]">
              {/* The absolute container Leaflet bind-draws into */}
              <div
                ref={mapContainerRef}
                className="absolute inset-0 w-full h-full z-0 bg-slate-950 focus:outline-none"
              />
            </div>
          )
        ) : (
          <div className="flex-1 overflow-auto bg-black flex flex-col min-h-[360px] custom-scrollbar">
            {parseError && (
              <div className="m-4 bg-red-950/20 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-sm font-bold text-red-400">{t.geojson.jsonParseError}</h5>
                  <p className="text-xs text-red-300/80 font-mono mt-1">{parseError}</p>
                </div>
              </div>
            )}
            <div className="flex-1 text-sm font-mono overflow-auto bg-black leading-relaxed">
              <LazySyntaxHighlighter
                language="json"
                PreTag="div"
                customStyle={{
                  margin: 0,
                  padding: '1.5rem',
                  fontSize: '13px',
                  fontFamily: '"JetBrains Mono", monospace',
                  background: '#000000',
                }}
              >
                {code}
              </LazySyntaxHighlighter>
            </div>
          </div>
        )}
      </div>

      {/* Footer info strip */}
      <div className="bg-[#09090B]/60 px-5 py-2.5 border-t border-white/10 text-[10px] text-slate-500 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-1.5 leading-none">
          <Info className="w-3 h-3 text-brand-accent/70" />
          <span>{t.geojson.clickShapesForPopups}</span>
        </div>
        <div>
          <span>{isFullscreen ? t.geojson.fullscreenStatus : t.geojson.dynamicStatus}</span>
        </div>
      </div>
    </div>
  );

  if (isFullscreen && typeof window !== 'undefined' && document.body) {
    return createPortal(viewerContent, document.body);
  }

  return viewerContent;
}
