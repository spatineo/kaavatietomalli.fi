import fs from 'fs';
import path from 'path';

/**
 * Recursively find all markdown (.md) files under a given directory, returning their paths relative to baseDir.
 */
export function getFilesRecursive(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
  
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      return;
    }
    
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath, baseDir));
    } else if (file.endsWith('.md')) {
      results.push(path.relative(baseDir, fullPath));
    }
  });
  return results;
}

/**
 * Escapes characters for XML generation (used in RSS and sitemaps).
 */
export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

/**
 * Parses embedded video element configurations.
 */
export function parseVideoConfig(content: string): Record<string, any> {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      return JSON.parse(trimmed);
    } catch {
      // Fallback to custom key-value parser
    }
  }

  const config: Record<string, any> = {};
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('//')) {
      continue;
    }
    const colonIndex = trimmedLine.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Invalid line format (missing colon): "${trimmedLine}"`);
    }
    const key = trimmedLine.substring(0, colonIndex).trim();
    const valString = trimmedLine.substring(colonIndex + 1).trim();

    let value: any = valString;
    if (valString.toLowerCase() === 'true') {
      value = true;
    } else if (valString.toLowerCase() === 'false') {
      value = false;
    } else if (/^\d+$/.test(valString)) {
      value = parseInt(valString, 10);
    } else if (/^\d*\.\d+$/.test(valString)) {
      value = parseFloat(valString);
    } else if (valString.startsWith('"') && valString.endsWith('"')) {
      value = valString.slice(1, -1);
    } else if (valString.startsWith("'") && valString.endsWith("'")) {
      value = valString.slice(1, -1);
    }
    config[key] = value;
  }
  return config;
}

/**
 * Validates a single iframe-embed video metadata structure.
 */
export function validateVideoBlock(type: 'youtube' | 'vimeo', configString: string, filePath: string, startLine: number): void {
  let config: Record<string, any>;
  try {
    config = parseVideoConfig(configString);
  } catch (err: any) {
    throw new Error(`In file ${filePath} near line ${startLine}: Failed to parse ${type} config: ${err.message}`);
  }

  if (config.id === undefined || config.id === null || String(config.id).trim() === '') {
    throw new Error(`In file ${filePath} near line ${startLine}: "${type}" block is missing the required "id" parameter.`);
  }

  const idStr = String(config.id).trim();

  if (type === 'youtube') {
    if (!/^[a-zA-Z0-9_-]{11}$/.test(idStr)) {
      throw new Error(`In file ${filePath} near line ${startLine}: Invalid YouTube video ID "${idStr}". YouTube video IDs must be exactly 11 characters containing alphanumeric characters, dashes or underscores.`);
    }

    const allowedKeys = new Set([
      'id', 'title', 'aspectRatio', 'autoplay', 'cc_load_policy', 'controls',
      'disablekb', 'enablejsapi', 'end', 'fs', 'hl', 'iv_load_policy',
      'loop', 'playlist', 'modestbranding', 'mute', 'playsinline', 'rel', 'start'
    ]);

    for (const key of Object.keys(config)) {
      if (!allowedKeys.has(key)) {
        throw new Error(`In file ${filePath} near line ${startLine}: Unknown configuration option "${key}" for YouTube video embed. Allowed options: ${Array.from(allowedKeys).join(', ')}`);
      }

      const val = config[key];
      if (['autoplay', 'disablekb', 'enablejsapi', 'fs', 'loop', 'modestbranding', 'mute', 'playsinline', 'rel'].includes(key)) {
        if (typeof val !== 'boolean' && val !== 0 && val !== 1) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "${key}" must be a boolean (true/false) or binary numeric (0/1). Received: ${val} (type ${typeof val})`);
        }
      } else if (key === 'controls') {
        if (typeof val !== 'boolean' && val !== 0 && val !== 1 && val !== 2) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "controls" must be a boolean (true/false) or a number [0, 1, 2]. Received: ${val}`);
        }
      } else if (key === 'cc_load_policy') {
        if (typeof val !== 'boolean' && val !== 0 && val !== 1) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "cc_load_policy" must be boolean (true/false) or binary numeric (0/1). Received: ${val}`);
        }
      } else if (['start', 'end'].includes(key)) {
        if (typeof val !== 'number' || val < 0) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "${key}" must be a non-negative number of seconds. Received: ${val}`);
        }
      } else if (key === 'iv_load_policy') {
        if (val !== 1 && val !== 3) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "iv_load_policy" must be either 1 or 3. Received: ${val}`);
        }
      } else if (key === 'hl') {
        if (typeof val !== 'string' || val.trim().length === 0) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "hl" must be a non-empty string. Received: ${val}`);
        }
      } else if (key === 'aspectRatio') {
        if (typeof val !== 'string') {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "aspectRatio" must be a string (e.g., "16:9"). Received: ${val}`);
        }
      }
    }
  } else if (type === 'vimeo') {
    if (!/^\d+(\/[a-f0-9]+)?$/.test(idStr)) {
      throw new Error(`In file ${filePath} near line ${startLine}: Invalid Vimeo video ID "${idStr}". Vimeo video IDs must be numeric (e.g. 76979871) or numeric with custom hash (e.g. 76979871/abc12345).`);
    }

    const allowedKeys = new Set([
      'id', 'title', 'aspectRatio', 'autoplay', 'autopause', 'background',
      'byline', 'color', 'controls', 'dnt', 'hash', 'keyboard',
      'loop', 'muted', 'mute', 'pip', 'playsinline', 'portrait', 'quality', 'speed'
    ]);

    for (const key of Object.keys(config)) {
      if (!allowedKeys.has(key)) {
        throw new Error(`In file ${filePath} near line ${startLine}: Unknown configuration option "${key}" for Vimeo video embed. Allowed options: ${Array.from(allowedKeys).join(', ')}`);
      }

      const val = config[key];
      if (['autoplay', 'autopause', 'background', 'byline', 'controls', 'dnt', 'keyboard', 'loop', 'muted', 'mute', 'pip', 'playsinline', 'portrait', 'speed'].includes(key)) {
        if (typeof val !== 'boolean' && val !== 0 && val !== 1) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "${key}" must be a boolean (true/false) or binary numeric (0/1). Received: ${val} (type ${typeof val})`);
        }
      } else if (key === 'color') {
        if (typeof val !== 'string' || !/^[0-9a-fA-F]{3,8}$/.test(val)) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "color" must be a valid hex color string without "#" (e.g. "00adef"). Received: ${val}`);
        }
      } else if (key === 'quality') {
        const allowedQualities = ['4k', '1080p', '720p', '540p', '360p', 'auto'];
        if (!allowedQualities.includes(String(val))) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "quality" must be one of [${allowedQualities.join(', ')}]. Received: ${val}`);
        }
      } else if (key === 'title') {
        if (typeof val !== 'boolean' && typeof val !== 'string' && val !== 0 && val !== 1) {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "title" must be a boolean, string, or binary numeric. Received: ${val}`);
        }
      } else if (key === 'aspectRatio') {
        if (typeof val !== 'string') {
          throw new Error(`In file ${filePath} near line ${startLine}: Parameter "aspectRatio" must be a string (e.g., "16:9"). Received: ${val}`);
        }
      }
    }
  }
}

