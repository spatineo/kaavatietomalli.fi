import fs from "node:fs";
import path from "node:path";
import { Voikko } from "@yongsk0066/voikko";

interface Issue {
  file: string;
  line: number;
  message: string;
  type: "spelling" | "grammar";
  col?: number;
  endColumn?: number;
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
 * Uses Voikko's morphological analyzer to check if an inflected word
 * or compound word derives from a base form in the ignore list.
 */
function isIgnoredByVoikko(word: string, ignoreList: Set<string>, voikko: Voikko): boolean {
  const lowerWord = word.toLowerCase();

  // 1. Direct exact match in ignore list
  if (ignoreList.has(lowerWord)) {
    return true;
  }

  // 2. Morphological Analysis (Lemma & Compound Stems)
  try {
    const analyses = voikko.analyze(word);
    if (analyses && analyses.length > 0) {
      for (const analysis of analyses) {
        // Match baseform (e.g. "kaava" matches "kaavattomilleen")
        if (analysis.BASEFORM && ignoreList.has(analysis.BASEFORM.toLowerCase())) {
          return true;
        }

        // Match individual stems in compound words
        if (analysis.WORDBASES) {
          const parts = analysis.WORDBASES.match(/\+([a-zåäö]+)/gi);
          if (parts) {
            const stems = parts.map((p: string) => p.replace("+", "").toLowerCase());
            if (stems.some((stem: string) => ignoreList.has(stem))) {
              return true;
            }
          }
        }
      }
    }
  } catch {
    // Gracefully handle any analysis errors and fall back to false
  }

  return false;
}

/**
 * Cleans a line of Markdown by replacing code, links, tags, URLs, etc.
 * with SPACES of the EXACT SAME LENGTH to preserve character offsets (1:1 column mapping).
 */
export function sanitizeMarkdownLine(line: string): string {
  let cleaned = line;

  // 1. Strip HTML comments: <!-- ... --> (preserve length)
  cleaned = cleaned.replace(/<!--.*?-->/g, (m) => " ".repeat(m.length));

  // 2. Strip HTML tags: e.g. <br/> (preserve length)
  cleaned = cleaned.replace(/<[^>]+>/g, (m) => " ".repeat(m.length));

  // 3. Strip inline code blocks: `code` (preserve length)
  cleaned = cleaned.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));

  // 4. Strip markdown image tags: ![alt](url) (preserve length)
  cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, (m) => " ".repeat(m.length));

  // 5. Strip markdown links: [label](url) -> keep label, mask brackets and url with spaces of identical length
  cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, label, url) => {
    const suffixLength = match.length - 1 - label.length;
    return " " + label + " ".repeat(suffixLength);
  });

  // 6. Strip bare URLs (preserve length)
  cleaned = cleaned.replace(/https?:\/\/\S+/g, (m) => " ".repeat(m.length));

  // 7. Strip callout headers/tags like [!NOTE] or [Note::Historiallinen huomio] or [HUOMAA] (preserve length)
  cleaned = cleaned.replace(/\[!?([A-Za-zÄÖÅa-zäöå_-]+)(?:::(.+?))?\]/g, (match, type, title) => {
    if (title) {
      const prefixLength = match.indexOf(title);
      const suffixLength = match.length - prefixLength - title.length;
      return " ".repeat(prefixLength) + title + " ".repeat(suffixLength);
    } else {
      return " ".repeat(match.length);
    }
  });

  // 8. Strip emphasis markers: **, *, __, _ (preserve length)
  cleaned = cleaned.replace(/([\*_]{1,3})([^\*_\n]+)([\*_]{1,3})/g, (match, p1, p2, p3) => {
    return " ".repeat(p1.length) + p2 + " ".repeat(p3.length);
  });
  cleaned = cleaned.replace(/[\*_]/g, " ");

  // 9. Strip blockquote characters at the start of the line: e.g. `> ` (preserve length)
  cleaned = cleaned.replace(/^\s*>\s*/, (m) => " ".repeat(m.length));

  // 10. Strip Markdown headers, lists, or number indicators at the start of the line:
  cleaned = cleaned.replace(/^(\s*#{1,6}|\s*[*+-]|\s*\d+\.)\s+/, (m) => " ".repeat(m.length));

  return cleaned;
}

export interface GrammarMapping {
  grammarText: string;
  indexMap: number[];
}

/**
 * Collapses whitespace for Voikko grammar checker, returning a clean sentence
 * along with a source mapping array to trace indices back to the original line.
 */
export function buildGrammarMapping(preservedLine: string): GrammarMapping {
  let grammarText = "";
  const indexMap: number[] = [];
  
  let lastWasSpace = true;
  
  for (let i = 0; i < preservedLine.length; i++) {
    const char = preservedLine[i];
    const isSpace = /\s/.test(char);
    
    if (isSpace) {
      if (!lastWasSpace) {
        grammarText += " ";
        indexMap.push(i);
        lastWasSpace = true;
      }
    } else {
      if (/[:,;\.!\?]/.test(char) && lastWasSpace && grammarText.length > 0) {
        if (grammarText[grammarText.length - 1] === " ") {
          grammarText = grammarText.slice(0, -1);
          indexMap.pop();
        }
      }
      grammarText += char;
      indexMap.push(i);
      lastWasSpace = false;
    }
  }
  
  while (grammarText.endsWith(" ")) {
    grammarText = grammarText.slice(0, -1);
    indexMap.pop();
  }
  
  return { grammarText, indexMap };
}

/**
 * Checks if grammar checking should be skipped for a given original line.
 */
export function isGrammarCheckSkipped(rawLine: string): boolean {
  const trimmed = rawLine.trim();

  if (!trimmed) {
    return true;
  }

  if (/^\s*#{1,6}(?:\s+|$)/.test(trimmed)) {
    return true;
  }

  if (/^\s*([*+-]|\d+\.)\s/.test(trimmed)) {
    return true;
  }

  if (trimmed.startsWith("|")) {
    return true;
  }

  if (/^\s*>\s*\[!?([A-Za-zÄÖÅa-zäöå_-]+)(?:::(.+?))?\]\s*$/.test(trimmed)) {
    return true;
  }

  // 6. Skip lines that are purely code, HTML tags, or URLs
  if (/^<[^>]+>$/.test(trimmed) || /^https?:\/\/\S+$/.test(trimmed)) {
    return true;
  }

  return false;
}

/**
 * Parses command-line arguments to find flags like --dir=... or -d ...
 */
function getTargetDirectory(): string {
  const args = process.argv.slice(2);

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--dir=')) {
      return path.resolve(arg.split('=')[1]);
    }
    if ((arg === '--dir' || arg === '-d') && args[i + 1]) {
      return path.resolve(args[i + 1]);
    }
  }

  return process.cwd();
}

