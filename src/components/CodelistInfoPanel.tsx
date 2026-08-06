import { useState, useEffect } from 'react';
import { Info, FileText, ExternalLink, Layers, Check, Copy, Search, X } from 'lucide-react';
import { Translations } from '../i18n/types';
import { getStatusLabel } from '../lib/data-model-utils';
import type { Codelist, CodeItem } from '../lib/data-model-types';

interface CodelistInfoPanelProps {
  codelistDetail: Codelist | null;
  loadingCodelist: boolean;
  dataLang: string;
  getLocalized: (obj: any) => string;
  copiedCodeUri: string | null;
  onCopy: (uri: string) => void;
  t: Translations;
}

export function CodelistInfoPanel({
  codelistDetail,
  loadingCodelist,
  dataLang,
  getLocalized,
  copiedCodeUri,
  onCopy,
  t
}: CodelistInfoPanelProps) {
  const [filterQuery, setFilterQuery] = useState('');

  useEffect(() => {
    setFilterQuery('');
  }, [codelistDetail?.id]);

  if (loadingCodelist) {
    return (
      <div className="bg-black/20 border border-white/5 rounded-3xl p-10 py-16 flex flex-col items-center justify-center gap-4 animate-fade-in">
        <div className="w-8 h-8 border-2 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
        <p className="text-xs font-mono text-slate-400">{t.dataModel.loadingCodelistInfo}</p>
      </div>
    );
  }

  if (!codelistDetail) {
    return (
      <div className="bg-black/20 border border-white/5 rounded-3xl p-10 py-10 text-center">
        <p className="text-sm text-slate-400">{t.dataModel.errorLoadingCodelist}</p>
      </div>
    );
  }

  // Filter logic
  const query = filterQuery.trim().toLowerCase();
  let displayedCodes = codelistDetail.codes || [];

  if (query) {
    const codeMap = new Map<string, any>();
    for (const code of codelistDetail.codes) {
      if (code.codeValue) {
        codeMap.set(code.codeValue, code);
      }
    }

    const matchedValues = new Set<string>();

    for (const code of codelistDetail.codes) {
      const codeVal = code.codeValue || '';
      const namesObj = code.name || {};
      const localizedName = getLocalized(namesObj);
      const fallbackName = (Object.values(namesObj)[0] as string) || '';
      const nameText = localizedName || fallbackName;

      if (
        codeVal.toLowerCase().includes(query) ||
        nameText.toLowerCase().includes(query)
      ) {
        matchedValues.add(codeVal);

        // Retain parent codes (broaderCode)
        let parentCodeVal = code.broaderCode;
        while (parentCodeVal) {
          if (matchedValues.has(parentCodeVal)) {
            break;
          }
          const parentCode = codeMap.get(parentCodeVal);
          if (parentCode) {
            matchedValues.add(parentCodeVal);
            parentCodeVal = parentCode.broaderCode;
          } else {
            break;
          }
        }
      }
    }

    displayedCodes = codelistDetail.codes.filter((code: any) =>
      code.codeValue && matchedValues.has(code.codeValue)
    );
  }

  return (
    <div className="bg-black/20 border border-white/5 rounded-3xl p-8 md:p-10 flex flex-col gap-8 animate-fade-in">
      {/* Codelist Header */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent bg-brand-accent/10 px-2.5 py-0.5 rounded">{t.dataModel.codelistLabel}</span>
          <h2 className="text-2xl font-bold text-white">
            {getLocalized(codelistDetail.name) || codelistDetail.technicalName}
          </h2>
          <div className="flex-grow"></div>
          {codelistDetail.status !== 'VALID' && (
            <div className="font-bold text-sm text-white bg-red-950 px-1.5 py-0.5 rounded"> {getStatusLabel(codelistDetail.status)}</div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-400">
          <div className="flex gap-2">
            <span className="text-slate-500">{t.dataModel.technicalName}</span>
            <span className="text-slate-300">{codelistDetail.technicalName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500">{t.dataModel.uri}</span>
            <span 
              className="text-slate-300 select-all overflow-hidden text-ellipsis whitespace-nowrap" 
              title={codelistDetail.uri}
            >
              {codelistDetail.uri}
            </span>
          </div>
        </div>
      </div>

      {/* Descriptions & Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
          <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
            <Info size={14} className="text-brand-accent" /> {t.dataModel.description}
          </h4>
          <p className="text-sm text-slate-300 leading-relaxed">
            {getLocalized(codelistDetail.description) || t.dataModel.noDescription}
          </p>
        </div>
        {codelistDetail.definition && Object.keys(codelistDetail.definition).length > 0 && (
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6">
            <h4 className="text-sm font-bold text-slate-200 mb-2 flex items-center gap-2">
              <FileText size={14} className="text-brand-accent" /> {t.dataModel.definition}
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed">
              {getLocalized(codelistDetail.definition)}
            </p>
          </div>
        )}
      </div>

      {/* Status and dates */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-slate-400 border-t border-b border-white/5 py-4">
        {codelistDetail.modified && (
          <div>
            {t.dataModel.updated} <span className="font-semibold text-slate-300">{new Date(codelistDetail.modified).toLocaleDateString(dataLang)}</span>
          </div>
        )}
        {codelistDetail.documentationUrl && (
          <a 
            href={codelistDetail.documentationUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-brand-accent hover:underline font-semibold"
          >
            {t.dataModel.openCodelistService} <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* Codes Table with Hierarchy Level Indentation */}
      {codelistDetail.codes && codelistDetail.codes.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers size={18} className="text-brand-accent" />
              {t.dataModel.codesTitle} {query ? (
                <span className="text-sm font-normal text-slate-400">
                  ({displayedCodes.length} / {codelistDetail.codes.length} {t.dataModel.codesCountSuffix})
                </span>
              ) : (
                <span className="text-sm font-normal text-slate-400">
                  ({codelistDetail.codes.length} {t.dataModel.codesCountSuffix})
                </span>
              )}
            </h3>

            {/* Simple text filter */}
            <div className="relative w-full sm:w-80">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
                <Search size={14} />
              </span>
              <input
                id="codes-table-filter"
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder={t.dataModel.filterCodesPlaceholder}
                className="w-full pl-9 pr-8 py-1.5 bg-white/5 border border-white/10 hover:border-white/20 focus:border-brand-accent/50 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-accent/30 transition-all font-sans"
              />
              {filterQuery && (
                <button
                  id="clear-codes-filter"
                  onClick={() => setFilterQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto border border-white/5 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-xs text-slate-400 font-bold uppercase border-b border-white/5">
                  <th className="px-6 py-4">{t.dataModel.codeValue}</th>
                  <th className="px-6 py-4">{t.dataModel.name}</th>
                  <th className="px-6 py-4 whitespace-nowrap">{t.dataModel.status}</th>
                  <th className="px-6 py-4 text-right">{t.dataModel.copyUri}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5 text-slate-300">
                {displayedCodes.length > 0 ? (
                  displayedCodes.map((code: CodeItem) => {
                    let hasIndent: number | boolean = false;
                    let indentStyle = {}; 
                    if (code.hierarchyLevel) {
                        hasIndent = code.hierarchyLevel && code.hierarchyLevel > 1;
                        if (hasIndent) {
                            indentStyle = { paddingLeft: `${(code.hierarchyLevel - 1) * 1.5 + 1.5}rem` };
                        }
                    }
                    return (
                      <tr key={code.uri} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 font-mono text-sm text-brand-accent font-semibold">
                          <div className="flex items-center gap-1.5" style={indentStyle}>
                            {hasIndent && (
                              <span className="text-slate-600 font-normal mr-1">└──</span>
                            )}
                            {code.codeValue}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-200">
                          <span title={getLocalized(code.description)}>{getLocalized(code.name) || (Object.values(code.name || {})[0] as any)}</span>
                        </td>
                        <td className="px-6 py-4 text-xs font-mono">
                          <span className={`whitespace-nowrap px-2 py-0.5 rounded ${
                            code.status === 'VALID' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' 
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/10'
                          }`}>
                            {getStatusLabel(code.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onCopy(code.uri)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition-all text-xs font-semibold font-mono min-w-32"
                            title={t.dataModel.copyUri}
                          >
                            {copiedCodeUri === code.uri ? (
                              <>
                                <Check size={12} className="text-emerald-400" />
                                <span className="text-emerald-400">{t.dataModel.copied}</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                <span>URI</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      {t.search.noResults} "{filterQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-400 py-6 text-center bg-white/[0.01] rounded-2xl border border-dashed border-white/5">
          {t.dataModel.noCodesAvailable}
        </p>
      )}
    </div>
  );
}
