import fs from 'fs';
import path from 'path';
import { parseFrontmatter } from './frontmatter.js';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { PROJECT_CONFIG } from '../project.config.js';
import { CONFIG } from '../src/config.js';
import { getTranslations } from '../src/i18n/index.js';
import { getFilesRecursive, escapeXml, validateMarkdownVideoBlocks } from './content-utils.js';
import { LocalFileDataModelAccess } from '../src/lib/local-data-model-access.js';
import { convertDataModelDiagramsToMermaid } from '../src/lib/data-model-diagram-generator.js';
import { parseModelId } from '../src/lib/data-model-utils.js';
import { PostData, PageData, AuthorData } from '@/src/lib/blog.js';

dotenv.config();

const useTestContent = process.env.CONTENT_MODE === 'test' || process.env.CONTENT_MODE === 'dev/test' || process.env.CONTENT_MODE === 'dev';
const REPO_OWNER = PROJECT_CONFIG.repoOwner;
const REPO_NAME = PROJECT_CONFIG.repoName;
const CONTENT_DIR = useTestContent
  ? path.join(process.cwd(), 'test-content')
  : path.join(process.cwd(), 'content');
const PUBLIC_DIR = process.env.CONTENT_MODE === 'test'
  ? path.join(process.cwd(), 'test-public')
  : path.join(process.cwd(), 'public');
const RESOURCES_DIR = path.join(process.cwd(), 'src', 'resources');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

interface GitCommitInfo {
  hash: string;
  date: string;
  message: string;
}

export function getGitHistoryOfContent(): Record<string, GitCommitInfo[]> {
  const historyMap: Record<string, GitCommitInfo[]> = {};
  if (!fs.existsSync(path.join(process.cwd(), '.git'))) {
    console.log('Skipping git history: No .git directory found.');
    return historyMap;
  }
  try {
    const dirToLog = process.env.CONTENT_MODE === 'test' || process.env.CONTENT_MODE === 'dev/test' || process.env.CONTENT_MODE === 'dev' ? 'test-content' : 'content';
    const output = execSync(`git log --name-status --pretty=format:"COMMIT:%H|%aI|%s" -- "${dirToLog}"`, {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    });
    const lines = output.split('\n');
    let currentCommit: GitCommitInfo | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('COMMIT:')) {
        const parts = trimmed.substring(7).split('|');
        const hash = parts[0] || '';
        const date = parts[1] || '';
        const message = parts.slice(2).join('|') || '';
        currentCommit = { hash, date, message };
      } else if (currentCommit) {
        // Line e.g. "M\tcontent/posts/..."
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const status = parts[0];
          const filePath = parts[1].replace(/\\/g, '/');
          if (!historyMap[filePath]) {
            historyMap[filePath] = [];
          }
          historyMap[filePath].push(currentCommit);
        }
      }
    }
  } catch (err) {
    console.log('Skipping git history: Unable to run git log.');
  }
  return historyMap;
}

export function loadAndParsePosts(postsDir: string, now: Date = new Date()): PostData[] {
  if (!fs.existsSync(postsDir)) {
    console.warn(`Warning: Posts directory does not exist at ${postsDir}`);
    return [];
  }
  const postFiles = getFilesRecursive(postsDir);
  const allPosts: PostData[] = postFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    validateMarkdownVideoBlocks(path.join(postsDir, file), content);
    const { data, content: textContent } = parseFrontmatter(content);
    if (!data.title) {
      console.warn(`Warning: Post in "${file}" has missing or empty "title" metadata.`);
    }
    return {
      slug,
      category: data.category || 'journal',
      title: data.title || '',
      excerpt: data.excerpt || '',
      date: data.date || '',
      dateLabel: data.dateLabel || '',
      author: data.author || '',
      authorSlug: data.authorSlug || '',
      tags: data.tags || [],
      coverImage: data.coverImage || '',
      publishDate: data.publishDate || null,
      draft: data.draft === true || data.draft === 'true',
      file: file.replace(/\\/g, '/'),
      promotional: typeof data.promotional === 'boolean' ? data.promotional : (data.promotional === 'true' ? true : (typeof data.promotional === 'string' && data.promotional.trim().length > 0 && data.promotional !== 'false')),
      partner: data.partner || (typeof data.promotional === 'string' && data.promotional !== 'true' && data.promotional !== 'false' ? data.promotional : undefined),
      callToAction: data.callToAction || undefined,
      content: textContent,
    } as PostData;
  });

  return allPosts.filter(post => {
    if (post.draft) return false;
    if (!post.publishDate) return true;
    return now >= new Date(post.publishDate);
  });
}

