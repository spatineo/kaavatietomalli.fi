import fs from 'fs';
import path from 'path';
import { parseFrontmatter } from './frontmatter.js';
import {
  getFilesRecursive,
  validateMarkdownVideoBlocks,
  validatePageSlugAndFolders
} from './content-utils.js';

const useTestContent = process.env.CONTENT_MODE === 'test' || process.env.CONTENT_MODE === 'dev/test' || process.env.CONTENT_MODE === 'dev';
const CONTENT_DIR = useTestContent
  ? path.join(process.cwd(), 'test-content')
  : path.join(process.cwd(), 'content');

console.log(`Starting content validation. CONTENT_MODE: ${process.env.CONTENT_MODE || 'production'}`);
console.log(`Using content directory: ${CONTENT_DIR}`);

if (!fs.existsSync(CONTENT_DIR)) {
  console.error(`ERROR: Content directory "${CONTENT_DIR}" does not exist!`);
  process.exit(1);
}

const errors: string[] = [];
let checkedFilesCount = 0;

// Helper to assert conditions and log failures
function assert(condition: boolean, message: string, filePath?: string) {
  if (!condition) {
    const errorPrefix = filePath ? `[File: ${filePath}] ` : '';
    errors.push(`${errorPrefix}${message}`);
  }
}

// Helper to catch errors inside functions
function checkSafe(fn: () => void, filePath?: string) {
  try {
    fn();
  } catch (err: any) {
    const errorPrefix = filePath ? `[File: ${filePath}] ` : '';
    errors.push(`${errorPrefix}${err.message || err}`);
  }
}

// --- PART 2: Actual Content Files Validation ---
console.log('\n--- Validating actual markdown content files ---');

const postsDir = path.join(CONTENT_DIR, 'posts');
const pagesDir = path.join(CONTENT_DIR, 'pages');
const authorsDir = path.join(CONTENT_DIR, 'authors');

// Validate Posts
if (fs.existsSync(postsDir)) {
  const postFiles = getFilesRecursive(postsDir);
  console.log(`Found ${postFiles.length} posts to validate.`);
  for (const file of postFiles) {
    const fullPath = path.join(postsDir, file);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    checkedFilesCount++;

    // Video, Data-Model-Snippet and Instance Blocks
    checkSafe(() => validateMarkdownVideoBlocks(fullPath, rawContent), file);

    // Front matter parsing
    let parsed: any;
    try {
      parsed = parseFrontmatter(rawContent);
    } catch (err: any) {
      errors.push(`[File: ${file}] Front matter parsing failed: ${err.message || err}`);
      continue;
    }

    const { data, content } = parsed;

    // Title validation
    assert(data.title !== undefined, 'Missing required metadata: "title"', file);
    if (data.title !== undefined) {
      assert(typeof data.title === 'string' && data.title.trim().length > 0, 'Metadata "title" must be a non-empty string', file);
    }

    // Date validation
    assert(data.date !== undefined, 'Missing required metadata: "date"', file);
    if (data.date !== undefined) {
      const isString = typeof data.date === 'string' && data.date.trim().length > 0;
      const isDate = data.date instanceof Date;
      assert(isString || isDate, 'Metadata "date" must be a non-empty string or Date object', file);
    }

    // Author validation
    assert(data.author !== undefined, 'Missing required metadata: "author"', file);
    if (data.author !== undefined) {
      assert(typeof data.author === 'string' && data.author.trim().length > 0, 'Metadata "author" must be a non-empty string', file);
    }

    // Excerpt validation
    assert(data.excerpt !== undefined, 'Missing required metadata: "excerpt"', file);
    if (data.excerpt !== undefined) {
      assert(typeof data.excerpt === 'string', 'Metadata "excerpt" must be a string', file);
    }

    // Tags validation
    assert(data.tags !== undefined, 'Missing required metadata: "tags"', file);
    if (data.tags !== undefined) {
      assert(Array.isArray(data.tags), 'Metadata "tags" must be an array of strings', file);
      if (Array.isArray(data.tags)) {
        data.tags.forEach((tag: any, idx: number) => {
          assert(typeof tag === 'string', `Tag at index ${idx} must be a string`, file);
        });
      }
    }

    // Content body validation
    assert(typeof content === 'string', 'Content body must be a string', file);
  }
} else {
  console.log(`Posts directory not found: ${postsDir}`);
}

