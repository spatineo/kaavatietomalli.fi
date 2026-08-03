import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Check, FolderOpen, Database, X, Loader2 } from 'lucide-react';
import { useOramaSearch } from '../hooks/useOramaSearch';
import { Translations } from '../i18n/types';

interface ClassCodelistSelectorProps {
  classes: any[];
  usedCodelists: any[];
  selectedElement: { type: 'class' | 'codelist'; name: string } | null;
  onSelectElement: (val: string) => void;
  getLocalized: (obj: any) => string;
  t: Translations;
  modelName: string;
  selectedVersion: string;
}

export function ClassCodelistSelector({
  classes,
  usedCodelists,
  selectedElement,
  onSelectElement,
  getLocalized,
  t,
  modelName,
  selectedVersion,
}: ClassCodelistSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { performSearch, isInitializing } = useOramaSearch();

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute selected element label
  const selectedLabel = useMemo(() => {
    if (!selectedElement) return '';
    if (selectedElement.type === 'class') {
      const cls = classes.find(c => c.technicalName === selectedElement.name);
      return cls ? (getLocalized(cls.name) || cls.technicalName) : selectedElement.name;
    } else {
      const codelist = usedCodelists.find(c => c.technicalName === selectedElement.name);
      return codelist ? (getLocalized(codelist.names) || codelist.technicalName) : selectedElement.name;
    }
  }, [selectedElement, classes, usedCodelists, getLocalized]);

  // Execute Orama Search when searchQuery changes
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    let active = true;

    const currentModelVersionStr = `${modelName}:${selectedVersion}`;

    performSearch(searchQuery, {
      where: {
        modelVersions: {
          containsAll: [currentModelVersionStr]
        }
      }
    })
      .then((results) => {
        if (!active) return;

        const filtered = results.filter((hit: any) => {
          const doc = hit.document;
          const isClassOrCodelist = doc.type === 'class' || doc.type === 'codelist';
          if (!isClassOrCodelist) return false;
          return doc.modelVersions?.includes(currentModelVersionStr);
        });

        setSearchResults(filtered);
      })
      .catch((err) => {
        console.error('[ClassCodelistSelector] Orama search error:', err);
      })
      .finally(() => {
        if (active) setIsSearching(false);
      });

    return () => {
      active = false;
    };
  }, [searchQuery, performSearch, modelName, selectedVersion]);

  // Fallback Local Search if Orama is initializing or has no results yet
  const localFilteredClasses = useMemo(() => {
    if (!searchQuery.trim()) return classes;
    const query = searchQuery.toLowerCase();
    return classes.filter(c => {
      const name = getLocalized(c.name).toLowerCase();
      const techName = c.technicalName.toLowerCase();
      return name.includes(query) || techName.includes(query);
    });
  }, [searchQuery, classes, getLocalized]);

  const localFilteredCodelists = useMemo(() => {
    if (!searchQuery.trim()) return usedCodelists;
    const query = searchQuery.toLowerCase();
    return usedCodelists.filter(c => {
      const name = getLocalized(c.names).toLowerCase();
      const techName = c.technicalName.toLowerCase();
      return name.includes(query) || techName.includes(query);
    });
  }, [searchQuery, usedCodelists, getLocalized]);

  // Determine which list of classes/codelists to render
  const isOramaReadyAndSearching = searchQuery.trim().length >= 2 && !isInitializing;

  // Handles clicking on an item
  const handleSelectItem = (type: 'class' | 'codelist', name: string) => {
    onSelectElement(`${type}:${name}`);
    setIsOpen(false);
    setSearchQuery('');
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="bg-black/30 border border-white/5 rounded-3xl p-6 flex flex-col gap-4">
      <div>
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          {t.dataModel.browseClassesAndCodelists}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          {t.dataModel.selectClassOrCodelistHelp}
        </p>
      </div>

      <div ref={containerRef} className="relative mt-2">
        {/* Search / Combobox Trigger */}
        <div className="relative flex items-center">
          <div className="absolute left-4 text-slate-400 pointer-events-none">
            {isSearching ? (
              <Loader2 size={16} className="animate-spin text-brand-accent" />
            ) : (
              <Search size={16} />
            )}
          </div>

          <input
            ref={inputRef}
            type="text"
            className="w-full bg-black/50 border border-white/10 hover:border-brand-accent/50 focus:border-brand-accent rounded-xl pl-11 pr-10 py-3 text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-brand-accent transition-all cursor-text font-semibold"
            placeholder={selectedLabel || t.dataModel.browseClassesAndCodelists}
            value={isOpen ? searchQuery : selectedLabel}
            onChange={(e) => {
              if (!isOpen) setIsOpen(true);
              setSearchQuery(e.target.value);
            }}
            onFocus={() => {
              setIsOpen(true);
              setSearchQuery('');
            }}
          />

          {isOpen && searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                if (inputRef.current) inputRef.current.focus();
              }}
              className="absolute right-10 text-slate-400 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}

          <button
            onClick={() => {
              setIsOpen(!isOpen);
              if (!isOpen && inputRef.current) {
                inputRef.current.focus();
              }
            }}
            className="absolute right-4 text-slate-400 hover:text-white transition-colors"
          >
            <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown List */}
        {isOpen && (
          <div className="absolute left-0 right-0 z-50 mt-2 max-h-80 overflow-y-auto bg-[#13151a] border border-white/10 rounded-xl shadow-2xl backdrop-blur-xl p-2 flex flex-col gap-1 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent animate-fade-in">
            
            {isOramaReadyAndSearching ? (
              // 1. Orama Search Results Mode
              searchResults.length > 0 ? (
                <div className="flex flex-col gap-1">
                  <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    {t.search.title} ({searchResults.length})
                  </div>
                  {searchResults.map((hit) => {
                    const doc = hit.document;
                    const techName = doc.slug.split(':').pop() || '';
                    const label = doc.title || techName;
                    const isSelected = selectedElement?.type === doc.type && selectedElement?.name === techName;

                    return (
                      <button
                        key={`${doc.type}:${techName}`}
                        onClick={() => handleSelectItem(doc.type, techName)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center justify-between transition-colors group ${
                          isSelected 
                            ? 'bg-brand-accent/10 text-brand-accent' 
                            : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {doc.type === 'class' ? (
                            <FolderOpen size={16} className={isSelected ? 'text-brand-accent' : 'text-slate-400 group-hover:text-slate-300'} />
                          ) : (
                            <Database size={16} className={isSelected ? 'text-brand-accent' : 'text-slate-400 group-hover:text-slate-300'} />
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-semibold truncate leading-tight">{label}</span>
                            <span className="text-xs font-mono text-slate-500 truncate mt-0.5">{techName}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-slate-400 uppercase tracking-wider">
                            {doc.type === 'class' ? t.dataModel.classLabel : t.dataModel.codelistLabel}
                          </span>
                          {isSelected && <Check size={14} className="text-brand-accent" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-6 text-center text-slate-500 text-sm">
                  {t.search?.noResults || 'No matches found.'}
                </div>
              )
            ) : (
              // 2. Default Mode (All options grouped, optionally locally filtered)
              <div className="flex flex-col gap-2">
                {/* Classes Group */}
                {localFilteredClasses.length > 0 && (
                  <div className="flex flex-col gap-0.5 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                    <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
                      <span>{t.dataModel.classesOptGroup}</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px]">{localFilteredClasses.length}</span>
                    </div>
                    {localFilteredClasses.map((cls) => {
                      const isSelected = selectedElement?.type === 'class' && selectedElement?.name === cls.technicalName;
                      const label = getLocalized(cls.name) || cls.technicalName;

                      return (
                        <button
                          key={`class:${cls.technicalName}`}
                          onClick={() => handleSelectItem('class', cls.technicalName)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors group ${
                            isSelected 
                              ? 'bg-brand-accent/10 text-brand-accent' 
                              : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <FolderOpen size={16} className={isSelected ? 'text-brand-accent' : 'text-slate-400 group-hover:text-slate-300'} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold truncate leading-tight">{label}</span>
                              <span className="text-xs font-mono text-slate-500 truncate mt-0.5">{cls.technicalName}</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-brand-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Codelists Group */}
                {localFilteredCodelists.length > 0 && (
                  <div className="flex flex-col gap-0.5">
                    <div className="px-3 py-1.5 text-[10px] font-bold tracking-wider text-slate-500 uppercase flex items-center justify-between">
                      <span>{t.dataModel.codelistsOptGroup}</span>
                      <span className="bg-white/5 px-1.5 py-0.5 rounded text-[9px]">{localFilteredCodelists.length}</span>
                    </div>
                    {localFilteredCodelists.map((cl) => {
                      const isSelected = selectedElement?.type === 'codelist' && selectedElement?.name === cl.technicalName;
                      const label = getLocalized(cl.names) || cl.technicalName;

                      return (
                        <button
                          key={`codelist:${cl.technicalName}`}
                          onClick={() => handleSelectItem('codelist', cl.technicalName)}
                          className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors group ${
                            isSelected 
                              ? 'bg-brand-accent/10 text-brand-accent' 
                              : 'text-slate-300 hover:bg-white/[0.04] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Database size={16} className={isSelected ? 'text-brand-accent' : 'text-slate-400 group-hover:text-slate-300'} />
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm font-semibold truncate leading-tight">{label}</span>
                              <span className="text-xs font-mono text-slate-500 truncate mt-0.5">{cl.technicalName}</span>
                            </div>
                          </div>
                          {isSelected && <Check size={14} className="text-brand-accent" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {localFilteredClasses.length === 0 && localFilteredCodelists.length === 0 && (
                  <div className="px-4 py-6 text-center text-slate-500 text-sm">
                    {t.search?.noResults || 'No matches found.'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