export function loadAndParsePages(pagesDir: string): PageData[] {
  if (!fs.existsSync(pagesDir)) {
    console.warn(`Warning: Pages directory does not exist at ${pagesDir}`);
    return [];
  }
  const pageFiles = getFilesRecursive(pagesDir);
  const allPages: PageData[] = pageFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
    validateMarkdownVideoBlocks(path.join(pagesDir, file), content);
    const { data, content: textContent } = parseFrontmatter(content);
    if (!data.title) {
      console.warn(`Warning: Page in "${file}" has missing or empty "title" metadata.`);
    }
    return {
      slug,
      title: data.title || slug,
      tags: data.tags || [],
      draft: data.draft === true || data.draft === 'true',
      file: file.replace(/\\/g, '/'),
      partner: data.partner || undefined,
      content: textContent,
    } as PageData;
  });

  return allPages.filter(page => !page.draft);
}

export function loadAndParseAuthors(authorsDir: string): AuthorData[] {
  if (!fs.existsSync(authorsDir)) {
    console.warn(`Warning: Authors directory does not exist at ${authorsDir}`);
    return [];
  }
  const authorFiles = getFilesRecursive(authorsDir);
  const allAuthors: AuthorData[] = authorFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(authorsDir, file), 'utf-8');
    const { data, content: textContent } = parseFrontmatter(content);
    return {
      slug,
      name: data.name || '',
      title: data.title || '',
      company: data.company || '',
      image: data.image || '',
      shortBio: data.shortBio || '',
      social: data.social || {},
      skills: data.skills || [],
      file: file.replace(/\\/g, '/'),
      ...data,
      draft: data.draft === true || data.draft === 'true',
      content: textContent
    } as AuthorData;
  });

  return allAuthors.filter(author => !author.draft);
}

export function generateTagIndex(posts: PostData[], pages: PageData[]): Record<string, { posts: string[], pages: string[] }> {
  const tagIndex: Record<string, { posts: string[], pages: string[] }> = {};

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(post => {
    (post.tags || []).forEach((tag: string) => {
      const normalizedTag = tag.toLowerCase().trim();
      if (!tagIndex[normalizedTag]) tagIndex[normalizedTag] = { posts: [], pages: [] };
      tagIndex[normalizedTag].posts.push(post.slug);
    });
  });

  pages.forEach(page => {
    (page.tags || []).forEach((tag: string) => {
      const normalizedTag = tag.toLowerCase().trim();
      if (!tagIndex[normalizedTag]) tagIndex[normalizedTag] = { posts: [], pages: [] };
      tagIndex[normalizedTag].pages.push(page.slug);
    });
  });

  return tagIndex;
}

export function copyContentConfig(contentDir: string, outputDir: string): void {
  const configPath = fs.existsSync(path.join(contentDir, 'content-config.json'))
    ? path.join(contentDir, 'content-config.json')
    : path.join(process.cwd(), 'content', 'content-config.json');

  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    fs.writeFileSync(path.join(outputDir, 'content-config.json'), configData, 'utf-8');
  }
}

