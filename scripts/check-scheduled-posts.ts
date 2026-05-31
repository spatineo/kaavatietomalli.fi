import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { getFilesRecursive } from './content-utils.js';
import { PROJECT_CONFIG } from '../project.config.js';

export async function checkScheduledPosts() {
  const postsDir = path.join(process.cwd(), 'content', 'posts');
  if (!fs.existsSync(postsDir)) {
    console.log('Posts directory does not exist. Rebuild: false');
    setOutput(false);
    return;
  }

  const postFiles = getFilesRecursive(postsDir);
  const now = new Date();

  // Try to fetch current deployed posts.json
  const baseUrl = (process.env.VITE_BASE_URL || PROJECT_CONFIG.defaultBaseUrl || 'https://kaavatietomalli.fi').replace(/\/$/, '');
  const postsJsonUrl = `${baseUrl}/content/posts.json`;

  console.log(`Fetching deployed posts from: ${postsJsonUrl}`);
  
  let deployedSlugs: Set<string> = new Set();
  try {
    const res = await fetch(postsJsonUrl);
    if (res.ok) {
      const data = await res.json() as Array<{ slug: string }>;
      if (Array.isArray(data)) {
        deployedSlugs = new Set(data.map(p => p.slug));
        console.log(`Fetched ${deployedSlugs.size} deployed post slugs.`);
      } else {
        console.warn('Fetched posts.json is not an array.');
        // If malformed, let's force a rebuild to be safe
        setOutput(true);
        return;
      }
    } else {
      console.warn(`Failed to fetch posts.json (HTTP ${res.status}). Defaulting to rebuild: true`);
      setOutput(true);
      return;
    }
  } catch (error: any) {
    console.warn(`Failed to fetch deployed posts: ${error.message}. Defaulting to rebuild: true`);
    setOutput(true);
    return;
  }

  let newlyPublishableCount = 0;
  const newlyPublishableFiles: string[] = [];

  for (const file of postFiles) {
    const slug = file.replace(/[\\/]/g, '-').replace('.md', '');
    const content = fs.readFileSync(path.join(postsDir, file), 'utf-8');
    const { data } = matter(content);
    
    if (data.publishDate) {
      const pDate = new Date(data.publishDate);
      // If publishDate is in the past or exactly now, AND is not yet live
      if (pDate <= now && !deployedSlugs.has(slug)) {
        newlyPublishableCount++;
        newlyPublishableFiles.push(`${file} (scheduled for ${data.publishDate})`);
      }
    }
  }

  if (newlyPublishableCount > 0) {
    console.log(`Found ${newlyPublishableCount} scheduled post(s) ready to be published:`);
    newlyPublishableFiles.forEach(info => console.log(` - ${info}`));
    setOutput(true);
  } else {
    console.log('No newly publishable scheduled posts found.');
    setOutput(false);
  }
}

function setOutput(shouldRebuild: boolean) {
  const ghOutput = process.env.GITHUB_OUTPUT;
  if (ghOutput) {
    fs.appendFileSync(ghOutput, `should_rebuild=${shouldRebuild}\n`);
    console.log(`Logged to GITHUB_OUTPUT: should_rebuild=${shouldRebuild}`);
  } else {
    console.log(`Rebuild decision: ${shouldRebuild}`);
  }
}

if (process.env.NODE_ENV !== 'test') {
  checkScheduledPosts().catch(err => {
    console.error('Error running scheduled posts check:', err);
    // Default to true on error to avoid halting deployment silently
    setOutput(true);
    process.exit(1);
  });
}
