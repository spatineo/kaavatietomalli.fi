import fs from 'fs';
import path from 'path';
import { PROJECT_CONFIG } from '../project.config.js';

const CONTENT_DIR = path.join(process.cwd(), 'content');
const PUBLIC_DIR = path.join(process.cwd(), 'public');
const OUT_DIR = path.join(PUBLIC_DIR, 'content');

function getFilesRecursive(dir: string, baseDir: string = dir): string[] {
  let results: string[] = [];
  if (!fs.existsSync(dir)) return [];
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

function findLatestCommentDate(discussion: any): string | null {
  let latestDate: string | null = null;
  if (!discussion || !discussion.comments) return null;
  
  for (const comment of discussion.comments) {
    if (comment.createdAt) {
      if (!latestDate || comment.createdAt > latestDate) {
        latestDate = comment.createdAt;
      }
    }
    if (comment.replies && Array.isArray(comment.replies)) {
      for (const reply of comment.replies) {
        if (reply.createdAt) {
          if (!latestDate || reply.createdAt > latestDate) {
            latestDate = reply.createdAt;
          }
        }
      }
    }
  }
  return latestDate;
}

async function fetchGiscusStats() {
  console.log('Fetching Giscus discussion stats...');
  const postsDir = path.join(CONTENT_DIR, 'posts');
  const postFiles = getFilesRecursive(postsDir);
  
  const repo = `${PROJECT_CONFIG.repoOwner}/${PROJECT_CONFIG.repoName}`;
  const category = 'Announcements';
  
  const stats: Record<string, { count: number; lastDate: string | null }> = {};
  
  for (const file of postFiles) {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    try {
      const url = `https://giscus.app/api/discussions?repo=${repo}&term=${slug}&mapping=specific&category=${category}&strict=1`;
      console.log(`Fetching stats for ${slug}...`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json() as any;
        if (data && data.discussion) {
          const lDate = findLatestCommentDate(data.discussion);
          stats[slug] = {
            count: data.discussion.totalCommentCount || 0,
            lastDate: lDate
          };
          console.log(`  - Found: ${data.discussion.totalCommentCount} comments, last date: ${lDate}`);
        } else {
          stats[slug] = { count: 0, lastDate: null };
        }
      } else {
        stats[slug] = { count: 0, lastDate: null };
        console.log(`  - Status ${response.status} (expected if discussion doesn't exist yet)`);
      }
    } catch (error: any) {
      console.warn(`  - Failed to fetch for ${slug}:`, error.message);
      stats[slug] = { count: 0, lastDate: null };
    }
  }
  
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(OUT_DIR, 'giscus-stats.json'),
    JSON.stringify(stats, null, 2)
  );
  console.log('Giscus stats written successfully to public/content/giscus-stats.json');
}

fetchGiscusStats().catch(console.error);