export async function generateIndividualContentFiles(
  posts: PostData[],
  pages: PageData[],
  authors: AuthorData[],
  contentOutDir: string,
  dataAccess: LocalFileDataModelAccess
): Promise<void> {
  const POST_JSON_OUT_DIR = path.join(contentOutDir, 'posts');
  const PAGE_JSON_OUT_DIR = path.join(contentOutDir, 'pages');
  const AUTHOR_JSON_OUT_DIR = path.join(contentOutDir, 'authors');
  const POST_ALT_OUT_DIR = path.join(contentOutDir, '..', 'blog');
  const AUTHOR_ALT_OUT_DIR = path.join(contentOutDir, '..', 'author');
  const PAGE_ALT_OUT_DIR = path.join(contentOutDir, '..');

  [POST_JSON_OUT_DIR, PAGE_JSON_OUT_DIR, AUTHOR_JSON_OUT_DIR, POST_ALT_OUT_DIR, AUTHOR_ALT_OUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  for (const post of posts) {
    if (post.content && post.content.includes('```data-model-snippet')) {
      post.content = await convertDataModelDiagramsToMermaid(post.content, dataAccess);
    }
    const outPath = path.join(POST_JSON_OUT_DIR, `${post.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(post, null, 2),
      'utf-8'
    );

    const markdownOutPath = path.join(POST_ALT_OUT_DIR, `${post.slug}.md`);
    let markdownContent = '# ' + post.title + '\n\n';
    markdownContent += post.content;
    fs.writeFileSync(
      markdownOutPath,
      markdownContent,
      'utf-8'
    );
  }

  for (const page of pages) {
    if (page.content && page.content.includes('```data-model-snippet')) {
      page.content = await convertDataModelDiagramsToMermaid(page.content, dataAccess);
    }
    const outPath = path.join(PAGE_JSON_OUT_DIR, `${page.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(page, null, 2),
      'utf-8'
    );

    const markdownOutPath = path.join(PAGE_ALT_OUT_DIR, `${page.slug}.md`);
    let markdownContent = '# ' + page.title + '\n\n';
    markdownContent += page.content;
    fs.writeFileSync(
      markdownOutPath,
      markdownContent,
      'utf-8'
    );
  }

  authors.forEach(author => {
    const outPath = path.join(AUTHOR_JSON_OUT_DIR, `${author.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify(author, null, 2),
      'utf-8'
    );

    const markdownOutPath = path.join(AUTHOR_ALT_OUT_DIR, `${author.slug}.md`);
    let markdownContent = '# ' + author.title + '\n\n';
    markdownContent += author.content;
    fs.writeFileSync(
      markdownOutPath,
      markdownContent,
      'utf-8'
    );
  });
}

export function generateSitemaps(
  posts: PostData[],
  pages: PageData[],
  publicDir: string,
  baseUrl: string,
  codelistsIndex?: any[],
  modelsIndex?: any[]
): void {
  if (CONFIG.prelaunch) {
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- PRE-LAUNCH STATE: Search engines and AI crawlers are denied access. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
    fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap, 'utf-8');
    console.log('Generated prelaunch sitemap.xml');
    return;
  }

  // Generate sitemap-base.xml containing home, page, and post URLs
  const sitemapBaseXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <priority>1.0</priority>
  </url>
${pages.map(page => `  <url>
    <loc>${baseUrl}/${page.slug}</loc>
    <priority>0.8</priority>
  </url>`).join('\n')}
${posts.map(post => `  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.date ? new Date(post.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
  fs.writeFileSync(path.join(publicDir, 'sitemap-base.xml'), sitemapBaseXml, 'utf-8');
  console.log('Generated sitemap-base.xml');

  // Load data models and codelists indexes if not provided to generate model-specific sitemaps
  let loadedModelsIndex = modelsIndex;
  let loadedCodelistsIndex = codelistsIndex;

  if (!loadedModelsIndex) {
    try {
      const modelsIndexFile = path.join(publicDir, 'data', 'suomi.fi', 'tietomallit', 'index.json');
      if (fs.existsSync(modelsIndexFile)) {
        const content = fs.readFileSync(modelsIndexFile, 'utf-8');
        if (content && content.trim()) {
          loadedModelsIndex = JSON.parse(content);
        }
      }
    } catch (err) {
      console.warn('Could not load or parse data models index:', err);
    }
  }

  if (!loadedCodelistsIndex) {
    try {
      const codelistsIndexFile = path.join(publicDir, 'data', 'suomi.fi', 'koodistot', 'index.json');
      if (fs.existsSync(codelistsIndexFile)) {
        const content = fs.readFileSync(codelistsIndexFile, 'utf-8');
        if (content && content.trim()) {
          loadedCodelistsIndex = JSON.parse(content);
        }
      }
    } catch (err) {
      console.warn('Could not load or parse codelists index:', err);
    }
  }

  const modelSitemaps: { fileName: string; url: string }[] = [];

  if (Array.isArray(loadedModelsIndex)) {
    // Group valid versions by modelName
    const validModelsByGroup = new Map<string, any[]>();
    for (const model of loadedModelsIndex) {
      if (!model.path) continue;
      if (model.status?.toUpperCase() !== 'VALID') continue;

      const { name: modelName } = parseModelId(model.id || model.path);
      if (!modelName) continue;

      if (!validModelsByGroup.has(modelName)) {
        validModelsByGroup.set(modelName, []);
      }
      validModelsByGroup.get(modelName)!.push(model);
    }

    // Find the latest valid version for each model group and generate its sitemap
    for (const [modelName, models] of validModelsByGroup.entries()) {
      // Sort models by version descending (so models[0] is the latest)
      models.sort((a, b) => {
        const versionA = a.version || parseModelId(a.id || a.path).version || '1.0.0';
        const versionB = b.version || parseModelId(b.id || b.path).version || '1.0.0';
        const partsA = versionA.split('.').map(Number);
        const partsB = versionB.split('.').map(Number);
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const valA = partsA[i] || 0;
          const valB = partsB[i] || 0;
          if (valA !== valB) return valB - valA;
        }
        return 0;
      });

      const model = models[0];
      try {
        const { version: parsedVersion } = parseModelId(model.id || model.path);
        const modelVersion = model.version || parsedVersion || '1.0.0';

        const modelFilePath = path.join(publicDir, 'data', 'suomi.fi', 'tietomallit', model.path);
        if (fs.existsSync(modelFilePath)) {
          const content = fs.readFileSync(modelFilePath, 'utf-8');
          if (content && content.trim()) {
            const modelData = JSON.parse(content);
            const classesList: string[] = [];
            const codelistsList: string[] = [];

            if (Array.isArray(modelData.classes)) {
              // Collect classes
              modelData.classes.forEach((cls: any) => {
                if (cls.technicalName) {
                  classesList.push(cls.technicalName);
                }
              });

              // Collect used codelists
              const usedCodelistUris = new Set<string>();
              modelData.classes.forEach((cls: any) => {
                if (Array.isArray(cls.codelists)) {
                  cls.codelists.forEach((uri: any) => {
                    if (typeof uri === 'string') usedCodelistUris.add(uri);
                  });
                }
                if (Array.isArray(cls.attributes)) {
                  cls.attributes.forEach((attr: any) => {
                    if (Array.isArray(attr.codelist)) {
                      attr.codelist.forEach((uri: any) => {
                        if (typeof uri === 'string') usedCodelistUris.add(uri);
                      });
                    }
                  });
                }
              });

              if (Array.isArray(loadedCodelistsIndex)) {
                loadedCodelistsIndex.forEach((c: any) => {
                  if (c.uri && usedCodelistUris.has(c.uri)) {
                    const techName = c.uri.split('/').pop()?.split(':').pop() || '';
                    if (techName) {
                      codelistsList.push(techName);
                    }
                  }
                });
              }
            }

            // Generate separate sitemap content
            const modelSitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/data-model/${modelName}?version=${modelVersion}</loc>
    <priority>0.7</priority>
  </url>
${classesList.map(cls => `  <url>
    <loc>${baseUrl}/data-model/${modelName}?version=${modelVersion}&amp;class=${cls}</loc>
    <priority>0.6</priority>
  </url>`).join('\n')}
${codelistsList.map(code => `  <url>
    <loc>${baseUrl}/data-model/${modelName}?version=${modelVersion}&amp;codelist=${code}</loc>
    <priority>0.5</priority>
  </url>`).join('\n')}
</urlset>`;

            const sitemapFileName = `sitemap-model-${modelName}-${modelVersion}.xml`;
            fs.writeFileSync(path.join(publicDir, sitemapFileName), modelSitemapXml, 'utf-8');
            console.log(`Generated model-specific sitemap: ${sitemapFileName}`);
            modelSitemaps.push({
              fileName: sitemapFileName,
              url: `${baseUrl}/${sitemapFileName}`
            });
          }
        }
      } catch (err) {
        console.warn(`Could not generate sitemap for model ${model.path}:`, err);
      }
    }
  }

  // Generate sitemap index file at sitemap.xml
  const todayStr = new Date().toISOString().split('T')[0];
  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${baseUrl}/sitemap-base.xml</loc>
    <lastmod>${todayStr}</lastmod>
  </sitemap>