async function validate() {
  const voikko: Voikko = await Voikko.init();
  const ignoreList = loadIgnoreList();

  let filesToProcess: string[] = [];
  const rawEnvFiles = process.env.ALL_CHANGED_FILES;

  if (rawEnvFiles) {
    filesToProcess = rawEnvFiles
      .split(/\s+/)
      .map((f) => f.trim())
      .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
  } else {
    const cliPositionalArgs = process.argv
      .slice(2)
      .filter((arg, idx, arr) => {
        if (arg.startsWith('-')) return false;
        if (idx > 0 && (arr[idx - 1] === '--dir' || arr[idx - 1] === '-d')) return false;
        return true;
      });

    if (cliPositionalArgs.length > 0) {
      filesToProcess = cliPositionalArgs;
    } else {
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
      if (!isGrammarCheckSkipped(rawLine)) {
        const { grammarText, indexMap } = buildGrammarMapping(cleanLine);
        
        if (grammarText.trim()) {
          const grammarErrors = voikko.grammarErrors(grammarText);
          for (const gErr of grammarErrors) {
            const description =
              gErr.shortDescription || `Grammar issue (Code ${gErr.errorCode})`;

            const startIdxInClean = gErr.startPos;
            const endIdxInClean = gErr.startPos + gErr.errorLen - 1;

            const startPosOriginal = indexMap[startIdxInClean];
            const endPosOriginal = indexMap[endIdxInClean];

            if (startPosOriginal !== undefined && endPosOriginal !== undefined) {
              issues.push({
                file: filePath,
                line: lineNum,
                message: `[Grammar] ${description}`,
                type: "grammar",
                col: startPosOriginal + 1,
                endColumn: endPosOriginal + 1
              });
            } else {
              issues.push({
                file: filePath,
                line: lineNum,
                message: `[Grammar] ${description}`,
                type: "grammar",
              });
            }
          }
        }
      }

      // ==========================================
      // 2. Voikko Spell Checking (Word Level)
      // ==========================================
      const normalizedLine = cleanLine.normalize('NFC');
      const wordRegex = /[\p{L}\-]+/gu;
      let match;

      while ((match = wordRegex.exec(normalizedLine)) !== null) {
        const word = match[0];
        const startPos = match.index;
        const endPos = startPos + word.length;

        const leadingHyphens = word.match(/^-*/)?.[0].length || 0;
        const trailingHyphens = word.match(/-*$/)?.[0].length || 0;

        const trimmedWord = word.replace(/^-+|-+$/g, '');
        if (!trimmedWord) continue;

        const wordStartPos = startPos + leadingHyphens;
        const wordEndPos = endPos - trailingHyphens;

        if (trimmedWord.length <= 2 || trimmedWord === trimmedWord.toUpperCase()) {
          continue;
        }

        // Morphological Ignore Check: Matches exact word, inflections, or compound roots
        if (isIgnoredByVoikko(trimmedWord, ignoreList, voikko)) {
          continue;
        }

        if (!voikko.spell(trimmedWord)) {
          const suggestions = voikko.suggest(trimmedWord);
          const suggestionText =
            suggestions.length > 0
              ? ` (Did you mean: ${suggestions.slice(0, 3).join(', ')})`
              : '';

          issues.push({
            file: filePath,
            line: lineNum,
            message: `[Spelling] Unknown word "${trimmedWord}"${suggestionText}`,
            type: 'spelling',
            col: wordStartPos + 1,
            endColumn: wordEndPos
          });
        }
      }
    });
  }

  if (issues.length === 0) {
    console.log("✅ No Finnish language issues found.");
  } else {
    console.log(`\nFound ${issues.length} potential issue(s):\n`);

    for (const issue of issues) {
      const colAttr = issue.col !== undefined ? `,col=${issue.col}` : '';
      const endColAttr = issue.endColumn !== undefined ? `,endColumn=${issue.endColumn}` : '';
      console.log(
        `::warning file=${issue.file},line=${issue.line}${colAttr}${endColAttr}::${issue.message}`,
      );
    }
  }

  process.exit(0);
}

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