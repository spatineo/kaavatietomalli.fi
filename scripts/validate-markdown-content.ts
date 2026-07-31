import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import {
  getFilesRecursive,
  validateMarkdownVideoBlocks,
  validateDataModelSnippetBlock,
  validateInstanceBlock
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

// --- PART 1: Internal Parser Unit Validation Self-Checks ---
console.log('\n--- Running internal self-checks for custom DSL validators ---');

// 1. Data Model Snippet Self-Checks
checkSafe(() => {
  const correctBlock = `
modelId: "rytj-kaava-1.0.5"
classes:
  - "Kaava"
  - "Kaava-asianPaatos"
lang: "fi"
  `;
  validateDataModelSnippetBlock(correctBlock, 'internal-self-check', 1);
});

checkSafe(() => {
  const jsonBlock = `
modelId: "rytj-kaava-1.0.5"
classes: ["Kaava", "Kaava-asianPaatos"]
  `;
  validateDataModelSnippetBlock(jsonBlock, 'internal-self-check', 1);
});

try {
  const missingModelId = `
classes:
  - "Kaava"
  `;
  validateDataModelSnippetBlock(missingModelId, 'internal-self-check', 1);
  errors.push('Self-check failed: validateDataModelSnippetBlock should have thrown an error for missing modelId');
} catch (e: any) {
  // Expected
}

try {
  const missingClasses = `
modelId: "rytj-kaava-1.0.5"
  `;
  validateDataModelSnippetBlock(missingClasses, 'internal-self-check', 1);
  errors.push('Self-check failed: validateDataModelSnippetBlock should have thrown an error for missing classes');
} catch (e: any) {
  // Expected
}

try {
  const unknownOption = `
modelId: "rytj-kaava-1.0.5"
classes:
  - "Kaava"
foo: "bar"
  `;
  validateDataModelSnippetBlock(unknownOption, 'internal-self-check', 1);
  errors.push('Self-check failed: validateDataModelSnippetBlock should have thrown an error for unknown option foo');
} catch (e: any) {
  // Expected
}

// 2. Instance DSL Self-Checks
checkSafe(() => {
  const correctInstance = `
instanceDiagram
instance alice : User {
  id = 101
  role = "ADMIN"
}
object ord1 : Order {
  total = "45.50"
}
alice -> ord1 : places
  `;
  validateInstanceBlock(correctInstance, 'internal-self-check', 1);
});

checkSafe(() => {
  const inlineInstance = `
instance alice : User
instance bob : User
alice -> bob : friends
  `;
  validateInstanceBlock(inlineInstance, 'internal-self-check', 1);
});

try {
  const badAttr = `
id = 101
  `;
  validateInstanceBlock(badAttr, 'internal-self-check', 1);
  errors.push('Self-check failed: validateInstanceBlock should have thrown an error for attribute assigned outside block');
} catch (e: any) {
  // Expected
}

try {
  const unclosedBlock = `
instance alice : User {
  id = 101
  `;
  validateInstanceBlock(unclosedBlock, 'internal-self-check', 1);
  errors.push('Self-check failed: validateInstanceBlock should have thrown an error for unclosed block');
} catch (e: any) {
  // Expected
}

try {
  const unrecognizedLine = `
instanceDiagram
this is not valid syntax at all
  `;
  validateInstanceBlock(unrecognizedLine, 'internal-self-check', 1);
  errors.push('Self-check failed: validateInstanceBlock should have thrown an error for unrecognized line');
} catch (e: any) {
  // Expected
}

// 3. mixed blocks
checkSafe(() => {
  const mixedMarkdown = `
# Markdown Title
Some text here.

\`\`\`youtube
id: aBcDxYz-4-9
\`\`\`

More text.

\`\`\`data-model-snippet
modelId: "rytj-kaava-1.0.5"
classes:
  - "Kaava"
\`\`\`

And an instance diagram:

\`\`\`instance
instanceDiagram
instance alice : User {
  id = 101
}
\`\`\`
  `;
  validateMarkdownVideoBlocks('internal-self-check', mixedMarkdown);
});

console.log('Self-checks complete.');

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
      parsed = matter(rawContent);
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
  for (const file of pageFiles) {
    const fullPath = path.join(pagesDir, file);
    const rawContent = fs.readFileSync(fullPath, 'utf-8');
    checkedFilesCount++;

    // Video, Data-Model-Snippet and Instance Blocks
    checkSafe(() => validateMarkdownVideoBlocks(fullPath, rawContent), file);

    // Front matter parsing
    let parsed: any;
    try {
      parsed = matter(rawContent);
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
      parsed = matter(rawContent);
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
