import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateAssets, getGitHistoryOfContent } from './generate-assets';
import { getFilesRecursive, escapeXml, parseVideoConfig, validateVideoBlock, validateMarkdownVideoBlocks } from './content-utils';

describe('Content Utilities', () => {
  describe('escapeXml', () => {
    it('should correctly escape XML special characters', () => {
      expect(escapeXml('<hello> & "world" - \'spatineo\'')).toBe('&lt;hello&gt; &amp; &quot;world&quot; - &apos;spatineo&apos;');
    });

    it('should handle strings with no special characters', () => {
      expect(escapeXml('Simple text')).toBe('Simple text');
    });
  });

  describe('parseVideoConfig', () => {
    it('should parse standard key-value line formats', () => {
      const configStr = `
        id: video123
        title: "Test Video"
        autoplay: true
        controls: 1
        aspectRatio: '16:9'
      `;
      const config = parseVideoConfig(configStr);
      expect(config.id).toBe('video123');
      expect(config.title).toBe('Test Video');
      expect(config.autoplay).toBe(true);
      expect(config.controls).toBe(1);
      expect(config.aspectRatio).toBe('16:9');
    });

    it('should fallback/support JSON strings if enclosed in curly brackets', () => {
      const configStr = '{"id": "abc_123-xyz", "fs": 0}';
      const config = parseVideoConfig(configStr);
      expect(config.id).toBe('abc_123-xyz');
      expect(config.fs).toBe(0);
    });

    it('should throw an error for malformed key-value pairs lacking colons', () => {
      const badStr = 'id: 123\nmalformed_line_no_colon';
      expect(() => parseVideoConfig(badStr)).toThrow('Invalid line format (missing colon)');
    });
  });

  describe('validateVideoBlock', () => {
    it('should accept valid Youtube config options', () => {
      const configStr = 'id: aBcDxYz12-3\ncontrols: 2\nfs: true\naspectRatio: "16:9"';
      expect(() => validateVideoBlock('youtube', configStr, 'test.md', 10)).not.toThrow();
    });

    it('should throw on YouTube config with invalid IDs', () => {
      const configStr = 'id: short'; // YouTube IDs must be exactly 11 characters
      expect(() => validateVideoBlock('youtube', configStr, 'test.md', 10)).toThrow('Invalid YouTube video ID');
    });

    it('should throw on YouTube config with unknown options', () => {
      const configStr = 'id: aBcDxYz12-3\ninvalidOption: true';
      expect(() => validateVideoBlock('youtube', configStr, 'test.md', 10)).toThrow('Unknown configuration option');
    });

    it('should accept valid Vimeo config options', () => {
      const configStr = 'id: 123456789/abc123ef\ncolor: "00adef"\nloop: false';
      expect(() => validateVideoBlock('vimeo', configStr, 'test.md', 10)).not.toThrow();
    });

    it('should throw on Vimeo config with invalid IDs', () => {
      const configStr = 'id: non_numeric_id';
      expect(() => validateVideoBlock('vimeo', configStr, 'test.md', 10)).toThrow('Invalid Vimeo video ID');
    });
  });

  describe('validateMarkdownVideoBlocks', () => {
    it('should capture video blocks of code and validate them successfully', () => {
      const markdown = `
# Title
Let's embed a video here:
\`\`\`youtube
id: aBcDxYz-4-9
autoplay: true
\`\`\`
Ending content.
      `;
      expect(() => validateMarkdownVideoBlocks('test-file.md', markdown)).not.toThrow();
    });

    it('should throw error inside markdown block if invalid configuration values are parsed', () => {
      const badMarkdown = `
# Title
\`\`\`youtube
id: short_id
\`\`\`
      `;
      expect(() => validateMarkdownVideoBlocks('test-file.md', badMarkdown)).toThrow('Invalid YouTube video ID "short_id"');
    });
  });
});

describe('Git History Fallback', () => {
  it('should return empty map and print warning when .git directory is absent', () => {
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      if (String(p).includes('.git')) return false;
      return true;
    });
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const history = getGitHistoryOfContent();
      expect(history).toEqual({});
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('No .git directory found'));
    } finally {
      existsSpy.mockRestore();
      logSpy.mockRestore();
    }
  });
});