/**
 * Validates the markdown structure of a file for video embedding format correctness.
 */
export function validateMarkdownVideoBlocks(filePath: string, fileContent: string) {
  const lines = fileContent.split(/\r?\n/);
  let isInsideBlock = false;
  let blockType = '';
  let blockLines: string[] = [];
  let blockStartLine = -1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('```')) {
      const match = line.match(/^```(\w+)/);
      if (!isInsideBlock && match && (match[1] === 'youtube' || match[1] === 'vimeo')) {
        isInsideBlock = true;
        blockType = match[1];
        blockLines = [];
        blockStartLine = i + 1;
      } else if (isInsideBlock && line.startsWith('```')) {
        validateVideoBlock(blockType as 'youtube' | 'vimeo', blockLines.join('\n'), filePath, blockStartLine);
        isInsideBlock = false;
        blockType = '';
      }
    } else if (isInsideBlock) {
      blockLines.push(lines[i]);
    }
  }
}

/**
 * Compares two JSON objects ignoring originSyncTime in root or metadata.
 */
export function isContentEqual(a: any, b: any): boolean {
  if (!a || !b) return false;

  const cleanA = JSON.parse(JSON.stringify(a));
  const cleanB = JSON.parse(JSON.stringify(b));

  if (cleanA?.metadata?.originSyncTime !== undefined) {
    delete cleanA.metadata.originSyncTime;
  }
  if (cleanB?.metadata?.originSyncTime !== undefined) {
    delete cleanB.metadata.originSyncTime;
  }
  if (cleanA?.originSyncTime !== undefined) {
    delete cleanA.originSyncTime;
  }
  if (cleanB?.originSyncTime !== undefined) {
    delete cleanB.originSyncTime;
  }

  return JSON.stringify(cleanA) === JSON.stringify(cleanB);
}
