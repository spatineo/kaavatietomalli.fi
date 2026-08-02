import { lazy, Suspense } from 'react';
import { Compass, Layers } from 'lucide-react';
import { Translations } from '../i18n/types';

const Mermaid = lazy(() => import('./Mermaid').then(module => ({ default: module.Mermaid })));

interface ClassInfoPanelProps {
  selectedClassObj: any;
  mermaidChart: string;
  dataLang: string;
  getLocalized: (obj: any) => string;
  onNavigateToType: (type: 'class' | 'codelist', name: string) => void;
  getTypeNavigation: (type: string, attributeCodelists?: string[]) => { type: 'class' | 'codelist'; name: string } | null;
  t: Translations;
}

export function ClassInfoPanel({
  selectedClassObj,
  mermaidChart,
  dataLang,
  getLocalized,
  onNavigateToType,
  getTypeNavigation,
  t
}: ClassInfoPanelProps) {
  return (
    <div className="bg-black/20 border border-white/5 rounded-3xl p-8 md:p-10 flex flex-col gap-8 animate-fade-in">
      {/* Header Info */}
      <div className="flex flex-col gap-4 border-b border-white/5 pb-6">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent bg-brand-accent/10 px-2.5 py-0.5 rounded">{t.dataModel.classLabel}</span>
          <h2 className="text-2xl font-bold text-white">
            {getLocalized(selectedClassObj.name) || selectedClassObj.technicalName}
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono text-slate-400">
          <div className="flex gap-2">
            <span className="text-slate-500">{t.dataModel.technicalName}</span>
            <span className="text-slate-300">{selectedClassObj.technicalName}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-slate-500">{t.dataModel.uri}</span>
            <span 
              className="text-slate-300 select-all overflow-hidden text-ellipsis whitespace-nowrap" 
              title={selectedClassObj.uri || selectedClassObj.id}
            >
              {selectedClassObj.uri || selectedClassObj.id}
            </span>
          </div>
        </div>

        {selectedClassObj.description && getLocalized(selectedClassObj.description) && (
          <div className="text-sm text-slate-300 leading-relaxed border-t border-white/5 pt-4 mt-2">
            {getLocalized(selectedClassObj.description)}
          </div>
        )}
      </div>

      {/* Mermaid diagram */}
      {mermaidChart && (
        <div>
          <h3 className="text-base font-bold text-white mb-2">{t.dataModel.classDiagram}</h3>
          <Suspense fallback={
            <div className="h-48 w-full flex items-center justify-center border border-white/5 bg-black/10 rounded-2xl animate-pulse">
              <span className="text-xs text-slate-500 font-mono">Loading diagram...</span>
            </div>
          }>
            <Mermaid chart={mermaidChart} />
          </Suspense>
        </div>
      )}

      {/* Attributes Table */}
      {selectedClassObj.attributes && selectedClassObj.attributes.length > 0 && (
        <div className="flex flex-col gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers size={18} className="text-brand-accent" />
            {t.dataModel.attributes}
          </h3>
          <div className="overflow-x-auto border border-white/5 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-xs text-slate-400 font-bold uppercase border-b border-white/5">
                  <th className="px-6 py-4">{t.dataModel.name}</th>
                  <th className="px-6 py-4">{t.dataModel.technicalNameOrId}</th>
                  <th className="px-6 py-4">{t.dataModel.dataType}</th>
                  <th className="px-6 py-4">{t.dataModel.cardinality}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5 text-slate-300">
                {selectedClassObj.attributes.map((attr: any) => {
                  const nav = getTypeNavigation(attr.type, attr.codelist);
                  return (
                    <tr key={attr.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {getLocalized(attr.name) || attr.id.split('/').pop()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">
                        {attr.id.split('/').pop()}
                      </td>
                      <td className="px-6 py-4">
                        {attr.type === 'Literal' && attr.codelist && attr.codelist.length > 0 ? (
                          <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
                            {attr.codelist.map((uri: string, idx: number) => {
                              const techName = uri.split('/').pop()?.split(':').pop() || '';
                              return (
                                <span key={uri} className="inline-flex items-center">
                                  <button
                                    onClick={() => onNavigateToType('codelist', techName)}
                                    className="font-mono text-xs text-brand-accent hover:underline flex items-center gap-1 text-left"
                                  >
                                    {techName}
                                    <Compass size={12} />
                                  </button>
                                  {idx < attr.codelist.length - 1 && (
                                    <span className="text-slate-500 text-xs select-none mr-1">,</span>
                                  )}
                                </span>
                              );
                            })}
                          </div>
                        ) : nav ? (
                          <button
                            onClick={() => onNavigateToType(nav.type, nav.name)}
                            className="font-mono text-xs text-brand-accent hover:underline flex items-center gap-1.5 text-left"
                          >
                            {attr.type}
                            <Compass size={12} />
                          </button>
                        ) : (
                          <span className="font-mono text-xs text-slate-400">{attr.type}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {attr.cardinality}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Associations Table */}
      {selectedClassObj.associations && selectedClassObj.associations.length > 0 && (
        <div className="flex flex-col gap-4 mt-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Compass size={18} className="text-brand-accent" />
            {t.dataModel.associations}
          </h3>
          <div className="overflow-x-auto border border-white/5 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-xs text-slate-400 font-bold uppercase border-b border-white/5">
                  <th className="px-6 py-4">{t.dataModel.roleOrAssociationName}</th>
                  <th className="px-6 py-4">{t.dataModel.targetClass}</th>
                  <th className="px-6 py-4">{t.dataModel.cardinality}</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-white/5 text-slate-300">
                {selectedClassObj.associations.map((assoc: any) => {
                  const targetTechName = assoc.targetClassId.split('/').pop()?.split(':').pop() || '';
                  return (
                    <tr key={assoc.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-200">
                        {getLocalized(assoc.name) || assoc.id.split('/').pop()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => onNavigateToType('class', targetTechName)}
                          className="font-mono text-xs text-brand-accent hover:underline flex items-center gap-1.5 text-left"
                        >
                          {targetTechName}
                          <Compass size={12} />
                        </button>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-400">
                        {assoc.cardinality}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
