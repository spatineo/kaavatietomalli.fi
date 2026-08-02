import { useState, useEffect, useMemo } from 'react';
import { 
  ArrowLeft, 
  Globe, 
  ChevronDown, 
  ExternalLink, 
  Database,
  Info,
  BookOpen
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';
import { transpileDataModelSnippetToMermaid } from '../lib/data-model-diagram-generator';

// Sub-components
import { ClassCodelistSelector } from './ClassCodelistSelector';
import { ClassInfoPanel } from './ClassInfoPanel';
import { CodelistInfoPanel } from './CodelistInfoPanel';
import { DataModelAccess } from '../lib/data-model-types';

interface DataModelViewProps {
  modelName: string; // e.g. "rytj-kaava"
  onBack: () => void;
  navigate: (view: { type: string; slug: string | null; queryParams?: Record<string, string | null> }) => void;
  searchString: string;
  dataModelAccess: DataModelAccess;
}

export function DataModelView({ modelName, onBack, navigate, searchString, dataModelAccess }: DataModelViewProps) {
  const t = getTranslations(CONFIG.language as Language);
  
  // 1. Languages from CONFIG
  const languages = useMemo(() => CONFIG.dataLanguages || [
    { code: 'fi', name: 'Suomi' },
    { code: 'sv', name: 'Svenska' },
    { code: 'en', name: 'English' }
  ], []);

  const [dataLang, setDataLang] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    const langParam = params.get('lang');
    if (langParam && languages.some(l => l.code === langParam)) {
      return langParam;
    }
    return CONFIG.defaultDataLanguage || 'fi';
  });

  // Localized string helper
  const getLocalized = (obj: any) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    return obj[dataLang] || obj['fi'] || obj['en'] || obj['sv'] || Object.values(obj)[0] || '';
  };

  // State
  const [modelIndex, setModelIndex] = useState<any[]>([]);
  const [allCodelists, setAllCodelists] = useState<any[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<string>('');
  const [modelData, setModelData] = useState<any>(null);
  const [selectedElement, setSelectedElement] = useState<{ type: 'class' | 'codelist'; name: string } | null>(null);
  const [codelistDetail, setCodelistDetail] = useState<any>(null);
  const [copiedCodeUri, setCopiedCodeUri] = useState<string | null>(null);
  const [mermaidChart, setMermaidChart] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingCodelist, setLoadingCodelist] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isModelInfoOpen, setIsModelInfoOpen] = useState<boolean>(false);

  // 2. Load model index and codelist index on mount
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch(`${CONFIG.basePath}data/suomi.fi/tietomallit/index.json`).then(r => r.json()),
      fetch(`${CONFIG.basePath}data/suomi.fi/koodistot/index.json`).then(r => r.json())
    ])
      .then(([models, codelists]) => {
        if (!isMounted) return;
        setModelIndex(models);
        setAllCodelists(codelists);

        // Find available versions for this modelName
        const versions = models.filter((m: any) => m.path.startsWith(`${modelName}-`));
        if (versions.length === 0) {
          throw new Error(`Data model "${modelName}" not found.`);
        }

        // Determine version from URL or default to the first one
        const params = new URLSearchParams(window.location.search);
        const versionParam = params.get('version');
        const matchedVersion = versions.find((v: any) => v.version === versionParam);
        
        const initialVersion = matchedVersion ? matchedVersion.version : versions[0].version;
        setSelectedVersion(initialVersion);
      })
      .catch(err => {
        if (isMounted) {
          console.error('[DataModelView] Initialization failed:', err);
          setError(err.message || 'Failed to load model index');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [modelName]);

  // Filter versions of current model
  const availableVersions = useMemo(() => {
    return modelIndex.filter((m: any) => m.path.startsWith(`${modelName}-`));
  }, [modelIndex, modelName]);

  // Keep dataLang in sync with searchString
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const langParam = params.get('lang');
    if (langParam && languages.some(l => l.code === langParam) && langParam !== dataLang) {
      setDataLang(langParam);
    }
  }, [searchString, languages, dataLang]);

  // Keep selectedVersion in sync with searchString
  useEffect(() => {
    if (availableVersions.length === 0) return;
    const params = new URLSearchParams(searchString);
    const versionParam = params.get('version');
    const matchedVersion = availableVersions.find((v: any) => v.version === versionParam);
    const targetVersion = matchedVersion ? matchedVersion.version : availableVersions[0].version;
    if (targetVersion && targetVersion !== selectedVersion) {
      setSelectedVersion(targetVersion);
    }
  }, [searchString, availableVersions, selectedVersion]);

  // Keep selectedElement in sync with searchString and modelData
  useEffect(() => {
    if (!modelData) return;

    const params = new URLSearchParams(searchString);
    const classParam = params.get('class');
    const codelistParam = params.get('codelist');

    let targetElement: { type: 'class' | 'codelist'; name: string } | null = null;

    if (classParam) {
      const exists = modelData.classes?.some((c: any) => c.technicalName === classParam);
      if (exists) {
        targetElement = { type: 'class', name: classParam };
      }
    } else if (codelistParam) {
      targetElement = { type: 'codelist', name: codelistParam };
    }

    if (!targetElement && modelData.classes && modelData.classes.length > 0) {
      targetElement = { type: 'class', name: modelData.classes[0].technicalName };
    }

    if (JSON.stringify(selectedElement) !== JSON.stringify(targetElement)) {
      setSelectedElement(targetElement);
    }
  }, [searchString, modelData, selectedElement]);

  // Fetch model data when selected version changes
  useEffect(() => {
    if (!selectedVersion || availableVersions.length === 0) return;

    const versionItem = availableVersions.find(v => v.version === selectedVersion);
    if (!versionItem) return;

    let isMounted = true;
    setLoading(true);

    fetch(`${CONFIG.basePath}data/suomi.fi/tietomallit/${versionItem.path}`)
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return;
        setModelData(data);
        setLoading(false);
      })
      .catch(err => {
        if (isMounted) {
          console.error('[DataModelView] Failed to fetch model details:', err);
          setError('Failed to fetch model schema details.');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [selectedVersion, availableVersions]);

  // Resolve used codelists for this model
  const usedCodelists = useMemo(() => {
    if (!modelData) return [];
    const uris = new Set<string>();
    modelData.classes?.forEach((cls: any) => {
      cls.codelists?.forEach((uri: string) => uris.add(uri));
      cls.attributes?.forEach((attr: any) => {
        attr.codelist?.forEach((uri: string) => uris.add(uri));
      });
    });

    // Match each URI with codelists index
    return allCodelists
      .filter((c: any) => uris.has(c.uri))
      .map((c: any) => ({
        ...c,
        technicalName: c.uri.split('/').pop()?.split(':').pop() || ''
      }));
  }, [modelData, allCodelists]);

  // Fetch codelist detail when a codelist is selected
  useEffect(() => {
    if (!selectedElement || selectedElement.type !== 'codelist' || allCodelists.length === 0) {
      setCodelistDetail(null);
      return;
    }

    const item = allCodelists.find(c => {
      const techName = c.uri.split('/').pop()?.split(':').pop() || '';
      return techName === selectedElement.name;
    });

    if (!item) {
      setCodelistDetail(null);
      return;
    }

    let isMounted = true;
    setLoadingCodelist(true);

    fetch(`${CONFIG.basePath}data/suomi.fi/koodistot/${item.path}`)
      .then(r => r.json())
      .then(data => {
        if (!isMounted) return;
        setCodelistDetail(data);
        setLoadingCodelist(false);
      })
      .catch(err => {
        if (isMounted) {
          console.error('[DataModelView] Failed to fetch codelist details:', err);
          setLoadingCodelist(false);
        }
      });

    return () => { isMounted = false; };
  }, [selectedElement, allCodelists]);

  // Generate Mermaid diagram when selected class or language changes
  useEffect(() => {
    if (!modelData || !selectedVersion || !selectedElement || selectedElement.type !== 'class') {
      setMermaidChart('');
      return;
    }

    const snippet = `modelId: ${modelName}-${selectedVersion}
classes:
- ${selectedElement.name}
lang: ${dataLang}`;

    transpileDataModelSnippetToMermaid(snippet, dataModelAccess)
      .then(chart => {
        setMermaidChart(chart);
      })
      .catch(err => {
        setMermaidChart('');
      });
  }, [modelData, selectedVersion, selectedElement, dataLang, modelName]);

  // Helper: check if primitive
  const isPrimitiveType = (type: string) => {
    const primitives = ['string', 'integer', 'boolean', 'double', 'date', 'dateTime', 'anyURI', 'decimal', 'gYear', 'base64Binary', 'Literal', 'anySimpleType'];
    return primitives.includes(type) || type.toLowerCase().startsWith('xsd:');
  };

  // Helper: check if type is click-navigable class or codelist
  const getTypeNavigation = (type: string, attributeCodelists?: string[]): { type: 'class' | 'codelist'; name: string } | null => {
    if (isPrimitiveType(type)) {
      if (attributeCodelists && attributeCodelists.length > 0) {
        // Try mapping the first codelist URI
        const codelistUri = attributeCodelists[0];
        const matched = allCodelists.find(c => c.uri === codelistUri);
        if (matched) {
          const techName = matched.uri.split('/').pop()?.split(':').pop() || '';
          return { type: 'codelist', name: techName };
        }
      }
      return null;
    }

    // Check if type matches a class in this model
    const classExists = modelData?.classes?.find((c: any) => c.technicalName === type);
    if (classExists) {
      return { type: 'class', name: type };
    }

    // Check if matches a used codelist
    const codelistExists = usedCodelists.find((c: any) => c.technicalName === type);
    if (codelistExists) {
      return { type: 'codelist', name: type };
    }

    return null;
  };

  // State synchronization with URL Params
  const updateUrlParams = (version: string, element: { type: 'class' | 'codelist'; name: string } | null, lang: string) => {
    const queryParams: Record<string, string | null> = {
      version,
      lang,
      class: element?.type === 'class' ? element.name : null,
      codelist: element?.type === 'codelist' ? element.name : null,
    };
    navigate({ type: 'model', slug: modelName, queryParams });
  };

  const handleSelectVersion = (version: string) => {
    setSelectedVersion(version);
    updateUrlParams(version, selectedElement, dataLang);
  };

  const handleSelectElement = (val: string) => {
    if (!val) return;
    const [type, name] = val.split(':');
    const newElement = { type: type as 'class' | 'codelist', name };
    setSelectedElement(newElement);
    updateUrlParams(selectedVersion, newElement, dataLang);
  };

  const handleSelectLanguage = (lang: string) => {
    setDataLang(lang);
    updateUrlParams(selectedVersion, selectedElement, lang);
  };

  // Helper to copy code URI to clipboard
  const copyToClipboard = (uri: string) => {
    navigator.clipboard.writeText(uri).then(() => {
      setCopiedCodeUri(uri);
      setTimeout(() => setCopiedCodeUri(null), 1500);
    });
  };

  // Extract selected class details
  const selectedClassObj = useMemo(() => {
    if (selectedElement?.type === 'class' && modelData?.classes) {
      return modelData.classes.find((c: any) => c.technicalName === selectedElement.name);
    }
    return null;
  }, [selectedElement, modelData]);

  // Render
  if (loading && !modelData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/10">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
          <p className="text-slate-400 font-mono tracking-wider text-sm">{t.common.loading}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">{error}</h2>
        <button 
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white px-5 py-2.5 rounded-full transition-colors text-sm font-semibold"
        >
          <ArrowLeft size={16} />
          {t.common.backToHome}
        </button>
      </div>
    );
  }

  const metadata = modelData?.metadata || {};

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Header and Controls */}
      <div className="flex flex-col gap-6 border-b border-white/5 pb-8">
        <div className="flex flex-col gap-6 md:flex-row md:justify-between items-start">
          <div className="flex flex-col gap-4">
            <button 
              onClick={onBack}
              className="self-start inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-semibold mb-2"
            >
              <ArrowLeft size={16} />
              {t.common.backToHome}
            </button>
            <div className="flex items-center gap-6 mb-2 uppercase">
              <Database size={24} className="text-brand-accent" aria-hidden="true" />
              <span className="text-xs font-bold tracking-[0.4em] text-slate-500">{t.dataModel.dataModelBrowser}</span>
              <div className="h-[1px] flex-grow bg-white/10" aria-hidden="true" />
            </div>
            <h1 className="text-4xl font-black tracking-tighter leading-[0.8] text-white">
                  {getLocalized(metadata.name)}
            </h1>
            <a
              href={metadata.modelUri || metadata.id}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-slate-500 flex items-center gap-1.5  hover:underline font-semibold"
            >
              <span className="text-brand-accent">{metadata.modelUri || metadata.id}</span>
              <ExternalLink size={12} />
              </a>
            <div className="flex gap-3 flex-wrap items-center">
            {metadata.lastModified && (
              <div className="">
                  <span className="text-slate-500 font-semibold">{t.dataModel.modified}:</span>{' '}
                  <span className="font-semibold text-slate-200">
                  {new Date(metadata.lastModified).toLocaleDateString(dataLang)}
                  </span>
              </div>
              )}
            {metadata.originSyncTime && (
              <div className="">
                  <span className="text-sm text-slate-500 font-semibold">{t.dataModel.originSyncTimeLabel}</span>{' '}
                  <span className="font-semibold text-slate-200">
                  {new Date(metadata.originSyncTime).toLocaleString(dataLang)}
                  </span>
              </div>
            )}
            </div>
          </div>

          {/* Dynamic Selectors */}
          <div className="flex flex-col gap-4">
            {/* Language Selector */}
            <div className="flex grow-0 items-center gap-2 bg-black/40 border border-white/5 rounded-full px-4 py-2 text-sm">
              <Globe size={16} className="text-slate-400" />
              <div className="flex gap-1.5">
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelectLanguage(lang.code)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      dataLang === lang.code 
                        ? 'bg-brand-accent text-black shadow-md' 
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Flexible Filler Spacer */}
            <div className="flex grow"></div>

            {/* Model Version Dropdown */}
            <div className="relative">
              <select
                value={selectedVersion}
                onChange={(e) => handleSelectVersion(e.target.value)}
                className="appearance-none bg-black/40 border border-white/5 hover:border-white/10 rounded-full pl-5 pr-10 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
              >
                {availableVersions.map((v) => (
                  <option key={v.version} value={v.version} className="bg-slate-900 text-white">
                    {t.dataModel.versionOptionLabel} {v.version} ({v.status})
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Compact Combined Description & Documentation (foldable, open by default) */}
        <div className="bg-black/30 border border-white/5 rounded-2xl flex flex-col overflow-hidden text-sm animate-fade-in">
          <button
            onClick={() => setIsModelInfoOpen(!isModelInfoOpen)}
            className="w-full text-left px-5 py-3 flex items-center justify-between group transition-colors hover:bg-white/[0.02]"
          >
            <div className="flex items-center gap-2">
              <Info size={16} className="text-brand-accent" />
              <span className="font-bold text-white">{t.dataModel.modelDetails}</span>
            </div>
            <div className="flex items-center gap-3 pl-3 border-l border-white/5">
              <span className="text-xs font-semibold text-slate-400 group-hover:text-brand-accent transition-colors">
                {isModelInfoOpen ? t.page.close : t.dataModel.showDocumentation}
              </span>
              <ChevronDown
                size={16}
                className={`text-slate-500 transition-transform duration-500 group-hover:text-brand-accent ${
                  isModelInfoOpen ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          <AnimatePresence>
            {isModelInfoOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 pt-2 border-t border-white/5 flex flex-col gap-4">
                  {/* Description */}
                  {getLocalized(metadata.description) ? (
                    <p className="text-slate-300 leading-relaxed text-sm">
                      {getLocalized(metadata.description)}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic text-sm">
                      {t.dataModel.noDescription}
                    </p>
                  )}

                  {/* Documentation */}
                  {metadata.documentation && (
                    <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
                      <h3 className="font-bold text-slate-400 flex items-center gap-1.5">
                        <BookOpen size={14} className="text-brand-accent" />
                        {t.dataModel.documentationAndHistory}
                      </h3>
                      <div className="markdown-body prose prose-invert prose-sm max-w-none text-slate-300 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        <ReactMarkdown>{getLocalized(metadata.documentation)}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Selector and Active Info Panels */}
      <div className="flex flex-col gap-8">
        {/* 2. The class or codelist selector */}
        <ClassCodelistSelector
          classes={modelData?.classes || []}
          usedCodelists={usedCodelists}
          selectedElement={selectedElement}
          onSelectElement={handleSelectElement}
          getLocalized={getLocalized}
          t={t}
          modelName={modelName}
          selectedVersion={selectedVersion}
        />

        {/* 3. The class info panel */}
        {selectedElement?.type === 'class' && selectedClassObj && (
          <ClassInfoPanel
            selectedClassObj={selectedClassObj}
            mermaidChart={mermaidChart}
            dataLang={dataLang}
            getLocalized={getLocalized}
            onNavigateToType={(type, name) => handleSelectElement(`${type}:${name}`)}
            getTypeNavigation={getTypeNavigation}
            t={t}
          />
        )}

        {/* 4. The codelist info panel */}
        {selectedElement?.type === 'codelist' && (
          <CodelistInfoPanel
            codelistDetail={codelistDetail}
            loadingCodelist={loadingCodelist}
            dataLang={dataLang}
            getLocalized={getLocalized}
            copiedCodeUri={copiedCodeUri}
            onCopy={copyToClipboard}
            t={t}
          />
        )}
      </div>
    </div>
  );
}

