import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { PROJECT_CONFIG } from '../project.config.js';
import { CONFIG } from '../src/config.js';
import { getTranslations } from '../src/i18n/index.js';
import { getFilesRecursive, escapeXml, validateMarkdownVideoBlocks } from './content-utils.js';
import { LocalFileDataModelAccess } from '../src/lib/local-data-model-access.js';
import { convertDataModelDiagramsToMermaid } from '../src/lib/data-model-diagram-generator.js';

dotenv.config();

const useTestContent = process.env.CONTENT_MODE === 'test' || process.env.CONTENT_MODE === 'dev/test' || process.env.CONTENT_MODE === 'dev';
const BASE_URL = (process.env.VITE_BASE_URL || process.env.APP_URL || PROJECT_CONFIG.defaultBaseUrl).replace(/\/$/, '');
const REPO_OWNER = PROJECT_CONFIG.repoOwner;
const REPO_NAME = PROJECT_CONFIG.repoName;
const RAW_GITHUB_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/refs/heads/main/${useTestContent ? 'test-content' : 'content'}`;
const CONTENT_DIR = useTestContent
  ? path.join(process.cwd(), 'test-content')
  : path.join(process.cwd(), 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

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

// Removed duplicate escapeXml and getFilesRecursive; now loaded from content-utils.js

export async function generateAssets() {
  const t = getTranslations('fi');
  const historyMap = getGitHistoryOfContent();
  const postsDir = path.join(CONTENT_DIR, 'posts');
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const authorsDir = path.join(CONTENT_DIR, 'authors');

  if (!fs.existsSync(postsDir)) {
    console.warn(`Warning: Posts directory does not exist at ${postsDir}`);
  }
  if (!fs.existsSync(pagesDir)) {
    console.warn(`Warning: Pages directory does not exist at ${pagesDir}`);
  }
  if (!fs.existsSync(authorsDir)) {
    console.warn(`Warning: Authors directory does not exist at ${authorsDir}`);
  }

  const postFiles = getFilesRecursive(postsDir);
  const pageFiles = getFilesRecursive(pagesDir);
  const authorFiles = getFilesRecursive(authorsDir);

  const now = new Date();

  const allPosts = postFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    validateMarkdownVideoBlocks(path.join(postsDir, file), content);
    const { data, content: textContent } = matter(content);
    if (!data.title) {
      console.warn(`Warning: Post in "${file}" has missing or empty "title" metadata.`);
    }
    return {
      metadata: {
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
        callToAction: data.callToAction || undefined
      },
      content: textContent,
      file: file.replace(/\\/g, '/')
    };
  });

  const posts = allPosts.filter(post => {
    if (post.metadata.draft) return false;
    if (!post.metadata.publishDate) return true;
    return now >= new Date(post.metadata.publishDate);
  });

  const allPages = pageFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
    validateMarkdownVideoBlocks(path.join(pagesDir, file), content);
    const { data, content: textContent } = matter(content);
    if (!data.title) {
      console.warn(`Warning: Page in "${file}" has missing or empty "title" metadata.`);
    }
    return {
      metadata: {
        slug,
        title: data.title || slug,
        tags: data.tags || [],
        draft: data.draft === true || data.draft === 'true',
        file: file.replace(/\\/g, '/'),
        partner: data.partner || undefined
      },
      content: textContent,
      file: file.replace(/\\/g, '/')
    };
  });

  const pages = allPages.filter(page => !page.metadata.draft);

  const allAuthors = authorFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(authorsDir, file), 'utf-8');
    const { data, content: textContent } = matter(content);
    return {
      metadata: {
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
        draft: data.draft === true || data.draft === 'true'
      },
      content: textContent
    };
  });

  const authors = allAuthors.filter(author => !author.metadata.draft);

  // Generate JSONP index files (Metadata only)
  const CONTENT_OUT_DIR = path.join(PUBLIC_DIR, 'content');
  const IMAGES_OUT_DIR = path.join(PUBLIC_DIR, 'images');
  [CONTENT_OUT_DIR, IMAGES_OUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Generate Tag Index
  const tagIndex: Record<string, { posts: string[], pages: string[] }> = {};

  posts.sort((a, b) => new Date(b.metadata.date).getTime() - new Date(a.metadata.date).getTime()).forEach(post => {
    (post.metadata.tags || []).forEach((tag: string) => {
      const normalizedTag = tag.toLowerCase().trim();
      if (!tagIndex[normalizedTag]) tagIndex[normalizedTag] = { posts: [], pages: [] };
      tagIndex[normalizedTag].posts.push(post.metadata.slug);
    });
  });

  pages.forEach(page => {
    (page.metadata.tags || []).forEach((tag: string) => {
      const normalizedTag = tag.toLowerCase().trim();
      if (!tagIndex[normalizedTag]) tagIndex[normalizedTag] = { posts: [], pages: [] };
      tagIndex[normalizedTag].pages.push(page.metadata.slug);
    });
  });

  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'tags.json'),
    JSON.stringify(tagIndex, null, 2),
    'utf-8'
  );

  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'posts.json'), 
    JSON.stringify(posts.map(p => p.metadata), null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'pages.json'), 
    JSON.stringify(pages.map(p => p.metadata), null, 2),
    'utf-8'
  );
  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'authors.json'), 
    JSON.stringify(authors.map(a => a.metadata), null, 2),
    'utf-8'
  );

  const configPath = fs.existsSync(path.join(CONTENT_DIR, 'content-config.json'))
    ? path.join(CONTENT_DIR, 'content-config.json')
    : path.join(process.cwd(), 'content', 'content-config.json');

  if (fs.existsSync(configPath)) {
    const configData = fs.readFileSync(configPath, 'utf-8');
    fs.writeFileSync(path.join(CONTENT_OUT_DIR, 'content-config.json'), configData, 'utf-8');
  }

  // Generate individual content files
  const POSTS_OUT_DIR = path.join(CONTENT_OUT_DIR, 'posts');
  const PAGES_OUT_DIR = path.join(CONTENT_OUT_DIR, 'pages');
  const AUTHORS_OUT_DIR = path.join(CONTENT_OUT_DIR, 'authors');

  [POSTS_OUT_DIR, PAGES_OUT_DIR, AUTHORS_OUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  const dataAccess = new LocalFileDataModelAccess();

  for (const post of posts) {
    if (post.content && post.content.includes('```data-model-snippet')) {
      post.content = await convertDataModelDiagramsToMermaid(post.content, dataAccess);
    }
    const outPath = path.join(POSTS_OUT_DIR, `${post.metadata.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ ...post.metadata, content: post.content }, null, 2),
      'utf-8'
    );
  }

  for (const page of pages) {
    if (page.content && page.content.includes('```data-model-snippet')) {
      page.content = await convertDataModelDiagramsToMermaid(page.content, dataAccess);
    }
    const outPath = path.join(PAGES_OUT_DIR, `${page.metadata.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ ...page.metadata, content: page.content }, null, 2),
      'utf-8'
    );
  }

  authors.forEach(author => {
    const outPath = path.join(AUTHORS_OUT_DIR, `${author.metadata.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ ...author.metadata, content: author.content }, null, 2),
      'utf-8'
    );
  });

  console.log('Generated JSON content index and individual files');

  // Generate sitemap.xml
  let sitemap = '';
  if (CONFIG.prelaunch) {
    sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<!-- PRE-LAUNCH STATE: Search engines and AI crawlers are denied access. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
  } else {
    sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${BASE_URL}/</loc>
    <priority>1.0</priority>
  </url>
${pages.map(page => `  <url>
    <loc>${BASE_URL}/?page=${page.metadata.slug}</loc>
    <priority>0.8</priority>
  </url>`).join('\n')}
${posts.map(post => `  <url>
    <loc>${BASE_URL}/?post=${post.metadata.slug}</loc>
    <lastmod>${post.metadata.date ? new Date(post.metadata.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}</lastmod>
    <priority>0.6</priority>
  </url>`).join('\n')}
</urlset>`;
  }

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap, 'utf-8');
  console.log(`Generated sitemap.xml (${CONFIG.prelaunch ? 'prelaunch' : 'public'})`);

  // Generate robots.txt denying search engine and AI crawler access if prelaunch is active
  let robotsTxt = '';
  if (CONFIG.prelaunch) {
    robotsTxt = 'User-agent: *\nDisallow: /';
  } else {
    robotsTxt = `User-agent: *\nAllow: /\nSitemap: ${BASE_URL}/sitemap.xml`;
  }
  fs.writeFileSync(path.join(PUBLIC_DIR, 'robots.txt'), robotsTxt, 'utf-8');
  console.log(`Generated robots.txt (${CONFIG.prelaunch ? 'prelaunch' : 'public'})`);

  // Update index.html robots meta tag in-place based on active prelaunch status
  const indexPath = path.join(process.cwd(), 'index.html');
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
  llmsTxt += `- [Sitemap](${BASE_URL}/sitemap.xml)\n\n`;
  
  llmsTxt += `## ${t.llms.articlesFeatured}\n`;
  const featuredPosts = posts.slice(0, 5);
  featuredPosts.forEach(post => {
    let line = `- [${post.metadata.title}](${BASE_URL}/?post=${post.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/posts/${post.metadata.file})`;
    if (post.metadata.promotional) {
      line += ` [PROMOTIONAL / KAUPALLINEN YHTEISTYÖ: ${post.metadata.partner || ''}]`;
    }
    llmsTxt += line + '\n';
  });
  llmsTxt += `\n`;
  
  llmsTxt += `## ${t.llms.pages}\n`;
  pages.forEach(page => {
    llmsTxt += `- [${page.metadata.title}](${BASE_URL}/?page=${page.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/pages/${page.metadata.file})\n`;
  });
  llmsTxt += `\n`;
  
  llmsTxt += `## ${t.llms.optional}\n`;
  llmsTxt += `${t.llms.fullIndexNote.replace('${baseUrl}', BASE_URL)}\n`;
  
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt, 'utf-8');
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
    let line = `- [${post.metadata.title}](${BASE_URL}/?post=${post.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/posts/${post.metadata.file})`;
    if (post.metadata.promotional) {
      line += ` [PROMOTIONAL / KAUPALLINEN YHTEISTYÖ: ${post.metadata.partner || ''}]`;
    }
    llmsFullTxt += line + '\n';
  });
  llmsFullTxt += `\n`;
  
  llmsFullTxt += `## ${t.llms.pages}\n`;
  pages.forEach(page => {
    llmsFullTxt += `- [${page.metadata.title}](${BASE_URL}/?page=${page.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/pages/${page.metadata.file})\n`;
  });

  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt, 'utf-8');
  console.log('Generated llms-full.txt');

  // Generate RSS 2.0 Feed for the 50 latest created or updated journal (blog) posts.
  const journalPostsOnly = posts.filter(post => post.metadata.category === 'journal');

  const postsWithGitDates = journalPostsOnly.map(post => {
    const filePath = `${useTestContent ? 'test-content' : 'content'}/posts/${post.file}`;
    const fileCommits = historyMap[filePath] || [];

    let createdDate = post.metadata.date || post.metadata.publishDate || '';
    let updatedDate = post.metadata.date || post.metadata.publishDate || '';
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

  const channelUrl = BASE_URL;
  const feedUrl = `${BASE_URL}/feed.xml`;

  let rssItemsXml = '';
  latestPostsForFeed.forEach(({ post, createdDate, updatedDate, lastCommitMessage, lastCommitHash }) => {
    const postUrl = `${BASE_URL}/?post=${post.metadata.slug}`;
    const pubDateRfc822 = new Date(updatedDate).toUTCString();

    let displayTitle = post.metadata.title;
    let descriptionText = post.metadata.excerpt || '';

    if (post.metadata.promotional) {
      const partnerName = post.metadata.partner || '';
      displayTitle = `[Kaupallinen yhteistyö - ${partnerName}] ${displayTitle}`;
      const promoNotice = `Tämä kirjoitus on osa kaupallista yhteistyötä Kaavatietomalli.fi-sivuston ja ${partnerName}:n välillä. / This is sponsored promotional content in co-operation with ${partnerName}.`;
      descriptionText = `(${promoNotice}) ${descriptionText}`;
    }

    const title = escapeXml(displayTitle);
    const excerpt = escapeXml(descriptionText);

    const guid = postUrl;

    const categoriesXml = (post.metadata.tags || [])
      .map((tag: string) => `      <category>${escapeXml(tag)}</category>`)
      .join('\n');

    const authorXml = post.metadata.author
      ? `      <dc:creator>${escapeXml(post.metadata.author)}</dc:creator>`
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

  fs.writeFileSync(path.join(PUBLIC_DIR, 'feed.xml'), rssXml, 'utf-8');
  console.log('Generated feed.xml (RSS 2.0)');

  // Generate 404.html for SPA router fallback redirection using localized strings
  const pageNotFoundTitle = `${t.notFound.title} - Kaavatietomalli`;
  const notFoundHtml = `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeXml(pageNotFoundTitle)}</title>
  <style>
    body {
      background-color: #0b0f19;
      color: #94a3b8;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
    }
    .container {
      text-align: center;
      max-width: 480px;
    }
    h1 {
      color: #f8fafc;
      font-size: 2.25rem;
      font-weight: 800;
      line-height: 1.25;
      margin-bottom: 16px;
    }
    p {
      font-size: 1rem;
      line-height: 1.6;
      margin-bottom: 24px;
    }
    .spinner {
      display: inline-block;
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255, 255, 255, 0.1);
      border-radius: 50%;
      border-top-color: #38bdf8;
      animation: spin 1s ease-in-out infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
  <script type="text/javascript">
    (function() {
      // Extract the current URL path
      var path = window.location.pathname;
      var search = window.location.search;
      var hash = window.location.hash;
      
      // Dynamic repository path detection (e.g. /kaavatietomalli.fi/)
      var repoName = '${REPO_NAME}';
      var repoPath = '/' + repoName;
      var isRepoPath = path.indexOf(repoPath) === 0;
      
      // Extract the clean relative path relative to the app base
      var cleanPath = path;
      if (isRepoPath) {
        cleanPath = path.substring(repoPath.length);
      }
      
      // Strip leading slash
      if (cleanPath.charAt(0) === '/') {
        cleanPath = cleanPath.substring(1);
      }
      // Strip trailing slash
      if (cleanPath.charAt(cleanPath.length - 1) === '/') {
        cleanPath = cleanPath.substring(0, cleanPath.length - 1);
      }
      
      // Only perform redirect if there is an actual path, otherwise send to home
      var redirectPath = cleanPath ? cleanPath : '';
      
      // Construct redirection URL
      var basePart = window.location.origin + (isRepoPath ? repoPath + '/' : '/');
      var destination = basePart + '?post=' + encodeURIComponent(redirectPath);
      
      // Append any existing hash or additional queries if they exist
      if (hash) {
        destination += hash;
      }
      
      // Redirect the user
      window.location.replace(destination);
    })();
  </script>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <h1>${escapeXml(t.notFound.redirecting)}</h1>
    <p>${escapeXml(t.notFound.redirectingDescription)}</p>
    <p style="font-size: 0.85rem; color: #64748b;">
      <a href="/" style="color: #38bdf8; text-decoration: none;">${escapeXml(t.notFound.redirectingClickHere)}</a>
    </p>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(PUBLIC_DIR, '404.html'), notFoundHtml, 'utf-8');
  console.log('Generated 404.html');

  // Copy content/images folder to public/images
  const srcImagesDir = path.join(CONTENT_DIR, 'images');
  if (fs.existsSync(srcImagesDir)) {
    copyFolderRecursiveSync(srcImagesDir, IMAGES_OUT_DIR);
    console.log('Copied content/images to public/images');
  } else {
    console.warn('content/images directory not found!');
  }

  // Generate build version
  const buildVersion = Date.now().toString();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'version.json'), JSON.stringify({ version: buildVersion }, null, 2), 'utf-8');
  fs.writeFileSync(path.join(process.cwd(), 'src', 'version.ts'), `// Generated by generate-assets.ts - do not modify\nexport const BUILD_VERSION = '${buildVersion}';\n`, 'utf-8');
  console.log(`Generated build version: ${buildVersion}`);
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

// Video validations are now delegated to content-utils.js

if (process.env.NODE_ENV !== 'test') {
  generateAssets().catch(err => {
    console.error('Error generating assets:', err);
    process.exit(1);
  });
}