// Validate Pages
if (fs.existsSync(pagesDir)) {
  const pageFiles = getFilesRecursive(pagesDir);
  console.log(`Found ${pageFiles.length} pages to validate.`);
  const tagPages: { [tag:string]: string} = {};

  for (const file of pageFiles) {
    const fullPath = path.join(pagesDir, file);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    checkedFilesCount++;

    // Video, Data-Model-Snippet and Instance Blocks
    checkSafe(() => validateMarkdownVideoBlocks(fullPath, rawContent), file);

    // Page slug and folders validation (reserved routing safety check)
    checkSafe(() => validatePageSlugAndFolders(file), file);

    // Front matter parsing
    let parsed: any;
    try {
      parsed = parseFrontmatter(rawContent);
    } catch (err: any) {
      errors.push(`[File: ${file}] Front matter parsing failed: ${err.message || err}`);
      continue;
    }

    const { data, content } = parsed;

    // Title validation
    assert(data.title !== undefined, 'Missing required metadata: "title"', file);
    if (data.title !== undefined) {
      assert(typeof data.title === 'string' && data.title.trim().length > 0, 'Metadata "title" must be a non-empty string', file);
    }

    // Tage page uniqueness validation
    if (data.tags !== undefined) {
      const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
      for (const tag of data.tags) {
        if (tagPages[tag]) {
          errors.push(`Page ${slug} trying to claim status of the tag page for tag '${tag}', already claimed by page ${tagPages[tag]}`);
        } else {
          tagPages[tag] = slug;
        }
      }
    }
    // Content body validation
    assert(typeof content === 'string', 'Content body must be a string', file);
  }
} else {
  console.log(`Pages directory not found: ${pagesDir}`);
}

// Validate Authors
if (fs.existsSync(authorsDir)) {
  const authorFiles = getFilesRecursive(authorsDir);
  console.log(`Found ${authorFiles.length} authors to validate.`);
  for (const file of authorFiles) {
    const fullPath = path.join(authorsDir, file);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    checkedFilesCount++;

    // Front matter parsing
    let parsed: any;
    try {
      parsed = parseFrontmatter(rawContent);
    } catch (err: any) {
      errors.push(`[File: ${file}] Front matter parsing failed: ${err.message || err}`);
      continue;
    }

    const { data, content } = parsed;

    // Name validation
    assert(data.name !== undefined, 'Missing required metadata: "name"', file);
    if (data.name !== undefined) {
      assert(typeof data.name === 'string' && data.name.trim().length > 0, 'Metadata "name" must be a non-empty string', file);
    }

    // Title validation
    assert(data.title !== undefined, 'Missing required metadata: "title"', file);
    if (data.title !== undefined) {
      assert(typeof data.title === 'string' && data.title.trim().length > 0, 'Metadata "title" must be a non-empty string', file);
    }

    // Content body validation
    assert(typeof content === 'string', 'Content body must be a string', file);
  }
} else {
  console.log(`Authors directory not found: ${authorsDir}`);
}

// --- Conclusion ---
console.log(`\nValidation finished. Checked ${checkedFilesCount} content files.`);

if (errors.length > 0) {
  console.error(`\n❌ ${errors.length} validation errors found:\n`);
  errors.forEach((err, idx) => {
    console.error(`${idx + 1}. ${err}`);
  });
  process.exit(1);
} else {
  console.log('\n✅ All validations passed successfully!');
  process.exit(0);
}
