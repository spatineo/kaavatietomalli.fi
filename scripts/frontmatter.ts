import * as yaml from 'js-yaml';

export interface FrontmatterResult {
  data: Record<string, any>;
  content: string;
}

export function parseFrontmatter(fileContent: string): FrontmatterResult {
  // Remove BOM if present
  let str = fileContent;
  if (str.charCodeAt(0) === 0xFEFF) {
    str = str.slice(1);
  }
  
  const normalized = str.replace(/\r\n/g, '\n');
  
  if (normalized.startsWith('---\n')) {
    const secondSeparatorIndex = normalized.indexOf('\n---\n', 4);
    if (secondSeparatorIndex !== -1) {
      const yamlStr = normalized.slice(4, secondSeparatorIndex);
      const content = normalized.slice(secondSeparatorIndex + 5);
      let data: Record<string, any> = {};
      try {
        data = yaml.load(yamlStr, { schema: yaml.JSON_SCHEMA }) as Record<string, any> || {};
      } catch (e) {
        console.warn('Warning: Failed to parse frontmatter YAML:', e);
      }
      return { data, content };
    }
  }
  
  return { data: {}, content: fileContent };
}
