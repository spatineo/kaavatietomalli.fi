import { describe, it, expect } from 'vitest';
import path from 'path';
import fs from 'fs';
import {
  validateMarkdownVideoBlocks,
  validateDataModelSnippetBlock,
  validateInstanceBlock
} from './content-utils.js';

describe('validate-markdown-content tests', () => {
  describe('validateDataModelSnippetBlock', () => {
    it('should validate a correct configuration successfully', () => {
      const correctBlock = `
modelId: "rytj-kaava-1.0.5"
classes:
  - "Kaava"
  - "Kaava-asianPaatos"
lang: "fi"
      `;
      expect(() => validateDataModelSnippetBlock(correctBlock, 'test.md', 1)).not.toThrow();
    });

    it('should validate a JSON classes array format successfully', () => {
      const jsonBlock = `
modelId: "rytj-kaava-1.0.5"
classes: ["Kaava", "Kaava-asianPaatos"]
      `;
      expect(() => validateDataModelSnippetBlock(jsonBlock, 'test.md', 1)).not.toThrow();
    });

    it('should throw if modelId is missing', () => {
      const missingModelId = `
classes:
  - "Kaava"
      `;
      expect(() => validateDataModelSnippetBlock(missingModelId, 'test.md', 1)).toThrow('missing the required "modelId" parameter');
    });

    it('should throw if classes is missing', () => {
      const missingClasses = `
modelId: "rytj-kaava-1.0.5"
      `;
      expect(() => validateDataModelSnippetBlock(missingClasses, 'test.md', 1)).toThrow('missing the required "classes" parameter');
    });

    it('should throw on unknown options', () => {
      const unknownOption = `
modelId: "rytj-kaava-1.0.5"
classes:
  - "Kaava"
foo: "bar"
      `;
      expect(() => validateDataModelSnippetBlock(unknownOption, 'test.md', 1)).toThrow('Unknown configuration option "foo"');
    });
  });

  describe('validateInstanceBlock', () => {
    it('should validate correct instance/object configurations successfully', () => {
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
      expect(() => validateInstanceBlock(correctInstance, 'test.md', 1)).not.toThrow();
    });

    it('should validate inline declarations without curly braces', () => {
      const inlineInstance = `
instance alice : User
instance bob : User
alice -> bob : friends
      `;
      expect(() => validateInstanceBlock(inlineInstance, 'test.md', 1)).not.toThrow();
    });

    it('should throw if an attribute is declared outside an object block', () => {
      const badAttr = `
id = 101
      `;
      expect(() => validateInstanceBlock(badAttr, 'test.md', 1)).toThrow('must be inside an object/instance block');
    });

    it('should throw if an object block is not closed', () => {
      const unclosedBlock = `
instance alice : User {
  id = 101
      `;
      expect(() => validateInstanceBlock(unclosedBlock, 'test.md', 1)).toThrow('was not closed with a matching "}"');
    });

    it('should throw if there is unrecognized line syntax', () => {
      const unrecognizedLine = `
instanceDiagram
this is not valid syntax at all
      `;
      expect(() => validateInstanceBlock(unrecognizedLine, 'test.md', 1)).toThrow('Unrecognized line syntax');
    });
  });

  describe('validateMarkdownVideoBlocks Integration', () => {
    it('should validate valid mixed blocks in markdown correctly', () => {
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
      expect(() => validateMarkdownVideoBlocks('test-file.md', mixedMarkdown)).not.toThrow();
    });

    it('should capture errors in nested data model snippet blocks', () => {
      const badSnippetMarkdown = `
\`\`\`data-model-snippet
classes:
  - "Kaava"
\`\`\`
      `;
      expect(() => validateMarkdownVideoBlocks('test-file.md', badSnippetMarkdown)).toThrow('missing the required "modelId" parameter');
    });

    it('should capture errors in nested instance blocks', () => {
      const badInstanceMarkdown = `
\`\`\`instance
instance alice : User {
  id = 101
%% missing closing brace
\`\`\`
      `;
      expect(() => validateMarkdownVideoBlocks('test-file.md', badInstanceMarkdown)).toThrow('was not closed with a matching "}"');
    });
  });

  describe('test-content files validation (when CONTENT_MODE=test)', () => {
    it('should validate markdown files from test-content folder if they exist', () => {
      const testContentDir = path.join(process.cwd(), 'test-content');
      if (fs.existsSync(testContentDir)) {
        const postsDir = path.join(testContentDir, 'posts');
        if (fs.existsSync(postsDir)) {
          const files = fs.readdirSync(postsDir);
          for (const file of files) {
            if (file.endsWith('.md')) {
              const fullPath = path.join(postsDir, file);
              const rawContent = fs.readFileSync(fullPath, 'utf-8');
              expect(() => validateMarkdownVideoBlocks(fullPath, rawContent)).not.toThrow();
            }
          }
        }
      }
    });
  });
});
