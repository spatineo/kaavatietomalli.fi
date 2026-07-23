import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getFilesRecursive, validateMarkdownVideoBlocks } from './content-utils';

const useTestContent = process.env.CONTENT_MODE === 'test' || process.env.CONTENT_MODE === 'dev/test' || process.env.CONTENT_MODE === 'dev';
const CONTENT_DIR = useTestContent
  ? path.join(process.cwd(), 'test-content')
  : path.join(process.cwd(), 'content');

describe('Content Directory Validation', () => {
  it('should have an existing CONTENT_DIR', () => {
    expect(fs.existsSync(CONTENT_DIR)).toBe(true);
  });

  const postsDir = path.join(CONTENT_DIR, 'posts');
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const authorsDir = path.join(CONTENT_DIR, 'authors');

  // Dynamically load files if the directories exist
  const postFiles = fs.existsSync(postsDir) ? getFilesRecursive(postsDir) : [];
  const pageFiles = fs.existsSync(pagesDir) ? getFilesRecursive(pagesDir) : [];
  const authorFiles = fs.existsSync(authorsDir) ? getFilesRecursive(authorsDir) : [];

  describe('Posts Front Matter and Content', () => {
    if (postFiles.length === 0) {
      it('no post files found', () => {
        expect(postFiles.length).toBe(0);
      });
    }

    postFiles.forEach(file => {
      it(`should validate post: ${file}`, () => {
        const fullPath = path.join(postsDir, file);
        const rawContent = fs.readFileSync(fullPath, 'utf-8');

        // Check if there are any video block errors or general markdown parsing/syntax issues
        expect(() => validateMarkdownVideoBlocks(fullPath, rawContent)).not.toThrow();

        // Parse front matter
        let parsed;
        expect(() => {
          parsed = matter(rawContent);
        }).not.toThrow();

        expect(parsed).toBeDefined();
        const { data, content } = parsed!;

        // Mandatory fields in PostMetadata/PostData:
        // title: string (non-empty)
        expect(data.title).toBeDefined();
        expect(typeof data.title).toBe('string');
        expect(data.title.trim().length).toBeGreaterThan(0);

        // date: string (non-empty) or Date object
        expect(data.date).toBeDefined();
        if (typeof data.date === 'string') {
          expect(data.date.trim().length).toBeGreaterThan(0);
        } else {
          expect(data.date).toBeInstanceOf(Date);
        }

        // author: string (non-empty)
        expect(data.author).toBeDefined();
        expect(typeof data.author).toBe('string');
        expect(data.author.trim().length).toBeGreaterThan(0);

        // excerpt: string (can be empty but must exist as a string)
        expect(data.excerpt).toBeDefined();
        expect(typeof data.excerpt).toBe('string');

        // tags: string[] (must be defined as an array of strings)
        expect(data.tags).toBeDefined();
        expect(Array.isArray(data.tags)).toBe(true);
        data.tags.forEach((tag: any) => {
          expect(typeof tag).toBe('string');
        });

        // Content body: must be a string (can be empty but must be present)
        expect(typeof content).toBe('string');
      });
    });
  });

  describe('Pages Front Matter and Content', () => {
    if (pageFiles.length === 0) {
      it('no page files found', () => {
        expect(pageFiles.length).toBe(0);
      });
    }

    pageFiles.forEach(file => {
      it(`should validate page: ${file}`, () => {
        const fullPath = path.join(pagesDir, file);
        const rawContent = fs.readFileSync(fullPath, 'utf-8');

        // Check video block and syntax validation
        expect(() => validateMarkdownVideoBlocks(fullPath, rawContent)).not.toThrow();

        // Parse front matter
        let parsed;
        expect(() => {
          parsed = matter(rawContent);
        }).not.toThrow();

        expect(parsed).toBeDefined();
        const { data, content } = parsed!;

        // Mandatory fields in PageData:
        // title: string (non-empty)
        expect(data.title).toBeDefined();
        expect(typeof data.title).toBe('string');
        expect(data.title.trim().length).toBeGreaterThan(0);

        // Content body: must be a string
        expect(typeof content).toBe('string');
      });
    });
  });

  describe('Authors Front Matter and Content', () => {
    if (authorFiles.length === 0) {
      it('no author files found', () => {
        expect(authorFiles.length).toBe(0);
      });
    }

    authorFiles.forEach(file => {
      it(`should validate author: ${file}`, () => {
        const fullPath = path.join(authorsDir, file);
        const rawContent = fs.readFileSync(fullPath, 'utf-8');

        // Parse front matter
        let parsed;
        expect(() => {
          parsed = matter(rawContent);
        }).not.toThrow();

        expect(parsed).toBeDefined();
        const { data, content } = parsed!;

        // Mandatory fields in AuthorData:
        // name: string (non-empty)
        expect(data.name).toBeDefined();
        expect(typeof data.name).toBe('string');
        expect(data.name.trim().length).toBeGreaterThan(0);

        // title: string (non-empty)
        expect(data.title).toBeDefined();
        expect(typeof data.title).toBe('string');
        expect(data.title.trim().length).toBeGreaterThan(0);

        // Content body: must be a string
        expect(typeof content).toBe('string');
      });
    });
  });
});