${modelSitemaps.map(ms => `  <sitemap>
    <loc>${ms.url}</loc>
    <lastmod>${todayStr}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapIndexXml, 'utf-8');
  console.log(`Generated sitemap.xml index with ${modelSitemaps.length} model sitemaps linked`);
}

export function generateRobotsTxt(publicDir: string, baseUrl: string): void {
  let robotsTxt = '';
  if (CONFIG.prelaunch) {
    robotsTxt = 'User-agent: *\nDisallow: /';
  } else {
    robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml`;
  }
  fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt, 'utf-8');
  console.log(`Generated robots.txt (${CONFIG.prelaunch ? 'prelaunch' : 'public'})`);
}

export function updateIndexHtmlRobots(indexPath: string): void {
  if (fs.existsSync(indexPath)) {
    let indexHtml = fs.readFileSync(indexPath, 'utf-8');
    const robotsPrelaunch = '<meta name="robots" content="noindex, nofollow" />';
    const robotsPublic = '<meta name="robots" content="index, follow" />';
    
    if (CONFIG.prelaunch) {
      if (indexHtml.includes(robotsPublic)) {
        indexHtml = indexHtml.replace(robotsPublic, robotsPrelaunch);
      } else if (!indexHtml.includes(robotsPrelaunch)) {
        indexHtml = indexHtml.replace('<head>', `<head>\n    ${robotsPrelaunch}`);
      }
    } else {
      if (indexHtml.includes(robotsPrelaunch)) {
        indexHtml = indexHtml.replace(robotsPrelaunch, robotsPublic);
      } else if (!indexHtml.includes(robotsPublic)) {
        indexHtml = indexHtml.replace('<head>', `<head>\n    ${robotsPublic}`);
      }
    }
    fs.writeFileSync(indexPath, indexHtml, 'utf-8');
    console.log(`Updated index.html robots meta to: ${CONFIG.prelaunch ? 'noindex, nofollow' : 'index, follow'}`);
  }
}

