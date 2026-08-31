export interface InteractiveImageProperties {
  href?: string;
  alt?: string;
  title?: string;
  style?: string;
  svgContent?: string;
  note?: string;
}

export function parseInteractiveImageBlock(content: string): InteractiveImageProperties {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      return {
        href: parsed.href ? String(parsed.href).trim() : undefined,
        alt: parsed.alt ? String(parsed.alt).trim() : undefined,
        title: parsed.title ? String(parsed.title).trim() : undefined,
        style: parsed.style ? String(parsed.style).trim() : undefined,
        svgContent: parsed.svgContent ? String(parsed.svgContent).trim() : (parsed.svgcontent ? String(parsed.svgcontent).trim() : undefined),
        note: parsed.note ? String(parsed.note).trim() : undefined,
      };
    } catch {
      // Fallback
    }
  }

  const config: Record<string, string> = {};
  const lines = content.split('\n');
  let currentKey: 'href' | 'alt' | 'title' | 'style' | 'svgcontent' | 'note' | null = null;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine && !currentKey) continue;

    const match = line.match(/^\s*(href|alt|title|style|svgContent|note)\s*:(.*)/i);
    if (match) {
      currentKey = match[1].toLowerCase() as any;
      let val = match[2].trim();
      if (val === '|') {
        config[currentKey] = '';
      } else {
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
          val = val.slice(1, -1);
        }
        config[currentKey] = val;
      }
    } else if (currentKey) {
      const existing = config[currentKey] || '';
      config[currentKey] = existing + (existing ? '\n' : '') + line;
    }
  }

  return {
    href: config.href ? config.href.trim() : undefined,
    alt: config.alt ? config.alt.trim() : undefined,
    title: config.title ? config.title.trim() : undefined,
    style: config.style ? config.style.trim() : undefined,
    svgContent: config.svgcontent ? config.svgcontent.trim() : undefined,
    note: config.note ? config.note.trim() : undefined,
  };
}
