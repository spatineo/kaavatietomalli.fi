import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Map as MapIcon,
  Search,
  Building2,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  Maximize2,
  Minimize2,
  Filter,
  X,
  Layers,
  Info,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Code
} from 'lucide-react';
import { LazySyntaxHighlighter } from './LazySyntaxHighlighter';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';
import { formatPlanDate } from '../lib/utils';
import { getMunicipalityList, getMunicipalityByCode, MunicipalityFeature, MunicipalityInfo } from '../lib/blog';
import {
  ryhtiPlanWfsService,
  getPlanMunicipalityCodes,
  PlanDocument,
  PlanFeature,
  getWfsTypesForPlanType,
  buildWfsCqlFilter
} from '../services/plan-api';
import { useDualFeatureWfs } from '../hooks/useDualFeatureWfs';
import { CodeItem } from '../lib/data-model-types';
import { CallToActionBlock } from './CodeBlock';
import { TILE_LAYERS, TileStyle } from '../lib/basemaps';

// Lazy load Leaflet and Proj4 libraries
let LeafletInstance: any = null;
let Proj4Instance: any = null;
let mapLibsReady = false;

async function getMapLibraries() {
  if (mapLibsReady) return { L: LeafletInstance, proj4: Proj4Instance };

  try {
    const [leafletModule, proj4Module] = await Promise.all([
      import('leaflet').catch(() => null),
      import('proj4').catch(() => null)
    ]);

    try {
      if (typeof window !== 'undefined' && !(window as any).__VITEST_ENVIRONMENT__) {
        await import('leaflet/dist/leaflet.css');
      }
    } catch (e) {
      console.warn('Leaflet CSS failed to load dynamically', e);
    }

    if (leafletModule) {
      LeafletInstance = leafletModule.default || leafletModule;
    }
    if (proj4Module) {
      Proj4Instance = proj4Module.default || proj4Module;
      const p4 = Proj4Instance;
      if (p4 && p4.defs) {
        p4.defs('EPSG:3067', '+proj=utm +zone=35 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs');
        p4.defs('EPSG:3857', '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs');
        p4.defs('EPSG:4326', '+proj=longlat +datum=WGS84 +no_defs');
      }
    }

    mapLibsReady = true;
    return { L: LeafletInstance, proj4: Proj4Instance };
  } catch (err) {
    console.warn('Failed to load map libraries dynamically', err);
    return { L: null, proj4: null };
  }
}

interface PlanExplorerViewProps {
  onBack?: () => void;
  initialPlans?: PlanFeature[];
  initialMunicipalities?: (MunicipalityFeature | MunicipalityInfo)[];
}

const normalizeMunicipalityList = (list: (MunicipalityFeature | MunicipalityInfo)[]): MunicipalityInfo[] => {
  return list.map((item: any) => {
    if (item.properties) {
      const rawCode = String(item.properties.NATCODE || item.properties.kuntatunnus || '').trim();
      const natcode = rawCode.padStart(3, '0');
      return {
        id: item.id || `kunta.${natcode}`,
        natcode,
        kuntatunnus: item.properties.kuntatunnus,
        nameFin: item.properties.NAMEFIN || item.properties.NAMESWE || natcode,
        nameSwe: item.properties.NAMESWE,
        numberOfDetailedPlansInRyhti: item.numberOfDetailedPlansInRyhti ?? item.properties.numberOfDetailedPlansInRyhti ?? 0,
        numberOfMasterPlansInRyhti: item.numberOfMasterPlansInRyhti ?? item.properties.numberOfMasterPlansInRyhti ?? 0,
        properties: item.properties
      };
    }
    const natcode = String(item.natcode || item.kuntatunnus || '').padStart(3, '0');
    return {
      id: item.id || `kunta.${natcode}`,
      natcode,
      kuntatunnus: item.kuntatunnus,
      nameFin: item.nameFin || item.nameSwe || natcode,
      nameSwe: item.nameSwe,
      numberOfDetailedPlansInRyhti: item.numberOfDetailedPlansInRyhti ?? 0,
      numberOfMasterPlansInRyhti: item.numberOfMasterPlansInRyhti ?? 0,
      properties: item.properties
    };
  });
};

const buildMunicipalityMap = (list: (MunicipalityFeature | MunicipalityInfo)[]): Record<string, string> => {
  const map: Record<string, string> = {};
  list.forEach((item: any) => {
    const rawCode = String(item.natcode || item.properties?.NATCODE || item.properties?.kuntatunnus || item.kuntatunnus || '').trim();
    const natcode = rawCode.padStart(3, '0');
    const name = item.nameFin || item.properties?.NAMEFIN || item.properties?.NAMESWE || item.nameSwe || natcode;
    if (natcode) {
      map[natcode] = name;
      const unpadded = String(parseInt(natcode, 10));
      map[unpadded] = name;
      map[rawCode] = name;
    }
  });
  return map;
};

export interface KaavalajiCodeOption {
  uri: string;
  codeValue: string;
  name: string;
  broaderCode?: string;
}

export const DEFAULT_KAAVALAJI_OPTIONS: KaavalajiCodeOption[] = [
  // Yleiskaava types
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/21', codeValue: '21', name: 'Yleiskaava', broaderCode: '2' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/22', codeValue: '22', name: 'Vaiheyleiskaava', broaderCode: '2' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/23', codeValue: '23', name: 'Osayleiskaava', broaderCode: '2' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/24', codeValue: '24', name: 'Kuntien yhteinen yleiskaava', broaderCode: '2' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/25', codeValue: '25', name: 'Maanalainen yleiskaava', broaderCode: '2' },
  // Asemakaava types
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/31', codeValue: '31', name: 'Asemakaava', broaderCode: '3' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/32', codeValue: '32', name: 'Vaiheasemakaava', broaderCode: '3' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/33', codeValue: '33', name: 'Ranta-asemakaava', broaderCode: '3' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/34', codeValue: '34', name: 'Vaiheranta-asemakaava', broaderCode: '3' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/35', codeValue: '35', name: 'Maanalaisten tilojen asemakaava', broaderCode: '3' },
  { uri: 'http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/39', codeValue: '39', name: 'Asemakaava (ohjeellinen tonttijako)', broaderCode: '3' }
];

export const DEFAULT_DIGITAL_ORIGIN_MAP: Record<string, string> = {
  '01': 'Tietomallin mukaan laadittu',
  '02': 'Kokonaan digitoitu',
  '03': 'Osittain digitoitu',
  '04': 'Rajaus digitoitu',
  '0401': 'Rajaus useamman kunnan alueella',
  'http://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/01': 'Tietomallin mukaan laadittu',
  'http://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/02': 'Kokonaan digitoitu',
  'http://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/03': 'Osittain digitoitu',
  'http://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/04': 'Rajaus digitoitu',
  'http://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/0401': 'Rajaus useamman kunnan alueella',
  'https://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/01': 'Tietomallin mukaan laadittu',
  'https://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/02': 'Kokonaan digitoitu',
  'https://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/03': 'Osittain digitoitu',
  'https://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/04': 'Rajaus digitoitu',
  'https://uri.suomi.fi/codelist/rytj/RY_DigitaalinenAlkupera/code/0401': 'Rajaus useamman kunnan alueella'
};

export function getDigitalOriginName(
  digitalOrigin?: string | null,
  codelistMap?: Record<string, string>
): string | null {
  if (!digitalOrigin) return null;
  const raw = String(digitalOrigin).trim();
  if (!raw) return null;

  if (codelistMap && codelistMap[raw]) {
    return codelistMap[raw];
  }
  if (DEFAULT_DIGITAL_ORIGIN_MAP[raw]) {
    return DEFAULT_DIGITAL_ORIGIN_MAP[raw];
  }
  const lastSegment = raw.split('/').pop();
  if (lastSegment) {
    if (codelistMap && codelistMap[lastSegment]) return codelistMap[lastSegment];
    if (DEFAULT_DIGITAL_ORIGIN_MAP[lastSegment]) return DEFAULT_DIGITAL_ORIGIN_MAP[lastSegment];
  }
  return raw;
}

