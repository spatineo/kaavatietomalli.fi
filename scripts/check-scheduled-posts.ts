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
  } else {
    console.log('No newly publishable scheduled posts found.');
  }

  // Compare newly generated giscus-stats.json with deployed giscus-stats.json
  let giscusStatsChanged = false;
  const newGiscusStatsPath = path.join(process.cwd(), 'public', 'content', 'giscus-stats.json');
  if (!process.env.VITEST && fs.existsSync(newGiscusStatsPath)) {
    try {
      const newStatsStr = fs.readFileSync(newGiscusStatsPath, 'utf-8');
      const giscusStatsUrl = `${baseUrl}/content/giscus-stats.json`;
      console.log(`Fetching deployed giscus stats from: ${giscusStatsUrl}`);
      const res = await fetch(giscusStatsUrl);
      if (res.ok) {
        const deployedStats = await res.json() as any;
        const newStats = JSON.parse(newStatsStr) as any;
        
        // Deep comparison of keys and values
        const deployedKeys = Object.keys(deployedStats);
        const newKeys = Object.keys(newStats);
        
        if (deployedKeys.length !== newKeys.length) {
          giscusStatsChanged = true;
          console.log(`Giscus stats changed: record count changed from ${deployedKeys.length} to ${newKeys.length}.`);
        } else {
          for (const key of newKeys) {
            const deployedVal = deployedStats[key];
            const newVal = newStats[key];
            if (!deployedVal) {
              giscusStatsChanged = true;
              console.log(`Giscus stats changed: new key ${key} added.`);
              break;
            }
            if (deployedVal.count !== newVal.count || deployedVal.lastDate !== newVal.lastDate) {
              giscusStatsChanged = true;
              console.log(`Giscus stats changed for key ${key}: count ${deployedVal.count} -> ${newVal.count}, lastDate ${deployedVal.lastDate} -> ${newVal.lastDate}.`);
              break;
            }
          }
        }
      } else if (res.status === 404) {
        console.warn(`Deployed giscus-stats.json not found (HTTP 404). Treating as changed (initial state).`);
        giscusStatsChanged = true;
      } else {
        console.warn(`Failed to fetch deployed giscus-stats.json (HTTP ${res.status}). Defaulting stats to: changed.`);
        giscusStatsChanged = true;
      }
    } catch (error: any) {
      console.warn(`Error comparing giscus stats: ${error.message}. Defaulting stats to: changed.`);
      giscusStatsChanged = true;
    }
  } else {
    console.log('Local giscus-stats.json does not exist. Skipping stats comparison.');
  }

  if (giscusStatsChanged) {
    console.log('Giscus stats have changed or could not be verified compared to deployed version.');
  } else {
    console.log('No Giscus stats changes detected.');
  }

  const shouldRebuild = (newlyPublishableCount > 0) || giscusStatsChanged;
  setOutput(shouldRebuild);
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
