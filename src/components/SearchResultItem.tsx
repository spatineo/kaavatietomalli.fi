import { BookOpen, FileText, User, ArrowRight, Database, List } from 'lucide-react';
import { getTranslations, Language } from '../i18n';
import { CONFIG } from '../config';

interface SearchResultItemProps {
  result: any;
  size?: 'sm' | 'lg';
  onClick: (type: string, slug: string) => void;
}

export function SearchResultItem({ result, size = 'sm', onClick }: SearchResultItemProps) {
  const t = getTranslations(CONFIG.language as Language);
  const isLarge = size === 'lg';

  const typeName = t.search.types[result.document.type as keyof typeof t.search.types] || result.document.type;

  const getIcon = (type: string) => {
    const iconSize = isLarge ? 20 : 14;
    switch (type) {
      case 'post': return <BookOpen size={iconSize} />;
      case 'page': return <FileText size={iconSize} />;
      case 'author': return <User size={iconSize} />;
      case 'class': return <Database size={iconSize} />;
      case 'codelist': return <List size={iconSize} />;
      default: return null;
    }
  };

  return (
    <button
      onClick={() => onClick(result.document.type, result.document.slug)}
      className={`w-full text-left hover:bg-white/5 transition-all group flex items-start ${
        isLarge ? 'p-4 rounded-2xl gap-4' : 'p-3 rounded-xl gap-3'
      }`}
    >
      <div 
        className="mt-1 text-brand-accent group-hover:scale-110 transition-transform shrink-0"
        title={typeName}
      >
        {getIcon(result.document.type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className={`font-bold text-white group-hover:text-brand-accent transition-colors leading-tight truncate ${
          isLarge ? 'text-xl mb-1' : 'text-sm mb-0.5'
        }`}>
          {result.document.name || result.document.title}
          {(result.document.type === 'class' || result.document.type === 'codelist' )&& (
            <span> ({result.document.slug.split(':')[0]})</span>
          )}
        </div>
        
        {result.document.type === 'author' && result.document.name && (result.document.title || result.document.company) && (
          <div className={`${isLarge ? 'text-sm mb-1.5' : 'text-[10px] mb-1'} text-slate-400 font-medium line-clamp-1`}>
            {result.document.title}{result.document.company ? `, ${result.document.company}` : ''}
          </div>
        )}
        
        {result.document.excerpt && (
          <div className={`${isLarge ? 'text-base' : 'text-xs'} text-slate-500 line-clamp-1 leading-relaxed`}>
            {result.document.excerpt}
          </div>
        )}
      </div>

      <div className="shrink-0 flex items-center justify-end">
        <ArrowRight 
          size={isLarge ? 18 : 14} 
          className="mt-1 text-slate-600 group-hover:text-brand-accent group-hover:translate-x-1 transition-all" 
        />
      </div>
    </button>
  );
}