export const isMatchingMunicipality = (
  feature: MunicipalityFeature | null | undefined,
  code: string | null | undefined
): boolean => {
  if (!feature || !code) return false;
  const targetCode = String(code).trim();
  if (!targetCode) return false;

  const p = feature.properties || {};
  const candidates = [
    p.NATCODE,
    p.kuntatunnus !== undefined && p.kuntatunnus !== null ? String(p.kuntatunnus) : '',
    feature.id ? String(feature.id).replace(/^kunta\./, '') : ''
  ]
    .filter(Boolean)
    .map(c => String(c).trim());

  return candidates.some(c => {
    return (
      c === targetCode ||
      c.padStart(3, '0') === targetCode.padStart(3, '0') ||
      (!isNaN(parseInt(c, 10)) && !isNaN(parseInt(targetCode, 10)) && parseInt(c, 10) === parseInt(targetCode, 10))
    );
  });
};

// Helper function to identify if a plan is local detailed plan ('3') or master plan ('2')
export function getPlanCategory(plan: PlanFeature): 'detailed' | 'master' {
  const code = String(
    plan.properties?.plan_type_code_value ||
    plan.properties?.plan_type ||
    ''
  ).trim();
  if (code.startsWith('3')) return 'detailed';
  if (code.startsWith('2')) return 'master';

  const uri = String(plan.properties?.plan_type_uri || '').trim();
  if (uri.includes('/code/3') || uri.endsWith('/3')) return 'detailed';
  if (uri.includes('/code/2') || uri.endsWith('/2')) return 'master';

  const id = String(plan.id || '').toLowerCase();
  if (id.includes('valid_ld_') || id.includes('ld_plan')) return 'detailed';
  if (id.includes('valid_lm_') || id.includes('lm_plan')) return 'master';

  const name = String(plan.properties?.plan_type_name_fin || '').toLowerCase();
  if (name.includes('yleis')) return 'master';
  return 'detailed';
}