export function generateLlmsFiles(posts: PostData[], pages: PageData[], publicDir: string, baseUrl: string, t: any): void {
  // Generate llms.txt
  let llmsTxt = '';
  if (CONFIG.prelaunch) {
    llmsTxt += `> [!IMPORTANT]\n> This is a PRE-LAUNCH DRAFT version of the site content. Not for public indexing.\n\n`;
  }
  llmsTxt += `# ${t.common.footerTitle}\n\n`;
  llmsTxt += `${t.llms.note}\n\n`;
  llmsTxt += `${t.hero.description}.\n\n`;
  
  llmsTxt += `## ${t.llms.links}\n`;
  llmsTxt += `- [${t.navigation.githubRepo}](https://github.com/${REPO_OWNER}/${REPO_NAME})\n`;
  llmsTxt += `- [Sitemap](${baseUrl}/sitemap.xml)\n\n`;
  
  llmsTxt += `## ${t.llms.articlesFeatured}\n`;
  const featuredPosts = posts.slice(0, 5);
  featuredPosts.forEach(post => {
    let line = `- [${post.title}](${baseUrl}/blog/${post.slug}) - [Raw Markdown](${baseUrl}/blog/${post.slug}.md)`;
    if (post.promotional) {
      line += ` [PROMOTIONAL / KAUPALLINEN YHTEISTYÖ: ${post.partner || ''}]`;
    }
    llmsTxt += line + '\n';
  });
  llmsTxt += `\n`;
  
  llmsTxt += `## ${t.llms.pages}\n`;
  pages.forEach(page => {
    llmsTxt += `- [${page.title}](${baseUrl}/${page.slug}) - [Raw Markdown](${baseUrl}/${page.slug}.md)\n`;
  });
  llmsTxt += `\n`;
  
  llmsTxt += `## ${t.llms.optional}\n`;
  llmsTxt += `${t.llms.fullIndexNote.replace('${baseUrl}', baseUrl)}\n`;
  
  fs.writeFileSync(path.join(publicDir, 'llms.txt'), llmsTxt, 'utf-8');
  console.log('Generated llms.txt');
  
  // Generate llms-full.txt
  let llmsFullTxt = '';
  if (CONFIG.prelaunch) {
    llmsFullTxt += `> [!IMPORTANT]\n> This is a PRE-LAUNCH DRAFT version of the site content. Not for public indexing.\n\n`;
  }
  llmsFullTxt += `# ${t.common.footerTitle} - ${t.llms.fullIndexTitle}\n\n`;
  llmsFullTxt += `${t.llms.note}\n\n`;
  llmsFullTxt += `${t.llms.fullIndexDescription}\n\n`;
  
  llmsFullTxt += `## ${t.llms.articles}\n`;
  posts.forEach(post => {
    let line = `- [${post.title}](${baseUrl}/blog/${post.slug}) - [Raw Markdown](${baseUrl}/blog/${post.slug}.md)`;
    if (post.promotional) {
      line += ` [PROMOTIONAL / KAUPALLINEN YHTEISTYÖ: ${post.partner || ''}]`;
    }
    llmsFullTxt += line + '\n';
  });
  llmsFullTxt += `\n`;
  
  llmsFullTxt += `## ${t.llms.pages}\n`;
  pages.forEach(page => {
    llmsFullTxt += `- [${page.title}](${baseUrl}/${page.slug}) - [Raw Markdown](${baseUrl}/${page.slug}.md)\n`;
  });

  fs.writeFileSync(path.join(publicDir, 'llms-full.txt'), llmsFullTxt, 'utf-8');
  console.log('Generated llms-full.txt');
}

