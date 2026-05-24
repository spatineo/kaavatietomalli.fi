import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import dotenv from 'dotenv';
import { PROJECT_CONFIG } from '../project.config.js';
import { getTranslations } from '../src/i18n/index.js';

dotenv.config();

const BASE_URL = (process.env.VITE_BASE_URL || process.env.APP_URL || PROJECT_CONFIG.defaultBaseUrl).replace(/\/$/, '');
const REPO_OWNER = PROJECT_CONFIG.repoOwner;
const REPO_NAME = PROJECT_CONFIG.repoName;
const RAW_GITHUB_BASE = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/refs/heads/main/src/content`;
const CONTENT_DIR = path.join(process.cwd(), 'src', 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

function getFilesRecursive(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursive(fullPath, baseDir));
    } else if (file.endsWith('.md')) {
      results.push(path.relative(baseDir, fullPath));
    }
  });
  return results;
}

function generateAssets() {
  const t = getTranslations('fi');
  const postsDir = path.join(CONTENT_DIR, 'posts');
  const pagesDir = path.join(CONTENT_DIR, 'pages');
  const authorsDir = path.join(CONTENT_DIR, 'authors');

  const postFiles = getFilesRecursive(postsDir);
  const pageFiles = getFilesRecursive(pagesDir);
  const authorFiles = getFilesRecursive(authorsDir);

  const now = new Date();

  const allPosts = postFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const { data, content: textContent } = matter(content);
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
      },
      content: textContent
    };
  });

  const posts = allPosts.filter(post => {
    if (!post.metadata.publishDate) return true;
    return now >= new Date(post.metadata.publishDate);
  });

  const pages = pageFiles.map(file => {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(pagesDir, file), 'utf-8');
    const { data, content: textContent } = matter(content);
    return {
      metadata: {
        slug,
        title: data.title || slug,
        tags: data.tags || [],
      },
      content: textContent
    };
  });

  const authors = authorFiles.map(file => {
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
        ...data
      },
      content: textContent
    };
  });

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
    JSON.stringify(tagIndex, null, 2)
  );

  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'posts.json'), 
    JSON.stringify(posts.map(p => p.metadata), null, 2)
  );
  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'pages.json'), 
    JSON.stringify(pages.map(p => p.metadata), null, 2)
  );
  fs.writeFileSync(
    path.join(CONTENT_OUT_DIR, 'authors.json'), 
    JSON.stringify(authors.map(a => a.metadata), null, 2)
  );

  // Generate individual content files
  const POSTS_OUT_DIR = path.join(CONTENT_OUT_DIR, 'posts');
  const PAGES_OUT_DIR = path.join(CONTENT_OUT_DIR, 'pages');
  const AUTHORS_OUT_DIR = path.join(CONTENT_OUT_DIR, 'authors');

  [POSTS_OUT_DIR, PAGES_OUT_DIR, AUTHORS_OUT_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  posts.forEach(post => {
    const outPath = path.join(POSTS_OUT_DIR, `${post.metadata.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ ...post.metadata, content: post.content }, null, 2)
    );
  });

  pages.forEach(page => {
    const outPath = path.join(PAGES_OUT_DIR, `${page.metadata.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ ...page.metadata, content: page.content }, null, 2)
    );
  });

  authors.forEach(author => {
    const outPath = path.join(AUTHORS_OUT_DIR, `${author.metadata.slug}.json`);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(
      outPath,
      JSON.stringify({ ...author.metadata, content: author.content }, null, 2)
    );
  });

  console.log('Generated JSON content index and individual files');

  // Generate sitemap.xml
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
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

  fs.writeFileSync(path.join(PUBLIC_DIR, 'sitemap.xml'), sitemap);
  console.log('Generated sitemap.xml');

  // Generate llms.txt
  let llmsTxt = `# ${t.common.footerTitle}\n\n`;
  llmsTxt += `${t.llms.note}\n\n`;
  llmsTxt += `${t.hero.description}.\n\n`;
  
  llmsTxt += `## ${t.llms.links}\n`;
  llmsTxt += `- [${t.navigation.githubRepo}](https://github.com/${REPO_OWNER}/${REPO_NAME})\n`;
  llmsTxt += `- [Sitemap](${BASE_URL}/sitemap.xml)\n\n`;
  
  llmsTxt += `## ${t.llms.articlesFeatured}\n`;
  const featuredPosts = posts.slice(0, 5);
  featuredPosts.forEach(post => {
    llmsTxt += `- [${post.metadata.title}](${BASE_URL}/?post=${post.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/posts/${post.metadata.slug}.md)\n`;
  });
  llmsTxt += `\n`;
  
  llmsTxt += `## ${t.llms.pages}\n`;
  pages.forEach(page => {
    llmsTxt += `- [${page.metadata.title}](${BASE_URL}/?page=${page.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/pages/${page.metadata.slug}.md)\n`;
  });
  llmsTxt += `\n`;
  
  llmsTxt += `## ${t.llms.optional}\n`;
  llmsTxt += `${t.llms.fullIndexNote.replace('${baseUrl}', BASE_URL)}\n`;
  
  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms.txt'), llmsTxt);
  console.log('Generated llms.txt');
  
  // Generate llms-full.txt
  let llmsFullTxt = `# ${t.common.footerTitle} - ${t.llms.fullIndexTitle}\n\n`;
  llmsFullTxt += `${t.llms.note}\n\n`;
  llmsFullTxt += `${t.llms.fullIndexDescription}\n\n`;
  
  llmsFullTxt += `## ${t.llms.articles}\n`;
  posts.forEach(post => {
    llmsFullTxt += `- [${post.metadata.title}](${BASE_URL}/?post=${post.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/posts/${post.metadata.slug}.md)\n`;
  });
  llmsFullTxt += `\n`;
  
  llmsFullTxt += `## ${t.llms.pages}\n`;
  pages.forEach(page => {
    llmsFullTxt += `- [${page.metadata.title}](${BASE_URL}/?page=${page.metadata.slug}) - [Raw Markdown](${RAW_GITHUB_BASE}/pages/${page.metadata.slug}.md)\n`;
  });

  fs.writeFileSync(path.join(PUBLIC_DIR, 'llms-full.txt'), llmsFullTxt);
  console.log('Generated llms-full.txt');

  // Generate build version
  const buildVersion = Date.now().toString();
  fs.writeFileSync(path.join(PUBLIC_DIR, 'version.json'), JSON.stringify({ version: buildVersion }, null, 2));
  fs.writeFileSync(path.join(process.cwd(), 'src', 'version.ts'), `// Generated by generate-assets.ts - do not modify\nexport const BUILD_VERSION = '${buildVersion}';\n`);
  console.log(`Generated build version: ${buildVersion}`);
}

generateAssets();