export function PlanExplorerView({ onBack, initialPlans, initialMunicipalities }: PlanExplorerViewProps) {
  const strings = getTranslations(CONFIG.language as Language).planBrowser;

  // Track if initial mock dataset was passed for testing
  const initialLoadedRef = useRef<boolean>(Boolean(initialPlans && initialPlans.length > 0));

  // Determine initial selected municipality code
  const [selectedMunicipalityCode, setSelectedMunicipalityCode] = useState<string>(() => {
    if (initialPlans && initialPlans.length > 0) {
      const codes = getPlanMunicipalityCodes(initialPlans[0]);
      if (codes.length > 0) return codes[0];
    }
    return '';
  });

  // State
  const [municipalities, setMunicipalities] = useState<MunicipalityInfo[]>(() => {
    return initialMunicipalities ? normalizeMunicipalityList(initialMunicipalities) : [];
  });
  const [municipalityMap, setMunicipalityMap] = useState<Record<string, string>>(() => {
    return initialMunicipalities ? buildMunicipalityMap(initialMunicipalities) : {};
  });

  // Selected municipality feature (loaded dynamically per selected municipality)
  const [selectedMunicipalityFeature, setSelectedMunicipalityFeature] = useState<MunicipalityFeature | null>(() => {
    if (initialMunicipalities && initialMunicipalities.length > 0 && selectedMunicipalityCode) {
      const match = initialMunicipalities.find((m: any) => isMatchingMunicipality(m, selectedMunicipalityCode));
      if (match && (match as any).geometry) {
        return match as MunicipalityFeature;
      }
    }
    return null;
  });

  // Synchronously derived valid municipality feature for the currently selected municipality code.
  // Prevents stale feature geometry (from a previously selected municipality) from being rendered or zoomed to.
  const currentMunicipalityFeature = useMemo(() => {
    if (!selectedMunicipalityCode) return null;
    if (isMatchingMunicipality(selectedMunicipalityFeature, selectedMunicipalityCode)) {
      return selectedMunicipalityFeature;
    }
    if (initialMunicipalities && initialMunicipalities.length > 0) {
      const match = initialMunicipalities.find((m: any) => isMatchingMunicipality(m, selectedMunicipalityCode));
      if (match && (match as any).geometry) {
        return match as MunicipalityFeature;
      }
    }
    return null;
  }, [selectedMunicipalityCode, selectedMunicipalityFeature, initialMunicipalities]);
  
  const [isLoadingMunicipalities, setIsLoadingMunicipalities] = useState<boolean>(!initialMunicipalities);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(searchQuery);
  const [selectedPlanType, setSelectedPlanType] = useState<string>('ALL');
  const [kaavalajiOptions, setKaavalajiOptions] = useState<KaavalajiCodeOption[]>(DEFAULT_KAAVALAJI_OPTIONS);
  const [digitalOriginMap, setDigitalOriginMap] = useState<Record<string, string>>(DEFAULT_DIGITAL_ORIGIN_MAP);

  // Map BBOX filtering states
  const [useMapBounds, setUseMapBounds] = useState<boolean>(false);
  const [currentMapBounds, setCurrentMapBounds] = useState<[number, number, number, number] | null>(null);
  const [debouncedMapBounds, setDebouncedMapBounds] = useState<[number, number, number, number] | null>(null);

  // Track whether we should use initialPlans (e.g. testing) until user changes filters
  const [useInitialPlans, setUseInitialPlans] = useState<boolean>(Boolean(initialPlans && initialPlans.length > 0));

  // Helper to extract bounds from active Leaflet map
  const updateMapBounds = useCallback(() => {
    if (!mapRef.current || typeof mapRef.current.getBounds !== 'function') return;
    try {
      const b = mapRef.current.getBounds();
      if (b && typeof b.isValid === 'function' && b.isValid()) {
        const west = b.getWest();
        const south = b.getSouth();
        const east = b.getEast();
        const north = b.getNorth();
        setCurrentMapBounds([west, south, east, north]);
      }
    } catch (e) {
      console.warn('Error reading map bounds:', e);
    }
  }, []);

  // Debounce map bounds updates (400ms) only when BBOX filtering is enabled
  useEffect(() => {
    if (!useMapBounds) {
      setDebouncedMapBounds(null);
      return;
    }

    if (!currentMapBounds && mapRef.current) {
      updateMapBounds();
    }

    const timer = setTimeout(() => {
      setDebouncedMapBounds(currentMapBounds);
    }, 400);

    return () => {
      clearTimeout(timer);
    };
  }, [currentMapBounds, useMapBounds, updateMapBounds]);

  // Selected item
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(
    initialPlans && initialPlans.length > 0 ? initialPlans[0].id : null
  );
  const [detailTab, setDetailTab] = useState<'info' | 'documents' | 'json'>('info');

  // Derive WFS query parameters
  const { typeA, typeB } = useMemo(() => getWfsTypesForPlanType(selectedPlanType), [selectedPlanType]);
  const cqlFilter = useMemo(
    () => buildWfsCqlFilter(selectedMunicipalityCode, debouncedSearchQuery, selectedPlanType),
    [selectedMunicipalityCode, debouncedSearchQuery, selectedPlanType]
  );

  const {
    features: plans,
    totalMatched,
    loading: isWfsLoading,
    hasMore,
    error: wfsError,
    loadMore: handleLoadMore
  } = useDualFeatureWfs(ryhtiPlanWfsService, typeA, typeB, cqlFilter, 50, {
    enabled: !useInitialPlans,
    initialFeatures: initialPlans || [],
    bbox: debouncedMapBounds
  });

  const isLoadingPlans = isWfsLoading && plans.length === 0;
  const isLoadingMore = isWfsLoading && plans.length > 0;
  const fetchError = wfsError ? (wfsError.message || strings.fetchError) : null;

  // Load RY_Kaavalaji codelist dynamically
  useEffect(() => {
    let ignore = false;
    fetch(`${CONFIG.basePath.replace(/\/$/, '')}/data/suomi.fi/koodistot/rytj/RY_Kaavalaji.json`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error(`Failed to fetch codelist HTTP ${res.status}`);
      })
      .then(data => {
        if (ignore) return;
        if (data && Array.isArray(data.codes)) {
          const options: KaavalajiCodeOption[] = data.codes
            .filter((item: CodeItem) => item.hierarchyLevel === 2 && (String(item.broaderCode) === '3' || String(item.broaderCode) === '2'))
            .map((item: CodeItem) => ({
              uri: item.uri || `http://uri.suomi.fi/codelist/rytj/RY_Kaavalaji/code/${item.codeValue}`,
              codeValue: String(item.codeValue),
              name: item.name?.fi || item.name?.en || item.name?.sv || `${strings.planType} ${item.codeValue}`,
              broaderCode: item.broaderCode ? String(item.broaderCode) : undefined
            }));
          if (options.length > 0) {
            setKaavalajiOptions(options);
          }
        }
      })
      .catch(err => {
        console.warn('Using default Kaavalaji options:', err);
      });
    return () => { ignore = true; };
  }, []);

  // Load RY_DigitaalinenAlkupera codelist dynamically
  useEffect(() => {
    let ignore = false;
    fetch(`${CONFIG.basePath.replace(/\/$/, '')}/data/suomi.fi/koodistot/rytj/RY_DigitaalinenAlkupera.json`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error(`Failed to fetch RY_DigitaalinenAlkupera HTTP ${res.status}`);
      })
      .then(data => {
        if (ignore) return;
        if (data && Array.isArray(data.codes)) {
          const map: Record<string, string> = { ...DEFAULT_DIGITAL_ORIGIN_MAP };
          data.codes.forEach((item: any) => {
            const fiName = item.names?.fi || item.name?.fi || item.names?.en || item.name?.en || item.names?.sv || item.name?.sv;
            if (fiName) {
              if (item.codeValue) {
                map[String(item.codeValue)] = fiName;
              }
              if (item.uri) {
                map[item.uri] = fiName;
                map[item.uri.replace(/^http:/, 'https:')] = fiName;
              }
            }
          });
          setDigitalOriginMap(map);
        }
      })
      .catch(err => {
        console.warn('Using default RY_DigitaalinenAlkupera options:', err);
      });
    return () => { ignore = true; };
  }, []);

  // Debounce search query for server-side WFS calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Map settings
  const [tileStyle, setTileStyle] = useState<TileStyle>('mml_taustakartta');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMunicipalityBoundaries, setShowMunicipalityBoundaries] = useState(true);
  const [showDetailedPlanLayer, setShowDetailedPlanLayer] = useState(true);
  const [showMasterPlanLayer, setShowMasterPlanLayer] = useState(true);

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any | null>(null);
  const detailedPlanLayerRef = useRef<any | null>(null);
  const masterPlanLayerRef = useRef<any | null>(null);
  const municipalityLayerRef = useRef<any | null>(null);
  const tileLayerRef = useRef<any | null>(null);
  const isInitialMapRenderRef = useRef<boolean>(true);
  const prevMunicipalityCodeRef = useRef<string | null>(null);
  const currentTileStyleRef = useRef<string | null>(null);
  const currentMunicipalityCodeRef = useRef<string | null>(null);
  const currentShowMuniRef = useRef<boolean | null>(null);
  const currentDetailedPlansRef = useRef<PlanFeature[] | null>(null);
  const currentMasterPlansRef = useRef<PlanFeature[] | null>(null);
  const currentShowDetailedRef = useRef<boolean | null>(null);
  const currentShowMasterRef = useRef<boolean | null>(null);
  const selectedPlanIdRef = useRef<string | null>(selectedPlanId);

  const lastZoomedMuniCodeRef = useRef<string | null>(null);

  useEffect(() => {
    selectedPlanIdRef.current = selectedPlanId;
  }, [selectedPlanId]);

  const prevPlanIdForLayerRef = useRef<string | null>(null);

  // Automatically show the corresponding plan layer when a new plan is selected
  useEffect(() => {
    if (selectedPlanId) {
      if (selectedPlanId !== prevPlanIdForLayerRef.current) {
        const targetPlan = plans.find(p => p.id === selectedPlanId);
        if (targetPlan) {
          prevPlanIdForLayerRef.current = selectedPlanId;
          const category = getPlanCategory(targetPlan);
          if (category === 'detailed') {
            setShowDetailedPlanLayer(true);
          } else if (category === 'master') {
            setShowMasterPlanLayer(true);
          }
        }
      }
    } else {
      prevPlanIdForLayerRef.current = null;
    }
  }, [selectedPlanId, plans]);

  const [libs, setLibs] = useState<{ L: any; proj4: any } | null>(() => {
    if (mapLibsReady) return { L: LeafletInstance, proj4: Proj4Instance };
    return null;
  });

  // Load Leaflet and Proj4 libraries
  useEffect(() => {
    if (libs) return;
    let ignore = false;
    getMapLibraries()
      .then(loadedLibs => {
        if (!ignore) setLibs(loadedLibs);
      })
      .catch(err => {
        console.error('Failed to load map libraries:', err);
      });
    return () => { ignore = true; };
  }, [libs]);

  // Load Municipalities index from pre-built static data file
  useEffect(() => {
    if (initialMunicipalities) {
      setIsLoadingMunicipalities(false);
      return;
    }
    let ignore = false;
    setIsLoadingMunicipalities(true);

    getMunicipalityList()
      .then(data => {
        if (ignore) return;
        if (data && Array.isArray(data)) {
          const normalized = normalizeMunicipalityList(data);
          const map = buildMunicipalityMap(normalized);

          setMunicipalities(normalized);
          setMunicipalityMap(map);
        }
      })
      .catch(err => {
        console.warn('Failed to load municipality list:', err);
      })
      .finally(() => {
        if (!ignore) setIsLoadingMunicipalities(false);
      });

    return () => { ignore = true; };
  }, [initialMunicipalities]);

  // Load selected municipality's individual GeoJSON data when selectedMunicipalityCode changes
  useEffect(() => {
    if (!selectedMunicipalityCode) {
      setSelectedMunicipalityFeature(null);
      return;
    }

    // Immediately clear previous municipality if it does not match the new selection
    setSelectedMunicipalityFeature(prev => {
      if (prev && isMatchingMunicipality(prev, selectedMunicipalityCode)) {
        return prev;
      }
      return null;
    });

    // Check if initialMunicipalities passed full feature with geometry
    if (initialMunicipalities && initialMunicipalities.length > 0) {
      const match = initialMunicipalities.find((m: any) => isMatchingMunicipality(m, selectedMunicipalityCode));
      if (match && (match as any).geometry) {
        setSelectedMunicipalityFeature(match as MunicipalityFeature);
        return;
      }
    }

    let ignore = false;
    getMunicipalityByCode(selectedMunicipalityCode)
      .then(feat => {
        if (!ignore && feat && isMatchingMunicipality(feat, selectedMunicipalityCode)) {
          setSelectedMunicipalityFeature(feat);
        }
      })
      .catch(err => {
        console.warn(`Could not load municipality feature for ${selectedMunicipalityCode}:`, err);
      });

    return () => { ignore = true; };
  }, [selectedMunicipalityCode, initialMunicipalities]);

  // Helper to format plan municipality names
  const getPlanMunicipalityNames = (plan: PlanFeature): string => {
    const codes = getPlanMunicipalityCodes(plan);
    if (codes.length === 0) return '-';
    const names = codes.map(code => municipalityMap[code] || municipalityMap[String(parseInt(code, 10))] || `${strings.municipality} ${code}`);
    return Array.from(new Set(names)).join(', ');
  };

  // Sorted list of all municipalities for dropdown
  const municipalityOptions = useMemo(() => {
    return municipalities
      .map(m => {
        const code = String(m.natcode || '').trim();
        const name = m.nameFin || m.nameSwe || code;
        const detailedPlanCount = m.numberOfDetailedPlansInRyhti ?? 0;
        const masterPlanCount = m.numberOfMasterPlansInRyhti ?? 0;
        return { code, name, detailedPlanCount, masterPlanCount, info: m };
      })
      .filter(m => m.code && m.name)
      .sort((a, b) => a.name.localeCompare(b.name, 'fi'));
  }, [municipalities]);

  // Filtered plans list
  const filteredPlans = useMemo(() => {
    return plans.filter(plan => {
      // In initial mock dataset mode or offline testing, apply fallback filter
      if (initialLoadedRef.current && selectedPlanType !== 'ALL') {
        const typeProp = plan.properties?.plan_type;
        const nameProp = plan.properties?.plan_type_name_fin;
        if (typeProp) {
          if (typeProp !== selectedPlanType && !selectedPlanType.endsWith(typeProp)) {
            return false;
          }
        } else if (nameProp) {
          const matchedOpt = kaavalajiOptions.find(o => o.uri === selectedPlanType || o.name === selectedPlanType);
          if (matchedOpt && matchedOpt.name !== nameProp) {
            return false;
          }
        }
      }
      return true;
    });
  }, [plans, selectedPlanType, kaavalajiOptions]);

  // Separate detailed plans (type '3') and master plans (type '2')
  const detailedPlans = useMemo(() => {
    return filteredPlans.filter(p => getPlanCategory(p) === 'detailed');
  }, [filteredPlans]);

  const masterPlans = useMemo(() => {
    return filteredPlans.filter(p => getPlanCategory(p) === 'master');
  }, [filteredPlans]);

  // Currently selected plan object
  const selectedPlan = useMemo(() => {
    return plans.find(p => p.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  // Parse attached documents from selected plan
  const selectedPlanDocuments = useMemo<PlanDocument[]>(() => {
    if (!selectedPlan?.properties?.documents) return [];
    const raw = selectedPlan.properties.documents;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [selectedPlan]);

  // Handle map setup and layers updating
  useEffect(() => {
    if (!mapContainerRef.current || !libs || !libs.L) return;
    const { L } = libs;

    try {
      // 0. Clean up stale/detached map instance if mapContainerRef DOM element changed (e.g. fullscreen portal toggle)
      if (mapRef.current) {
        const container = typeof mapRef.current.getContainer === 'function' ? mapRef.current.getContainer() : null;
        if (!container || container !== mapContainerRef.current || !document.body.contains(container)) {
          try {
            mapRef.current.remove();
          } catch (e) {
            console.warn('Cleaning up stale map container', e);
          }
          mapRef.current = null;
          tileLayerRef.current = null;
          municipalityLayerRef.current = null;
          detailedPlanLayerRef.current = null;
          masterPlanLayerRef.current = null;
          currentTileStyleRef.current = null;
          currentMunicipalityCodeRef.current = null;
          currentShowMuniRef.current = null;
          currentDetailedPlansRef.current = null;
          currentMasterPlansRef.current = null;
          currentShowDetailedRef.current = null;
          currentShowMasterRef.current = null;
          isInitialMapRenderRef.current = true;
        }
      }

      // 1. Initialize Leaflet map if not initialized
      if (!mapRef.current) {
        const map = L.map(mapContainerRef.current, {
          zoomControl: false,
          attributionControl: true,
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false,
          minZoom: 4,
          maxZoom: 18,
        }).setView([62.0, 26.0], 6);

        map.on('moveend', () => {
          updateMapBounds();
        });

        map.on('popupopen', (e: any) => {
          const container = e.popup.getElement();
          if (container) {
            L.DomEvent.disableScrollPropagation(container);
            L.DomEvent.disableClickPropagation(container);
          }
        });

        if (L.control?.zoom) {
          L.control.zoom({ position: 'topright' }).addTo(map);
        }
        mapRef.current = map;
        updateMapBounds();
      }

      const map = mapRef.current;

      // 2. Base tile layer (only update if tile layer is uninitialized or tile style changed)
      if (!tileLayerRef.current || currentTileStyleRef.current !== tileStyle) {
        if (tileLayerRef.current) {
          map.removeLayer(tileLayerRef.current);
        }
        const selectedTile = TILE_LAYERS[tileStyle] || TILE_LAYERS.dark;
        const tileLayer = L.tileLayer(selectedTile.url, {
          attribution: selectedTile.attribution,
          maxZoom: selectedTile.maxZoom || 18,
          tileSize: 256,
          zoomOffset: 0,
          fadeAnimation: false
        }).addTo(map);
        tileLayerRef.current = tileLayer;
        currentTileStyleRef.current = tileStyle;
      }

      selectedPlanIdRef.current = selectedPlanId;

      // 3. Municipality boundaries overlay (Bottom layer directly on top of base map)
      const isMuniFeatureMatching = Boolean(
        currentMunicipalityFeature &&
        selectedMunicipalityCode &&
        isMatchingMunicipality(currentMunicipalityFeature, selectedMunicipalityCode)
      );

      const muniNeedsUpdate =
        currentShowMuniRef.current !== showMunicipalityBoundaries ||
        currentMunicipalityCodeRef.current !== selectedMunicipalityCode ||
        (showMunicipalityBoundaries && isMuniFeatureMatching && !municipalityLayerRef.current);

      if (muniNeedsUpdate) {
        if (municipalityLayerRef.current) {
          map.removeLayer(municipalityLayerRef.current);
          municipalityLayerRef.current = null;
        }

        if (showMunicipalityBoundaries && isMuniFeatureMatching && currentMunicipalityFeature) {
          const muniLayer = L.geoJSON(currentMunicipalityFeature, {
            interactive: false,
            style: {
              color: '#38BDF8', // Cyan border
              weight: 2.5,
              opacity: 0.85,
              fillColor: '#38BDF8',
              fillOpacity: 0.05,
              dashArray: '4, 4',
              interactive: false
            }
          }).addTo(map);

          if (typeof muniLayer.bringToBack === 'function') {
            muniLayer.bringToBack();
          }

          municipalityLayerRef.current = muniLayer;
        }
        currentShowMuniRef.current = showMunicipalityBoundaries;
        currentMunicipalityCodeRef.current = selectedMunicipalityCode;
      }

      // 4. Styles for Detailed vs Master Plans
      const getDetailedPlanStyle = (feature: PlanFeature) => {
        const isSelected = feature.id === selectedPlanId;
        return {
          color: isSelected ? '#FFAF00' : '#F97316', // Orange for detailed plans, Gold for selected
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 1 : 0.8,
          fillColor: '#F97316',
          fillOpacity: isSelected ? 0.40 : 0.18
        };
      };

      const getMasterPlanStyle = (feature: PlanFeature) => {
        const isSelected = feature.id === selectedPlanId;
        return {
          color: isSelected ? '#FFAF00' : '#A855F7', // Purple/Violet for master plans, Gold for selected
          weight: isSelected ? 3 : 2,
          opacity: isSelected ? 0.6 : 0.5,
          fillColor: '#A855F7',
          fillOpacity: isSelected ? 0.40 : 0.15
        };
      };

      // 5. Master Plan Layer (Middle layer above municipality area)
      const shouldShowMaster = showMasterPlanLayer && masterPlans.length > 0;
      let masterGeoJsonLayer: any = masterPlanLayerRef.current;

      if (
        masterPlanLayerRef.current &&
        typeof masterPlanLayerRef.current.setStyle === 'function' &&
        currentMasterPlansRef.current === masterPlans &&
        currentShowMasterRef.current === showMasterPlanLayer
      ) {
        masterPlanLayerRef.current.setStyle(getMasterPlanStyle);
      } else {
        if (masterPlanLayerRef.current) {
          map.removeLayer(masterPlanLayerRef.current);
          masterPlanLayerRef.current = null;
        }

        if (shouldShowMaster) {
          masterGeoJsonLayer = L.geoJSON(masterPlans, {
            style: getMasterPlanStyle,
            onEachFeature: (feature: PlanFeature, layer: any) => {
              layer.on({
                click: (e: any) => {
                  if (e && e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
                    e.originalEvent.stopPropagation();
                  }
                  setSelectedPlanId(feature.id);
                },
                mouseover: (e: any) => {
                  if (feature.id !== selectedPlanIdRef.current) {
                    e.target.setStyle({ weight: 3, fillOpacity: 0.28 });
                  }
                },
                mouseout: (e: any) => {
                  if (feature.id !== selectedPlanIdRef.current) {
                    e.target.setStyle({ weight: 2, fillOpacity: 0.18 });
                  }
                }
              });
            }
          }).addTo(map);

          masterPlanLayerRef.current = masterGeoJsonLayer;
        }
        currentMasterPlansRef.current = masterPlans;
        currentShowMasterRef.current = showMasterPlanLayer;
      }

      // 6. Detailed Plan Layer (Top layer above master plans)
      const shouldShowDetailed = showDetailedPlanLayer && detailedPlans.length > 0;
      let detailedGeoJsonLayer: any = detailedPlanLayerRef.current;

      if (
        detailedPlanLayerRef.current &&
        typeof detailedPlanLayerRef.current.setStyle === 'function' &&
        currentDetailedPlansRef.current === detailedPlans &&
        currentShowDetailedRef.current === showDetailedPlanLayer
      ) {
        detailedPlanLayerRef.current.setStyle(getDetailedPlanStyle);
        if (typeof detailedPlanLayerRef.current.bringToFront === 'function') {
          detailedPlanLayerRef.current.bringToFront();
        }
      } else {
        if (detailedPlanLayerRef.current) {
          map.removeLayer(detailedPlanLayerRef.current);
          detailedPlanLayerRef.current = null;
        }

        if (shouldShowDetailed) {
          detailedGeoJsonLayer = L.geoJSON(detailedPlans, {
            style: getDetailedPlanStyle,
            onEachFeature: (feature: PlanFeature, layer: any) => {
              layer.on({
                click: (e: any) => {
                  if (e && e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') {
                    e.originalEvent.stopPropagation();
                  }
                  setSelectedPlanId(feature.id);
                },
                mouseover: (e: any) => {
                  if (feature.id !== selectedPlanIdRef.current) {
                    e.target.setStyle({ weight: 3, fillOpacity: 0.28 });
                  }
                },
                mouseout: (e: any) => {
                  if (feature.id !== selectedPlanIdRef.current) {
                    e.target.setStyle({ weight: 2, fillOpacity: 0.18 });
                  }
                }
              });
            }
          }).addTo(map);

          if (typeof detailedGeoJsonLayer.bringToFront === 'function') {
            detailedGeoJsonLayer.bringToFront();
          }

          detailedPlanLayerRef.current = detailedGeoJsonLayer;
        }
        currentDetailedPlansRef.current = detailedPlans;
        currentShowDetailedRef.current = showDetailedPlanLayer;
      }

      // Ensure explicit layer order: Municipality (bottom) -> Master plans -> Detailed plans (top)
      if (municipalityLayerRef.current && typeof municipalityLayerRef.current.bringToBack === 'function') {
        municipalityLayerRef.current.bringToBack();
      }
      if (detailedPlanLayerRef.current && typeof detailedPlanLayerRef.current.bringToFront === 'function') {
        detailedPlanLayerRef.current.bringToFront();
      }

      // Priority 1: Initial map load zoom
      if (isInitialMapRenderRef.current) {
        if (selectedPlan && selectedPlan.geometry) {
          try {
            const selLayer = L.geoJSON(selectedPlan);
            const b = selLayer.getBounds();
            if (b.isValid()) {
              if (b.getNorthEast().equals(b.getSouthWest())) {
                map.setView(b.getNorthEast(), 14);
              } else {
                map.fitBounds(b, { padding: [50, 50], maxZoom: 16 });
              }
            }
          } catch (e) {
            console.warn('Error computing selected plan bounds', e);
          }
        } else if (currentMunicipalityFeature && currentMunicipalityFeature.geometry) {
          try {
            const muniLayer = L.geoJSON(currentMunicipalityFeature);
            const b = muniLayer.getBounds();
            if (b.isValid()) {
              map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
              lastZoomedMuniCodeRef.current = selectedMunicipalityCode;
            }
          } catch (e) {
            console.warn('Error computing municipality bounds', e);
          }
        } else if (detailedGeoJsonLayer || masterGeoJsonLayer) {
          try {
            const boundsLayers = [detailedGeoJsonLayer, masterGeoJsonLayer].filter(Boolean);
            if (boundsLayers.length > 0 && typeof L.featureGroup === 'function') {
              const group = L.featureGroup(boundsLayers);
              if (group && typeof group.getBounds === 'function') {
                const b = group.getBounds();
                if (b && typeof b.isValid === 'function' && b.isValid()) {
                  map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
                }
              }
            }
          } catch (e) {
            console.warn('Error computing plan layer bounds', e);
          }
        }
        isInitialMapRenderRef.current = false;

        prevMunicipalityCodeRef.current = selectedMunicipalityCode;
      } 
      // Priority 2: Municipality selection changed -> Zoom to municipality bbox when matching feature is ready
      else if (selectedMunicipalityCode && lastZoomedMuniCodeRef.current !== selectedMunicipalityCode) {
        if (isMuniFeatureMatching && currentMunicipalityFeature && currentMunicipalityFeature.geometry) {
          try {
            const muniLayer = L.geoJSON(currentMunicipalityFeature);
            const b = muniLayer.getBounds();
            if (b.isValid()) {
              map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
              lastZoomedMuniCodeRef.current = selectedMunicipalityCode;
            }
          } catch (e) {
            console.warn('Error computing municipality bounds', e);
          }
        }
        prevMunicipalityCodeRef.current = selectedMunicipalityCode;

      } else if (!selectedMunicipalityCode && lastZoomedMuniCodeRef.current) {
        const boundsLayers = [detailedGeoJsonLayer || detailedPlanLayerRef.current, masterGeoJsonLayer || masterPlanLayerRef.current].filter(Boolean);
        if (boundsLayers.length > 0 && typeof L.featureGroup === 'function') {
          try {
            const group = L.featureGroup(boundsLayers);
            if (group && typeof group.getBounds === 'function') {
              const b = group.getBounds();
              if (b && typeof b.isValid === 'function' && b.isValid()) {
                map.fitBounds(b, { padding: [40, 40], maxZoom: 14 });
              }
            }
          } catch (e) {
            console.warn('Error zooming on clear filter', e);
          }
        }
        lastZoomedMuniCodeRef.current = '';
        prevMunicipalityCodeRef.current = '';
      }

      setTimeout(() => {
        if (mapRef.current && typeof mapRef.current.invalidateSize === 'function') {
          mapRef.current.invalidateSize();
        }
      }, 100);

    } catch (err) {
      console.error('Error rendering Leaflet plan map:', err);
    }
  }, [
    filteredPlans,
    detailedPlans,
    masterPlans,
    selectedPlanId,
    selectedMunicipalityCode,
    tileStyle,
    showMunicipalityBoundaries,
    showDetailedPlanLayer,
    showMasterPlanLayer,
    isFullscreen,
    libs,
    currentMunicipalityFeature,
    selectedPlan
  ]);

  // Teardown Leaflet map on component unmount
  useEffect(() => {
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        detailedPlanLayerRef.current = null;
        masterPlanLayerRef.current = null;
        municipalityLayerRef.current = null;
        tileLayerRef.current = null;
      }
    };
  }, []);

  // Zoom to specified plan boundary
  const zoomToPlan = (planTarget?: PlanFeature | null) => {
    const target = planTarget || selectedPlan;
    if (!mapRef.current || !target || !libs) return;
    const { L } = libs;
    try {
      const tempLayer = L.geoJSON(target);
      const bounds = tempLayer.getBounds();
      if (bounds.isValid()) {
        if (bounds.getNorthEast().equals(bounds.getSouthWest())) {
          mapRef.current.setView(bounds.getNorthEast(), 14);
        } else {
          mapRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
        }
      }
    } catch (e) {
      console.warn('Could not zoom to plan bounds:', e);
    }
  };

  // Zoom to active selected plan boundary
  const handleZoomToPlan = () => {
    zoomToPlan(selectedPlan);
  };

  // Select plan from result list (updates selection AND zooms/centers map)
  const handleSelectPlanFromList = (plan: PlanFeature) => {
    setSelectedPlanId(plan.id);
  };

  // Zoom to active selected municipality boundary
  const handleZoomToMunicipality = () => {
    if (!mapRef.current || !currentMunicipalityFeature || !libs) return;
    const { L } = libs;
    try {
      const muniLayer = L.geoJSON(currentMunicipalityFeature);
      const bounds = muniLayer.getBounds();
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    } catch (e) {
      console.warn('Could not zoom to municipality bounds:', e);
    }
  };

  // Automatically recalculate map size on container resize
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapRef.current && typeof mapRef.current.invalidateSize === 'function') {
        mapRef.current.invalidateSize();
      }
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [libs]);

  const ctaProps:string = JSON.stringify({
    "url": "mailto:myynti@spatineo.com?subject=Asiantuntija-apua kaavatiedon hallintaan",
    "buttonText": "Kysy lisää",
    "title":"Tarvitseeko organisaatiosi kaavatietoa? Spatineo toteutti tämän palvelun - osaamme auttaa sinuakin.",
    "partner": "spatineo",
    "mode": "thin"
  });

  const mainView = (
    <div
      className={`bg-[#0A0A0C] text-slate-200 font-sans flex flex-col ${
        isFullscreen
          ? 'fixed inset-0 z-[99999] w-screen h-screen overflow-hidden'
          : 'w-full h-full rounded-2xl border border-white/10 shadow-2xl overflow-hidden lg:h-[calc(100vh-80px)] lg:min-h-[620px] lg:max-h-[calc(100vh-350px)]'
      }`}
    >
      {/* Top Bar Header */}
      <div className="bg-[#09090B] border-b border-white/10 px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center"
              title={strings.back}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFAF00]/10 border border-[#FFAF00]/30 flex items-center justify-center text-[#FFAF00] shrink-0">
              <MapIcon className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {strings.title}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {strings.subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* API Info & Fullscreen */}
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title={isFullscreen ? strings.exitFullscreen : strings.enterFullscreen}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Left Panel & Right Map/Details */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden">
        
        {/* Left Column: Filterable List Panel (max width to fit contents) */}
        <div className="w-full lg:w-[340px] lg:max-w-[380px] lg:shrink-0 bg-[#0D0D11] border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col overflow-hidden">
          
          {/* Filters Header */}
          <div className="p-4 border-b border-white/10 bg-[#09090B] flex flex-col gap-3 shrink-0">
            
            {/* 1. Free-text Search Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-amber-400" />
                  <span>{strings.searchPlanPlaceholderLabel}</span>
                </span>
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setUseInitialPlans(false);
                  }}
                  placeholder={strings.searchPlanPlaceholder}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#FFAF00] transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setUseInitialPlans(false);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Municipality Dropdown (Optional) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>{strings.municipality}</span>
                </span>
              </label>
              <select
                value={selectedMunicipalityCode}
                onChange={e => {
                  setSelectedMunicipalityCode(e.target.value);
                  setUseInitialPlans(false);
                }}
                className="bg-white/5 border border-white/10 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FFAF00] transition-colors custom-scrollbar font-medium"
              >
                <option value="" className="bg-[#0D0D11] text-slate-300">
                  {strings.allMunicipalities}
                </option>
                {municipalityOptions.map(m => (
                  <option key={m.code} value={m.code} className="bg-[#0D0D11] text-slate-200">
                    {m.name} ({m.detailedPlanCount + m.masterPlanCount})
                  </option>
                ))}
              </select>
            </div>

            {/* 3. Plan Type Dropdown & Clear Filters */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>{strings.planType}</span>
                </label>
                {(searchQuery || selectedMunicipalityCode || selectedPlanType !== 'ALL' || useMapBounds) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedMunicipalityCode('');
                      setSelectedPlanType('ALL');
                      setUseMapBounds(false);
                      setUseInitialPlans(false);
                    }}
                    className="text-[10px] text-amber-400 hover:text-amber-300 font-semibold underline"
                  >
                    {strings.clearFilters}
                  </button>
                )}
              </div>
              <select
                value={selectedPlanType}
                onChange={e => {
                  setSelectedPlanType(e.target.value);
                  setUseInitialPlans(false);
                }}
                className="bg-white/5 border border-white/10 text-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#FFAF00] transition-colors custom-scrollbar font-medium"
              >
                <option value="ALL" className="bg-[#0D0D11] text-slate-300">
                  {strings.allPlanTypes}
                </option>
                {kaavalajiOptions.map(opt => (
                  <option key={opt.uri} value={opt.codeValue || opt.uri} className="bg-[#0D0D11] text-slate-200">
                    {opt.name}
                  </option>
                ))}
              </select>

              {/* 4. Map Bounds BBOX Filter Checkbox */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-300 hover:text-white transition-colors select-none">
                  <input
                    type="checkbox"
                    checked={useMapBounds}
                    onChange={e => {
                      setUseMapBounds(e.target.checked);
                      setUseInitialPlans(false);
                    }}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#FFAF00] focus:ring-[#FFAF00] focus:ring-offset-0 focus:ring-1 cursor-pointer accent-[#FFAF00]"
                  />
                  <span>{strings.filterByMapBounds || 'Vain kartan alue'}</span>
                </label>
              </div>
            </div>

          </div>

          {/* Result List Header: Number Matched Count & "Hae lisää" Button Row */}
          <div className="px-4 py-2.5 bg-[#09090B] border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
            <div className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <span>
                {strings.showingPlansCount
                  .replace('{loaded}', String(plans.length))
                  .replace('{total}', String(totalMatched))}
              </span>
              {isLoadingPlans && <span className="text-amber-400 text-[10px] animate-pulse">{strings.loadingMorePlans}</span>}
            </div>

            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="py-1 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-500/50 text-amber-300 hover:text-amber-200 text-xs font-bold flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    <span>{strings.loadingMorePlans}</span>
                  </>
                ) : (
                    <span>{strings.loadMorePlans}</span>
                )}
              </button>
            )}
          </div>

          {/* List Scroll Container */}
          <div className="p-3 flex flex-col gap-2 overflow-y-auto max-h-[350px] lg:max-h-none lg:flex-1 lg:min-h-0 custom-scrollbar">
            {fetchError ? (
              <div className="p-4 bg-red-950/30 border border-red-500/20 rounded-xl text-center my-4">
                <AlertCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
                <div className="text-xs text-red-300 font-semibold">{fetchError}</div>
              </div>
            ) : isLoadingPlans ? (
              <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 gap-2 my-auto">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-medium">{strings.loadingPlans}</span>
              </div>
            ) : filteredPlans.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 my-auto">
                <Filter className="w-8 h-8 text-slate-600 mb-1" />
                <h3 className="text-sm font-bold text-slate-300">{strings.noPlansFound}</h3>
                <p className="text-xs text-slate-500 max-w-xs">{strings.noPlansFoundDesc}</p>
              </div>
            ) : (
              <>
                {filteredPlans.map((plan, index) => {
                  const isSelected = plan.id === selectedPlanId;
                  const name = plan.properties?.name_fin || plan.properties?.name_swe || plan.properties?.permanent_plan_identifier || strings.defaultPlanName;
                  const muniNames = getPlanMunicipalityNames(plan);
                  const permId = plan.properties?.permanent_plan_identifier;
                  const prodId = plan.properties?.producer_plan_identifier;
                  const planType = plan.properties?.plan_type_name_fin || strings.defaultPlanType;
                  const formattedApprovalDate = formatPlanDate(plan.properties?.approval_date, '');

                  return (
                    <button
                      key={`${plan.id}-${index}`}
                      onClick={() => handleSelectPlanFromList(plan)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex flex-col gap-2 group relative overflow-hidden shrink-0 ${
                        isSelected
                          ? 'bg-[#FFAF00]/10 border-[#FFAF00]/50 shadow-lg shadow-black/50'
                          : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                      }`}
                    >
                      {/* Selected Left Stripe Accent */}
                      {isSelected && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFAF00]" />
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors line-clamp-2 break-words">
                          {name}
                        </div>
                        <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#FFAF00] translate-x-0.5' : 'text-slate-600'}`} />
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1 text-slate-300 font-medium">
                          <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                          <span>{muniNames}</span>
                        </span>
                        {formattedApprovalDate && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Calendar className="w-3 h-3 shrink-0" />
                            <span>{formattedApprovalDate}</span>
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-white/5 text-[10px]">
                        <span className="font-mono text-slate-400 truncate max-w-[180px]">{permId || prodId || plan.id}</span>
                        {(() => {
                          const isMaster = getPlanCategory(plan) === 'master';
                          return (
                            <span
                              className={`px-2 py-0.5 rounded-md font-semibold uppercase tracking-wider shrink-0 border ${
                                isMaster
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/20'
                                  : 'bg-orange-500/10 text-orange-300 border-orange-500/20'
                              }`}
                            >
                              {planType}
                            </span>
                          );
                        })()}
                      </div>
                    </button>
                  );
                })}

                {plans.length > 0 && plans.length >= totalMatched && !isLoadingPlans && (
                  <div className="text-center py-3 text-[10px] text-slate-500 uppercase tracking-wider font-semibold shrink-0">
                    {strings.allPlansLoaded} ({plans.length} {strings.countUnit})
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Center/Right Map & Detail Panels */}
        <div className="w-full lg:flex-1 lg:min-w-0 flex flex-col bg-[#0A0A0C] relative lg:h-full lg:overflow-hidden">
          
          {/* Top Half: Interactive Leaflet Map (grows to fill available space on desktop, 360px min height on mobile) */}
          <div className="w-full h-[360px] min-h-[360px] lg:h-auto lg:min-h-[250px] lg:flex-1 relative border-b border-white/10 flex flex-col bg-[#191a1a] shrink-0 lg:shrink">
            
            {/* Map Canvas */}
            <div
              ref={mapContainerRef}
              className="absolute inset-0 w-full h-full z-0 focus:outline-none"
              style={{ backgroundColor: (TILE_LAYERS[tileStyle]?.isLight ?? false) ? '#e8e6e3' : '#191a1a' }}
            />

            {/* Floating Map Overlay Controls */}
            <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 max-w-[calc(100%-24px)]">
              <div className="flex items-center bg-black/80 backdrop-blur-md rounded-xl px-2.5 py-1.5 border border-white/10 shadow-xl gap-2 text-xs">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider hidden sm:inline-flex items-center gap-1 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-amber-400" />
                  <span>Taustakartta:</span>
                </span>
                <select
                  value={tileStyle}
                  onChange={(e) => setTileStyle(e.target.value as TileStyle)}
                  className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer py-0.5 pr-1 border-0"
                >
                  <optgroup label="CARTO">
                    <option value="dark" className="bg-[#09090B] text-slate-200">Carto Tumma</option>
                    <option value="light" className="bg-[#09090B] text-slate-200">Carto Vaalea</option>
                  </optgroup>
                  <optgroup label="Maanmittauslaitos (WMTS)">
                    <option value="mml_taustakartta" className="bg-[#09090B] text-slate-200" >MML Taustakartta</option>
                    <option value="mml_maastokartta" className="bg-[#09090B] text-slate-200">MML Maastokartta</option>
                    <option value="mml_selkokartta" className="bg-[#09090B] text-slate-200">MML Selkokartta</option>
                    <option value="mml_ortokuva" className="bg-[#09090B] text-slate-200">MML Ortokuva (ilmakuva)</option>
                  </optgroup>
                </select>
              </div>

              {currentMunicipalityFeature && (
                <button
                  onClick={() => setShowMunicipalityBoundaries(!showMunicipalityBoundaries)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xl transition-colors ${
                    showMunicipalityBoundaries
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-black/80 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Layers className={`w-3.5 h-3.5`} />
                  <span className={`${(TILE_LAYERS[tileStyle]?.isLight) && showMunicipalityBoundaries ? 'text-black' : ''}`}>{strings.municipalityBoundary}</span>
                </button>
              )}

              {detailedPlans.length > 0 && (
                <button
                  onClick={() => setShowDetailedPlanLayer(!showDetailedPlanLayer)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xl transition-colors ${
                    showDetailedPlanLayer
                      ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                      : 'bg-black/80 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${showDetailedPlanLayer ? 'bg-orange-400' : 'bg-slate-500'}`} />
                  <span className={`${(TILE_LAYERS[tileStyle]?.isLight) && showDetailedPlanLayer ? 'text-black' : ''}`}>{strings.detailedPlanLayer} ({detailedPlans.length})</span>
                </button>
              )}

              {masterPlans.length > 0 && (
                <button
                  onClick={() => setShowMasterPlanLayer(!showMasterPlanLayer)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 backdrop-blur-md border shadow-xl transition-colors ${
                    showMasterPlanLayer
                      ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                      : 'bg-black/80 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${showMasterPlanLayer ? 'bg-purple-400' : 'bg-slate-500'}`} />
                  <span className={`${(TILE_LAYERS[tileStyle]?.isLight) && showMasterPlanLayer ? 'text-black' : ''}`}>{strings.masterPlanLayer} ({masterPlans.length})</span>
                </button>
              )}
            </div>

            {/* Map Zoom Actions */}
            <div className="absolute bottom-5 right-3 z-10 flex items-center gap-2">
              {currentMunicipalityFeature && (
                <button
                  onClick={handleZoomToMunicipality}
                  className="bg-black/80 backdrop-blur-md border border-sky-500/40 text-sky-300 hover:text-white hover:bg-sky-500/20 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-1.5 transition-colors"
                  title={strings.zoomToMunicipality}
                >
                  <Building2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>{currentMunicipalityFeature.properties?.NAMEFIN || strings.municipality}</span>
                </button>
              )}

              {selectedPlan && (
                <button
                  onClick={handleZoomToPlan}
                  className="bg-amber-500 text-black hover:bg-amber-400 px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-1.5 transition-transform hover:scale-105"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>{strings.zoomToPlan}</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Half: Plan Details Panel (fixed size container to prevent map layout shifts) */}
          <div className="w-full h-[250px] shrink-0 bg-[#09090B] flex flex-col border-t border-white/10 overflow-hidden">
            {selectedPlan ? (
              <div className="flex flex-col h-full min-h-0 overflow-hidden">
                {/* Details Header & Tabs */}
                <div className="px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0D0D11] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                        {selectedPlan.properties?.plan_type_name_fin || strings.defaultPlanName}
                      </span>
                      {selectedPlan.properties?.digital_origin && getDigitalOriginName(selectedPlan.properties.digital_origin, digitalOriginMap) && (
                        <span className="text-xs text-slate-300">
                          {getDigitalOriginName(selectedPlan.properties.digital_origin, digitalOriginMap)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-bold text-white mt-1 line-clamp-1">
                      {selectedPlan.properties?.name_fin || selectedPlan.properties?.name_swe || strings.defaultPlanName}
                    </h2>
                  </div>

                  {/* Detail Subtabs */}
                  <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 shrink-0">
                    <button
                      onClick={() => setDetailTab('info')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        detailTab === 'info' ? 'bg-[#FFAF00] text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Info className="w-3.5 h-3.5" />
                      <span>{strings.basicInfo}</span>
                    </button>
                    <button
                      onClick={() => setDetailTab('documents')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        detailTab === 'documents' ? 'bg-[#FFAF00] text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>{strings.documents} ({selectedPlanDocuments.length})</span>
                    </button>
                    <button
                      onClick={() => setDetailTab('json')}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        detailTab === 'json' ? 'bg-[#FFAF00] text-black' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Code className="w-3.5 h-3.5" />
                      <span>GeoJSON</span>
                    </button>
                  </div>
                </div>

                {/* Tab Content Body (constrained height container with subtab scrolling) */}
                <div className="flex-1 min-h-0 relative overflow-hidden">
                  {detailTab === 'info' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-5">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Basic Fields Table */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
                            {strings.basicInfo}
                          </h4>
                          
                          <div className="flex flex-col gap-2.5 text-xs">
                            <div className="flex justify-between border-b border-white/5 pb-1.5">
                              <span className="text-slate-400">{strings.municipality}:</span>
                              <span className="font-semibold text-white">{getPlanMunicipalityNames(selectedPlan)}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1.5">
                              <span className="text-slate-400">{strings.permanentId}:</span>
                              <span className="font-mono text-amber-300">{selectedPlan.properties?.permanent_plan_identifier || '-'}</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1.5">
                              <span className="text-slate-400">{strings.producerId}:</span>
                              <span className="font-mono text-slate-200">{selectedPlan.properties?.producer_plan_identifier || '-'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Dates & Timeline */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
                            {strings.timeline}
                          </h4>

                          <div className="flex flex-col gap-2.5 text-xs">
                            <div className="flex justify-between border-b border-white/5 pb-1.5">
                              <span className="text-slate-400">{strings.initiationDate}:</span>
                              <span className="font-semibold text-slate-300">
                                {formatPlanDate(selectedPlan.properties?.time_of_initiation)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1.5">
                              <span className="text-slate-400">{strings.approvalDate}:</span>
                              <span className="font-semibold text-white">
                                {formatPlanDate(selectedPlan.properties?.approval_date)}
                              </span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-1.5">
                              <span className="text-slate-400">{strings.validityDate}:</span>
                              <span className="font-semibold text-white">
                               {(() => {
                                  const begin = formatPlanDate(selectedPlan.properties?.date_of_validity || selectedPlan.properties?.period_of_validity_begin, '');
                                  const end = formatPlanDate(selectedPlan.properties?.period_of_validity_end, '');
                                  if (begin && end) return `${begin} – ${end}`;
                                  if (begin) return begin;
                                  if (end) return `– ${end}`;
                                  return '-';
                                })()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Description Panel */}
                        {selectedPlan.properties?.description_fin && (
                          <div className="md:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 border-b border-white/10 pb-2">
                              {strings.description}
                            </h4>
                            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                              {selectedPlan.properties.description_fin}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {detailTab === 'documents' && (
                    <div className="h-full w-full overflow-y-auto custom-scrollbar p-4 sm:p-5 flex flex-col gap-3">
                      {selectedPlanDocuments.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 border border-white/10 rounded-2xl bg-white/5 h-full">
                          <FileText className="w-8 h-8 text-slate-600 mb-1" />
                          <h4 className="text-sm font-bold text-slate-300">{strings.noDocuments}</h4>
                          <p className="text-xs text-slate-500 max-w-sm">
                            {strings.noDocumentsDesc}
                          </p>
                        </div>
                      ) : (
                        selectedPlanDocuments.map((doc, idx) => (
                          <div
                            key={idx}
                            className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-amber-500/40 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div>
                                <h5 className="text-xs font-bold text-white">
                                  {doc.name_fin || doc.name_swe || `${strings.defaultPlanType}-${strings.documents} ${idx + 1}`}
                                </h5>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                                  {doc.file_content_type || 'application/pdf'}
                                </div>
                              </div>
                            </div>

                            {doc.uri && (
                              <a
                                href={doc.uri}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-colors shrink-0"
                              >
                                <span>{strings.viewDocument}</span>
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {detailTab === 'json' && (
                    <div className="h-full w-full p-4 sm:p-5 flex flex-col gap-3 overflow-hidden">
                      <div className="flex items-center justify-between shrink-0">
                        <span className="text-xs text-slate-400 font-mono">OGC Feature ID: {selectedPlan.id}</span>
                        <a
                          href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(selectedPlan, null, 2))}`}
                          download={`${selectedPlan.properties?.permanent_plan_identifier || 'plan'}.geojson`}
                          className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-amber-400" />
                          <span>{strings.downloadGeoJson}</span>
                        </a>
                      </div>

                      <div className="flex-1 min-h-0 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar bg-black">
                        <LazySyntaxHighlighter
                          language="json"
                          PreTag="div"
                          customStyle={{
                            margin: 0,
                            padding: '1.25rem',
                            fontSize: '12px',
                            fontFamily: '"JetBrains Mono", monospace',
                            background: '#000000',
                          }}
                        >
                          {JSON.stringify(selectedPlan, null, 2)}
                        </LazySyntaxHighlighter>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="h-full flex-1 p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2 my-auto">
                <MapIcon className="w-10 h-10 text-slate-600 mb-1" />
                <h3 className="text-base font-bold text-slate-300">{strings.selectPlanPrompt}</h3>
                <p className="text-xs text-slate-500 max-w-sm">{strings.selectPlanPromptDesc}</p>
              </div>
            )}
          </div>
        </div>

      </div>
      
    </div>
  );

  if (isFullscreen && typeof window !== 'undefined' && document.body) {
    return createPortal(mainView, document.body);
  }

  return (
    <div className="w-full px-2 sm:px-4 md:px-6 py-4 md:py-6">
      {mainView}
      <CallToActionBlock code={ctaProps} />
    </div>
  );
}