describe('Asset Generation Pipeline', () => {
  let warnSpy: any;
  let logSpy: any;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    logSpy.mockRestore();
    vi.restoreAllMocks();
  });

  it('should print warnings when Markdown folders are missing', () => {
    // Force existsSync to return false for content directories
    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      const pathStr = String(p);
      if (pathStr.includes('content/posts') || pathStr.includes('content/pages') || pathStr.includes('content/authors')) {
        return false;
      }
      return true;
    });

    // We can also spy on getFilesRecursive to avoid reading actual filesystem during this missing folders test
    const readdirSpy = vi.spyOn(fs, 'readdirSync').mockImplementation((p: any) => {
      return [] as any;
    });

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

    try {
      generateAssets();

      // Ensure warnSpy was triggered for missing directories
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Posts directory does not exist'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Pages directory does not exist'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Authors directory does not exist'));
    } finally {
      existsSpy.mockRestore();
      readdirSpy.mockRestore();
      writeSpy.mockRestore();
    }
  });

  it('should warn when frontmatter title is missing, serialize complex schemas, and enforce scheduling rules', () => {
    const mockedFiles: Record<string, string> = {
      // Post 1: Future published post (scheduling filter should discard this)
      'posts/future-post.md': `---
title: "Future Post Title"
category: "journal"
date: "2026-06-01"
tags: ["spatial", "model"]
publishDate: "2026-12-31T12:00:00Z"
---
Coming from the future.`,

      // Post 2: Active post with tags, date, and valid title
      'posts/valid-active-post.md': `---
title: "Active Post Title"
category: "journal"
date: "2026-05-15"
tags: ["finnish", "GIS"]
publishDate: "2026-05-15T00:00:00Z"
author: "Ilkka"
authorSlug: "ilkka-rinne"
---
This is a published active post context.`,

      // Post 3: Post lacking title (should raise warning)
      'posts/missing-title-post.md': `---
category: "journal"
date: "2026-05-16"
tags: ["untiled"]
---
A post without a title.`,

      // Page 1: Standard markdown page with tags
      'pages/info-page.md': `---
title: "Metadata Specifications"
tags: ["schema", "documentation"]
---
This is some documentation.`,

      // Page 2: Page lacking a title (should raise warning)
      'pages/empty-title-page.md': `---
tags: ["unnamed"]
---
Unnamed static page.`,

      // Author 1: Author profile
      'authors/ilkka-rinne.md': `---
name: "Ilkka Rinne"
title: "Founder & Architect"
company: "Spatineo"
skills: ["GIS", "Kotlin", "Playwright"]
---
Architect's bio.`,

      // Post 4: Sponsored active post
      'posts/sponsored-post.md': `---
title: "Sponsored Post Title"
category: "journal"
date: "2026-05-18"
tags: ["gis"]
publishDate: "2026-05-18T00:00:00Z"
promotional: true
partner: "Spatineo"
callToAction: "https://www.spatineo.com"
excerpt: "This is a great blog post about Kaavatietomalli."
---
This is a sponsored post.`,

      // Post 5: Post with promotional as a string (partner name fallback)
      'posts/promo-string-post.md': `---
title: "Promo String Post"
category: "journal"
date: "2026-05-19"
tags: ["gis"]
publishDate: "2026-05-19T00:00:00Z"
promotional: "Spatineo Oy"
excerpt: "Another sponsored post."
---
Promo string post.`,

      // Post 6: Post with promotional set to false
      'posts/promo-false-post.md': `---
title: "Promo False Post"
category: "journal"
date: "2026-05-20"
tags: ["gis"]
publishDate: "2026-05-20T00:00:00Z"
promotional: false
excerpt: "Not a promotional post."
---
Promo false post.`,

      // Page 3: Page with a partner
      'pages/partner-page.md': `---
title: "Partner Page Title"
partner: "Spatineo"
tags: ["partner-info"]
---
Partner description.`,
    };

    const existsSpy = vi.spyOn(fs, 'existsSync').mockImplementation((p: any) => {
      const pathStr = String(p).replace(/\\/g, '/');
      if (pathStr.includes('content/posts') || pathStr.includes('content/pages') || pathStr.includes('content/authors')) {
        return true;
      }
      if (pathStr.includes('content/images')) {
        return false; // prevent copying images
      }
      return true;
    });

    const readdirSpy = vi.spyOn(fs, 'readdirSync').mockImplementation((p: any) => {
      const pathStr = String(p).replace(/\\/g, '/');
      if (pathStr.endsWith('/posts')) {
        return ['future-post.md', 'valid-active-post.md', 'missing-title-post.md', 'sponsored-post.md', 'promo-string-post.md', 'promo-false-post.md'] as any;
      }
      if (pathStr.endsWith('/pages')) {
        return ['info-page.md', 'empty-title-page.md', 'partner-page.md'] as any;
      }
      if (pathStr.endsWith('/authors')) {
        return ['ilkka-rinne.md'] as any;
      }
      return [] as any;
    });

    const readSpy = vi.spyOn(fs, 'readFileSync').mockImplementation((p: any, options?: any) => {
      const pathStr = String(p).replace(/\\/g, '/');
      for (const [mockedPath, content] of Object.entries(mockedFiles)) {
        if (pathStr.endsWith(mockedPath)) {
          return content;
        }
      }
      return '';
    });

    const mockStats: Record<string, any> = {
      isDirectory: () => false,
    };
    const statSpy = vi.spyOn(fs, 'statSync').mockImplementation(() => mockStats as any);

    const writtenFiles: Record<string, string> = {};
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation((p: any, data: any) => {
      const pathStr = String(p).replace(/\\/g, '/');
      // Normalize to extract the final asset filename inside public dir
      const relativePart = pathStr.split('public/').pop();
      if (relativePart) {
        writtenFiles[relativePart] = typeof data === 'string' ? data : JSON.stringify(data);
      }
      return undefined;
    });

    const mkdirSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);

    try {
      generateAssets();

      // Rule Validation Check 1: Empty Title Warnings
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Post in "missing-title-post.md" has missing or empty "title"'));
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Page in "empty-title-page.md" has missing or empty "title"'));

      // Check serialized outputs
      expect(writtenFiles['content/posts.json']).toBeDefined();
      expect(writtenFiles['content/pages.json']).toBeDefined();
      expect(writtenFiles['content/tags.json']).toBeDefined();

      const postsOutput = JSON.parse(writtenFiles['content/posts.json']);
      const pagesOutput = JSON.parse(writtenFiles['content/pages.json']);
      const tagsOutput = JSON.parse(writtenFiles['content/tags.json']);

      // Rule Validation Check 2: Complex Frontmatter Serialization
      const activePost = postsOutput.find((p: any) => p.slug === 'valid-active-post');
      expect(activePost).toBeDefined();
      expect(activePost.category).toBe('journal');
      expect(activePost.author).toBe('Ilkka');
      expect(activePost.tags).toContain('GIS');
      expect(activePost.tags).toContain('finnish');

      // Rule Check 3: Scheduling Rules (Discard Future-Dated Post "future-post")
      const futurePost = postsOutput.find((p: any) => p.slug === 'future-post');
      expect(futurePost).toBeUndefined(); // Should be completely excluded based on future publishDate

      // Rule Check 4: Tag Index generation correctly grouped active and untitled posts, but not future ones
      expect(tagsOutput['gis'].posts).toContain('valid-active-post');
      expect(tagsOutput['gis'].posts).not.toContain('future-post');
      expect(tagsOutput['schema'].pages).toContain('info-page');

      // Rule Check 5: XML Sitemap matches the active posts and pages
      expect(writtenFiles['sitemap.xml']).toBeDefined();
      expect(writtenFiles['sitemap.xml']).toContain('?post=valid-active-post');
      expect(writtenFiles['sitemap.xml']).not.toContain('?post=future-post');
      expect(writtenFiles['sitemap.xml']).toContain('?page=info-page');

      // Rule Check 6: Promotional and Partner Post details correctly parsed
      const sponsoredPost = postsOutput.find((p: any) => p.slug === 'sponsored-post');
      expect(sponsoredPost).toBeDefined();
      expect(sponsoredPost.promotional).toBe(true);
      expect(sponsoredPost.partner).toBe('Spatineo');
      expect(sponsoredPost.callToAction).toBe('https://www.spatineo.com');

      const partnerPage = pagesOutput.find((p: any) => p.slug === 'partner-page');
      expect(partnerPage).toBeDefined();
      expect(partnerPage.partner).toBe('Spatineo');

      const promoStringPost = postsOutput.find((p: any) => p.slug === 'promo-string-post');
      expect(promoStringPost).toBeDefined();
      expect(promoStringPost.promotional).toBe(true);
      expect(promoStringPost.partner).toBe('Spatineo Oy');

      const promoFalsePost = postsOutput.find((p: any) => p.slug === 'promo-false-post');
      expect(promoFalsePost).toBeDefined();
      expect(promoFalsePost.promotional).toBe(false);
      expect(promoFalsePost.partner).toBeUndefined();

      // Rule Check 7: Promotional warnings included in llms outputs
      expect(writtenFiles['llms.txt']).toBeDefined();
      expect(writtenFiles['llms.txt']).toContain('[PROMOTIONAL / KAUPALLINEN YHTEISTYÖ: Spatineo]');
      expect(writtenFiles['llms-full.txt']).toBeDefined();
      expect(writtenFiles['llms-full.txt']).toContain('[PROMOTIONAL / KAUPALLINEN YHTEISTYÖ: Spatineo]');

      // Rule Check 8: Promotional info in RSS Feed XML
      expect(writtenFiles['feed.xml']).toBeDefined();
      expect(writtenFiles['feed.xml']).toContain('[Kaupallinen yhteistyö - Spatineo] Sponsored Post Title');
      expect(writtenFiles['feed.xml']).toContain('Tämä kirjoitus on osa kaupallista yhteistyötä Kaavatietomalli.fi-sivuston ja Spatineo:n välillä.');

      // Rule Check 9: Localized 404.html redirection page generated
      expect(writtenFiles['404.html']).toBeDefined();
      expect(writtenFiles['404.html']).toContain('Ohjataan uudelleen...');
      expect(writtenFiles['404.html']).toContain('Etsimääsi sivua ei löytynyt suoralla osoitteella.');
      expect(writtenFiles['404.html']).toContain('kaavatietomalli.fi');

    } finally {
      existsSpy.mockRestore();
      readdirSpy.mockRestore();
      readSpy.mockRestore();
      statSpy.mockRestore();
      writeSpy.mockRestore();
      mkdirSpy.mockRestore();
    }
  });
});
