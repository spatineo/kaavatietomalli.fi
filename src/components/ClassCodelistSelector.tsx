import { ChevronDown } from 'lucide-react';
import { Translations } from '../i18n/types';

interface ClassCodelistSelectorProps {
  classes: any[];
  usedCodelists: any[];
  selectedElement: { type: 'class' | 'codelist'; name: string } | null;
  onSelectElement: (val: string) => void;
  getLocalized: (obj: any) => string;
  t: Translations;
}

export function ClassCodelistSelector({
  classes,
  usedCodelists,
  selectedElement,
  onSelectElement,
  getLocalized,
  t
}: ClassCodelistSelectorProps) {
  return (
    <div className="bg-black/30 border border-white/5 rounded-3xl p-8 flex flex-col gap-4">
      <h3 className="text-base font-bold text-white">{t.dataModel.browseClassesAndCodelists}</h3>
      <p className="text-xs text-slate-400">{t.dataModel.selectClassOrCodelistHelp}</p>
      <div className="relative mt-2">
        <select
          value={selectedElement ? `${selectedElement.type}:${selectedElement.name}` : ''}
          onChange={(e) => onSelectElement(e.target.value)}
          className="w-full appearance-none bg-black/50 border border-white/10 hover:border-brand-accent/50 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-accent cursor-pointer"
        >
          {classes && classes.length > 0 && (
            <optgroup label={t.dataModel.classesOptGroup} className="bg-slate-900 text-slate-400 font-bold">
              {classes.map((c: any) => (
                <option key={`class:${c.technicalName}`} value={`class:${c.technicalName}`} className="text-slate-200 font-normal">
                  {getLocalized(c.name) || c.technicalName} ({c.technicalName})
                </option>
              ))}
            </optgroup>
          )}
          {usedCodelists && usedCodelists.length > 0 && (
            <optgroup label={t.dataModel.codelistsOptGroup} className="bg-slate-900 text-slate-400 font-bold">
              {usedCodelists.map((c: any) => (
                <option key={`codelist:${c.technicalName}`} value={`codelist:${c.technicalName}`} className="text-slate-200 font-normal">
                  {getLocalized(c.names) || c.technicalName} ({c.technicalName})
                </option>
              ))}
            </optgroup>
          )}
        </select>
        <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      </div>
    </div>
  );
}
