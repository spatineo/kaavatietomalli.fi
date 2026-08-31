import React, { useMemo, createContext, useContext, useRef } from 'react';
import { Link } from 'lucide-react';
import { scrollToAnchor } from '../lib/utils';
import { CONFIG } from '../config';
import { getTranslations, Language } from '../i18n';

interface HeadingProps {
  level: number;
  children: React.ReactNode;
}

export function getTextContent(children: React.ReactNode): string {
  if (!children) return '';
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) {
    return children.map(getTextContent).join('');
  }
  if (typeof children === 'object' && children !== null && 'props' in children) {
    return getTextContent((children as any).props.children);
  }
  return '';
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[äå]/g, 'a')
    .replace(/[ö]/g, 'o')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const HeadingRegistryContext = createContext<{
  registerHeading: (level: number, text: string) => string;
  getPrefixById: (id: string) => string | undefined;
} | null>(null);

export function HeadingRegistryProvider({ children, uniqueHeadings }: { children: React.ReactNode; uniqueHeadings: HeaderItem[] }) {
  const countsRef = useRef<Record<string, number>>({});
  
  // Reset the counts on every render pass of this provider
  countsRef.current = {};
  
  const registerHeading = (level: number, text: string): string => {
    const textSlug = slugify(text);
    const key = `${level}|${textSlug}`;
    const currentCount = countsRef.current[key] || 0;
    countsRef.current[key] = currentCount + 1;
    
    // Find the currentCount-th heading in uniqueHeadings that matches level and slugified text
    let matchIndex = 0;
    const matchedHeading = uniqueHeadings.find(h => {
      if (h.level === level && slugify(h.text) === textSlug) {
        if (matchIndex === currentCount) {
          return true;
        }
        matchIndex++;
      }
      return false;
    });
    
    if (matchedHeading) {
      return matchedHeading.id;
    }
    
    // Fallback if not found: generate a slug on the fly
    const fallbackId = textSlug;
    return currentCount > 0 ? `${fallbackId}-${currentCount}` : fallbackId;
  };

  const getPrefixById = (id: string): string | undefined => {
    const heading = uniqueHeadings.find(h => h.id === id);
    return heading?.prefix;
  };

  return (
    <HeadingRegistryContext.Provider value={{ registerHeading, getPrefixById }}>
      {children}
    </HeadingRegistryContext.Provider>
  );
}

export function MarkdownHeading({ level, children }: HeadingProps) {
  const t = getTranslations(CONFIG.language as Language);
  const text = getTextContent(children);
  const registry = useContext(HeadingRegistryContext);
  
  const id = useMemo(() => {
    if (registry) {
      return registry.registerHeading(level, text);
    }
    return slugify(text);
  }, [registry, level, text]);

  const prefix = useMemo(() => {
    if (registry && id) {
      return registry.getPrefixById(id);
    }
    return undefined;
  }, [registry, id]);

  const Tag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    scrollToAnchor(id);
  };

  return (
    <Tag id={id} className="group relative flex scroll-mt-24">
      <a
        href={`#${id}`}
        onClick={handleAnchorClick}
        className="absolute left-0 -ml-6 opacity-0 group-hover:opacity-100 transition-opacity pr-2 text-slate-500 hover:text-brand-accent flex items-center justify-center w-6 h-full cursor-pointer"
        title={t.page.linkToSection.replace('{{text}}', text)}
        aria-label={t.page.linkToSection.replace('{{text}}', text)}
      >
        <Link size={16} />
      </a>
      <span className="heading-number">{prefix ? `${prefix}` : ''}</span><span className="heading-content">{children}</span>
    </Tag>
  );
}

export interface HeaderItem {
  level: number;
  text: string;
  id: string;
  prefix?: string;
}

export function getUniqueHeadings(title: string, headings: { level: number; text: string }[]): HeaderItem[] {
  const seen: Record<string, number> = {};
  
  // Deduplicate title first (always level 1)
  const titleBaseId = slugify(title);
  seen[titleBaseId] = 0;
  const titleItem: HeaderItem = {
    level: 1,
    text: title,
    id: titleBaseId
  };
  
  const uniqueHeadings = headings.map(h => {
    const baseId = slugify(h.text);
    let id = baseId;
    if (seen[baseId] !== undefined) {
      seen[baseId]++;
      id = `${baseId}-${seen[baseId]}`;
    } else {
      seen[baseId] = 0;
    }
    return {
      level: h.level,
      text: h.text,
      id
    };
  });
  
  return [titleItem, ...uniqueHeadings];
}

export function useHeadings(content: string): HeaderItem[] {
  return useMemo(() => {
    if (!content) return [];
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const headings: { level: number; text: string }[] = [];
    let match;
    // Strip code blocks to avoid false heading matches inside code blocks
    const cleanContent = content.replace(/```[\s\S]*?```/g, '');
    while ((match = headingRegex.exec(cleanContent)) !== null) {
      const level = match[1].length;
      const text = match[2].trim();
      headings.push({
        level,
        text
      });
    }
    // We can use getUniqueHeadings helper, but since we don't have the title inside useHeadings, we can deduplicate them independently starting with empty seen state, or we can just return raw headings and let getUniqueHeadings handle it. Wait, to keep useHeadings backwards compatible in case it is called directly elsewhere, let's make it return unique IDs on its own:
    const seen: Record<string, number> = {};
    return headings.map(h => {
      const baseId = slugify(h.text);
      let id = baseId;
      if (seen[baseId] !== undefined) {
        seen[baseId]++;
        id = `${baseId}-${seen[baseId]}`;
      } else {
        seen[baseId] = 0;
      }
      return {
        level: h.level,
        text: h.text,
        id
      };
    });
  }, [content]);
}

export function assignHeadingPrefixes(combinedHeadings: HeaderItem[], shouldNumber: boolean): HeaderItem[] {
  if (!shouldNumber) {
    return combinedHeadings;
  }

  const levelCounters: Record<number, number> = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  return combinedHeadings.map((h) => {
    if (h.level < 2 || h.level > 6) {
      return h;
    }

    // Reset all deeper levels
    for (let i = h.level + 1; i <= 6; i++) {
      levelCounters[i] = 0;
    }

    // Increment current level
    levelCounters[h.level] = (levelCounters[h.level] || 0) + 1;

    // Build prefix parts starting from level 2
    const parts: number[] = [];
    for (let i = 2; i <= h.level; i++) {
      if (levelCounters[i] === 0) {
        levelCounters[i] = 1;
      }
      parts.push(levelCounters[i]);
    }

    // Level 2 headings get trailing dot "1.", nested levels get standard joined format e.g., "1.1" or "1.1.1"
    const prefix = parts.join('.');

    return {
      ...h,
      prefix,
    };
  });
}