export function generateRssFeed(
  posts: PostData[],
  historyMap: Record<string, GitCommitInfo[]>,
  useTestContent: boolean,
  publicDir: string,
  baseUrl: string,
  t: any
): void {
  // Generate RSS 2.0 Feed for the 50 latest created or updated journal (blog) posts.
  const journalPostsOnly = posts.filter(post => post.category === 'journal');

  const postsWithGitDates = journalPostsOnly.map(post => {
    const filePath = `${useTestContent ? 'test-content' : 'content'}/posts/${post.file}`;
    const fileCommits = historyMap[filePath] || [];

    let createdDate = post.date || post.publishDate || '';
    let updatedDate = post.date || post.publishDate || '';
    let lastCommitMessage = '';
    let lastCommitHash = '';

    if (fileCommits.length > 0) {
      updatedDate = fileCommits[0].date;
      createdDate = fileCommits[fileCommits.length - 1].date;
      lastCommitMessage = fileCommits[0].message;
      lastCommitHash = fileCommits[0].hash;
    }

    if (!createdDate) {
      createdDate = new Date().toISOString();
    }
    if (!updatedDate) {
      updatedDate = createdDate;
    }

    return {
      post,
      createdDate,
      updatedDate,
      lastCommitMessage,
      lastCommitHash
    };
  });

  // Sort by updatedDate descending (newest activity first)
  postsWithGitDates.sort((a, b) => new Date(b.updatedDate).getTime() - new Date(a.updatedDate).getTime());

  // Take top 50
  const latestPostsForFeed = postsWithGitDates.slice(0, 50);

  const channelUrl = baseUrl;
  const feedUrl = `${baseUrl}/feed.xml`;

  let rssItemsXml = '';
  latestPostsForFeed.forEach(({ post, createdDate, updatedDate, lastCommitMessage, lastCommitHash }) => {
    const postUrl = `${baseUrl}/blog/${post.slug}`;
    const pubDateRfc822 = new Date(updatedDate).toUTCString();

    let displayTitle = post.title;
    let descriptionText = post.excerpt || '';

    if (post.promotional) {
      const partnerName = post.partner || '';
      displayTitle = `[Kaupallinen yhteistyö - ${partnerName}] ${displayTitle}`;
      const promoNotice = `Tämä kirjoitus on osa kaupallista yhteistyötä Kaavatietomalli.fi-sivuston ja ${partnerName}:n välillä. / This is sponsored promotional content in co-operation with ${partnerName}.`;
      descriptionText = `(${promoNotice}) ${descriptionText}`;
    }

    const title = escapeXml(displayTitle);
    const excerpt = escapeXml(descriptionText);

    const guid = postUrl;

    const categoriesXml = (post.tags || [])
      .map((tag: string) => `      <category>${escapeXml(tag)}</category>`)
      .join('\n');

    const authorXml = post.author
      ? `      <dc:creator>${escapeXml(post.author)}</dc:creator>`
      : `      <dc:creator>Spatineo Oy</dc:creator>`;

    rssItemsXml += `    <item>
      <title>${title}</title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${guid}</guid>
      <pubDate>${pubDateRfc822}</pubDate>
      <description>${excerpt}</description>
${authorXml}
${categoriesXml ? categoriesXml + '\n' : ''}    </item>\n`;
  });

  const currentRssTime = new Date().toUTCString();
  let rssXml = '';
  if (CONFIG.prelaunch) {
    rssXml = `<?xml version="1.0" encoding="utf-8"?>
<!-- PRE-LAUNCH STATE: Search engines and AI crawlers are denied access. -->
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(t.common.footerTitle)}</title>
    <link>${channelUrl}</link>
    <description>${escapeXml(t.hero.description)}</description>
    <language>fi</language>
    <lastBuildDate>${currentRssTime}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
  </channel>
</rss>`;
  } else {
    rssXml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>${escapeXml(t.common.footerTitle)}</title>
    <link>${channelUrl}</link>
    <description>${escapeXml(t.hero.description)}</description>
    <language>fi</language>
    <lastBuildDate>${currentRssTime}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
${rssItemsXml}  </channel>
</rss>`;
  }

  fs.writeFileSync(path.join(publicDir, 'feed.xml'), rssXml, 'utf-8');
  console.log('Generated feed.xml (RSS 2.0)');
}

export function copyImages(resourcesDir: string, contentDir: string, imagesOutDir: string): void {
  const srcImagesDir = path.join(resourcesDir, 'images');
  if (fs.existsSync(srcImagesDir)) {
    copyFolderRecursiveSync(srcImagesDir, imagesOutDir);
    console.log('Copied resources/images to public/images');
  } else {
    console.warn('resources/images directory not found!');
  }

  const contentImagesDir = path.join(contentDir, 'images');
  if (fs.existsSync(contentImagesDir)) {
    copyFolderRecursiveSync(contentImagesDir, imagesOutDir);
    console.log('Copied content/images to public/images');
  } else {
    console.warn('content/images directory not found!');
  }
}

export function generateBuildVersion(publicDir: string): void {
  const buildVersion = Date.now().toString();
  fs.writeFileSync(path.join(publicDir, 'version.json'), JSON.stringify({ version: buildVersion }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(process.cwd(), 'src', 'version.ts'), `// Generated by generate-assets.ts - do not modify\nexport const BUILD_VERSION = '${buildVersion}';\n`, 'utf-8');
  console.log(`Generated build version: ${buildVersion}`);
}

export interface LoadedContent {
  posts: PostData[];
  pages: PageData[];
  authors: AuthorData[];
}

export function loadAllContent(
  postsDir: string,
  pagesDir: string,
  authorsDir: string,
  now: Date = new Date()
): LoadedContent {
  const posts = loadAndParsePosts(postsDir, now);
  const pages = loadAndParsePages(pagesDir);
  const authors = loadAndParseAuthors(authorsDir);
  return { posts, pages, authors };
}

export function ensureOutputDirectories(contentOutDir: string, imagesOutDir: string): void {
  [contentOutDir, imagesOutDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

export function writeMetadataIndexes(
  posts: PostData[],
  pages: PageData[],
  contentOutDir: string,
  tagIndex: any
): void {
  fs.writeFileSync(
    path.join(contentOutDir, 'tags.json'),
    JSON.stringify(tagIndex, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(contentOutDir, 'posts.json'), 
    JSON.stringify(posts.map(({ content, ...rest }) => rest), null, 2),
    'utf-8'
  );
  
  fs.writeFileSync(
    path.join(contentOutDir, 'pages.json'), 
    JSON.stringify(pages.map(({ content, ...rest }) => rest), null, 2),
    'utf-8'
  );
}

export function runGenerators(
  posts: PostData[],
  pages: PageData[],
  authors: AuthorData[],
  historyMap: Record<string, any>,
  t: any
): void {
  generateSitemaps(posts, pages, PUBLIC_DIR, CONFIG.baseUrl);

  generateRobotsTxt(PUBLIC_DIR, CONFIG.baseUrl);

  const indexPath = path.join(process.cwd(), 'index.html');
  updateIndexHtmlRobots(indexPath);

  generateLlmsFiles(posts, pages, PUBLIC_DIR, CONFIG.baseUrl, t);

  generateRssFeed(posts, historyMap, useTestContent, PUBLIC_DIR, CONFIG.baseUrl, t);

  const IMAGES_OUT_DIR = path.join(PUBLIC_DIR, 'images');
  copyImages(RESOURCES_DIR, CONTENT_DIR, IMAGES_OUT_DIR);

  generateBuildVersion(PUBLIC_DIR);
}

export async function generateAssets() {
  const t = getTranslations('fi');
  const historyMap = getGitHistoryOfContent();
  const postsDir = path.join(CONTENT_DIR, 'posts');
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const authorsDir = path.join(CONTENT_DIR, 'authors');

  const now = new Date();
  const { posts, pages, authors } = loadAllContent(postsDir, pagesDir, authorsDir, now);

  const CONTENT_OUT_DIR = path.join(PUBLIC_DIR, 'content');
  const IMAGES_OUT_DIR = path.join(PUBLIC_DIR, 'images');
  ensureOutputDirectories(CONTENT_OUT_DIR, IMAGES_OUT_DIR);

  const tagIndex = generateTagIndex(posts, pages);
  writeMetadataIndexes(posts, pages, CONTENT_OUT_DIR, tagIndex);

  copyContentConfig(CONTENT_DIR, CONTENT_OUT_DIR);

  const dataAccess = new LocalFileDataModelAccess();
  await generateIndividualContentFiles(posts, pages, authors, CONTENT_OUT_DIR, dataAccess);

  console.log('Generated JSON index and individual JSON and Markdown files');

  runGenerators(posts, pages, authors, historyMap, t);
}

function copyFolderRecursiveSync(source: string, target: string) {
  if (!fs.existsSync(target)) {
    fs.mkdirSync(target, { recursive: true });
  }
  const files = fs.readdirSync(source);
  files.forEach(file => {
    const curSource = path.join(source, file);
    const curTarget = path.join(target, file);
    if (fs.lstatSync(curSource).isDirectory()) {
      copyFolderRecursiveSync(curSource, curTarget);
    } else {
      fs.copyFileSync(curSource, curTarget);
    }
  });
}

if (process.env.NODE_ENV !== 'test') {
  generateAssets().catch(err => {
    console.error('Error generating assets:', err);
    process.exit(1);
  });
}
