import fs from "node:fs";
import path from "node:path";
import { Voikko } from "@yongsk0066/voikko";

interface Issue {
  file: string;
  line: number;
  message: string;
  type: "spelling" | "grammar";
}

/**
 * Loads custom ignore list from .voikko-ignore if present
 */
function loadIgnoreList(): Set<string> {
  const ignoreFilePath = path.join(process.cwd(), ".voikko-ignore");
  if (!fs.existsSync(ignoreFilePath)) {
    return new Set();
  }

  const raw = fs.readFileSync(ignoreFilePath, "utf-8");
  return new Set(
    raw
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line.length > 0 && !line.startsWith("#")),
  );
}

/**
 * Cleans a line of Markdown by masking code, URLs, and formatting markers
 * with spaces to preserve character indices for error reporting.
 */
function sanitizeMarkdownLine(line: string): string {
  return (
    line
      // Strip inline code blocks (`code`)
      .replace(/`[^`]+`/g, (m) => " ".repeat(m.length))
      // Strip markdown links [label](url) -> keep label, mask URL
      .replace(/\[([^\]]+)\]\([^)]+\)/g, (_, label) => label)
      // Strip bare URLs
      .replace(/https?:\/\/\S+/g, (m) => " ".repeat(m.length))
      // Strip HTML tags
      .replace(/<[^>]+>/g, (m) => " ".repeat(m.length))
      // Strip Markdown header markers, blockquotes, and list indicators
      .replace(/^(\s*#{1,6}|\s*[*+-]|\s*\d+\.)\s+/, (m) => " ".repeat(m.length))
  );
}

/**
 * Parses command-line arguments to find flags like --dir=... or -d ...
 */
function getTargetDirectory(): string {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Matches --dir=/path/to/docs or --dir /path/to/docs
    if (arg.startsWith('--dir=')) {
      return path.resolve(arg.split('=')[1]);
    }
    if ((arg === '--dir' || arg === '-d') && args[i + 1]) {
      return path.resolve(args[i + 1]);
    }
  }

  // Fallback to current working directory
  return process.cwd();
}

async function validate() {
  const voikko = await Voikko.init();
  const ignoreList = loadIgnoreList();

  let filesToProcess: string[] = [];
  const rawEnvFiles = process.env.ALL_CHANGED_FILES;

  if (rawEnvFiles) {
    // 1. CI mode: Process files from environment variable
    filesToProcess = rawEnvFiles
      .split(/\s+/)
      .map((f) => f.trim())
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  } else {
    // Filter out options/flags from positional CLI arguments
    const cliPositionalArgs = process.argv
      .slice(2)
      .filter((arg, idx, arr) => {
        if (arg.startsWith('-')) return false;
        // Skip argument value if preceding arg was -d or --dir
        if (idx > 0 && (arr[idx - 1] === '--dir' || arr[idx - 1] === '-d')) return false;
        return true;
      });

    if (cliPositionalArgs.length > 0) {
      // 2. Specific files passed directly via arguments
      filesToProcess = cliPositionalArgs;
    } else {
      // 3. Scan specified root directory recursively
      const targetDir = getTargetDirectory();
      console.log(`Scanning root directory: ${targetDir}`);
      filesToProcess = findMarkdownFilesLocally(targetDir);
    }
  }

  if (filesToProcess.length === 0) {
    console.log("No Markdown files to check.");
    process.exit(0);
  }

  const issues: Issue[] = [];

  for (const filePath of filesToProcess) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    let inCodeBlock = false;
    let inFrontmatter = false;

    lines.forEach((rawLine, index) => {
      const lineNum = index + 1;
      const trimmedLine = rawLine.trim();

      // Skip YAML Frontmatter
      if (index === 0 && trimmedLine === "---") {
        inFrontmatter = true;
        return;
      }
      if (inFrontmatter) {
        if (trimmedLine === "---") {
          inFrontmatter = false;
        }
        return;
      }

      // Skip Fenced Code Blocks (```)
      if (trimmedLine.startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return;
      }
      if (inCodeBlock) return;

      const cleanLine = sanitizeMarkdownLine(rawLine);
      if (!cleanLine.trim()) return;

      // ==========================================
      // 1. Voikko Grammar Analysis (Sentence Level)
      // ==========================================
      /*
      const grammarErrors = voikko.grammarErrors(cleanLine);
      for (const gErr of grammarErrors) {
        const description =
          gErr.shortDescription || `Grammar issue (Code ${gErr.code})`;

        issues.push({
          file: filePath,
          line: lineNum,
          message: `[Grammar] ${description}`,
          type: "grammar",
        });
      }
      */

      // ==========================================
      // 2. Voikko Spell Checking (Word Level)
      // ==========================================
      // 1. Normalize line to NFC so 'ä' and 'ö' are single composite characters
      const normalizedLine = cleanLine.normalize('NFC');

      // 2. Extract words using Unicode Letter property \p{L} with unicode flag 'u'
      // This correctly groups letters including ä, ö, å, Ä, Ö, Å and hyphens
      const words = normalizedLine.match(/[\p{L}\-]+/gu) || [];

      for (let word of words) {
        // Strip leading/trailing hyphens from words (e.g. "-sana" -> "sana")
        word = word.replace(/^-+|-+$/g, '');

        // Skip empty strings, short tokens (<= 2 chars), or ALL-CAPS acronyms (e.g., API, PR)
        if (word.length <= 2 || word === word.toUpperCase()) {
          continue;
        }

        // Skip words in custom ignore list
        if (ignoreList.has(word.toLowerCase())) {
          continue;
        }

        // Perform Voikko spellcheck
        if (!voikko.spell(word)) {
          const suggestions = voikko.suggest(word);
          const suggestionText =
            suggestions.length > 0
              ? ` (Did you mean: ${suggestions.slice(0, 3).join(', ')})`
              : '';

          issues.push({
            file: filePath,
            line: lineNum,
            message: `[Spelling] Unknown word "${word}"${suggestionText}`,
            type: 'spelling',
          });
        }
      }
    });
  }

  // ==========================================
  // 3. Reporting Results
  // ==========================================
  if (issues.length === 0) {
    console.log("✅ No Finnish language issues found.");
  } else {
    console.log(`\nFound ${issues.length} potential issue(s):\n`);

    for (const issue of issues) {
      // Formats line as a GitHub Actions PR warning annotation
      console.log(
        `::warning file=${issue.file},line=${issue.line}::${issue.message}`,
      );
    }
  }

  // Always exit with 0 to ensure non-blocking PR status
  process.exit(0);
}

/**
 * Recursively finds all Markdown files in a directory, ignoring node_modules and .git
 */
function findMarkdownFilesLocally(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    if (
      file === "node_modules" ||
      file === ".git" ||
      file === ".next" ||
      file === "dist"
    ) {
      continue;
    }

    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(findMarkdownFilesLocally(filePath));
    } else if (filePath.endsWith(".md") || filePath.endsWith(".mdx")) {
      results.push(filePath);
    }
  }

  return results;
}

validate().catch((err) => {
  console.error("Validation script encountered an error:", err);
  process.exit(0);
});
