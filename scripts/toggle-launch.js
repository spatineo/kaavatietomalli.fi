import fs from 'fs';
import path from 'path';

const MODE = process.argv[2]; // 'prelaunch' or 'public'

if (!['prelaunch', 'public'].includes(MODE)) {
  console.error('Usage: node scripts/toggle-launch.js [prelaunch|public]');
  process.exit(1);
}

const isPrelaunch = MODE === 'prelaunch';

const files = {
  index: path.join(process.cwd(), 'index.html'),
  robots: path.join(process.cwd(), 'public/robots.txt'),
  llms: path.join(process.cwd(), 'public/llms.txt'),
};

// 1. Update index.html
let indexContent = fs.readFileSync(files.index, 'utf8');
const robotsMetaPrelaunch = '<meta name="robots" content="noindex, nofollow" />';
const robotsMetaPublic = '<meta name="robots" content="index, follow" />';

if (isPrelaunch) {
  indexContent = indexContent.replace(robotsMetaPublic, robotsMetaPrelaunch);
  // Also handle cases where it might not have been exact
  if (!indexContent.includes(robotsMetaPrelaunch)) {
     // If neither is found perfectly, try to insert it after title or description
     indexContent = indexContent.replace(/<title>.*?<\/title>/, (match) => `${match}\n    ${robotsMetaPrelaunch}`);
  }
} else {
  indexContent = indexContent.replace(robotsMetaPrelaunch, robotsMetaPublic);
}
fs.writeFileSync(files.index, indexContent);
console.log(`Updated index.html to ${MODE} robots meta.`);

// 2. Update robots.txt
const robotsPrelaunch = 'User-agent: *\nDisallow: /';
// Attempt to find sitemap URL if possible, otherwise use a generic one or none
const sitemapUrl = 'https://kaavatietomalli.fi/sitemap.xml';
const robotsPublic = `User-agent: *\nAllow: /\nSitemap: ${sitemapUrl}`;

fs.writeFileSync(files.robots, isPrelaunch ? robotsPrelaunch : robotsPublic);
console.log(`Updated robots.txt to ${MODE} state.`);

// 3. Update llms.txt
let llmsContent = fs.readFileSync(files.llms, 'utf8');
const prelaunchWarning = '> [!IMPORTANT]\n> This is a PRE-LAUNCH DRAFT version of the site content. Not for public indexing.\n\n';

if (isPrelaunch) {
  if (!llmsContent.includes('PRE-LAUNCH DRAFT')) {
    llmsContent = prelaunchWarning + llmsContent;
  }
} else {
  llmsContent = llmsContent.replace(prelaunchWarning, '');
}
fs.writeFileSync(files.llms, llmsContent);
console.log(`Updated llms.txt to ${MODE} state.`);

console.log(`\nSuccessfully toggled site to: ${MODE.toUpperCase()}`);
if (isPrelaunch) {
  console.log('NOTE: Remember to set VITE_PRELAUNCH_PASSWORD in your environment variables to enable the password gate.');
} else {
  console.log('NOTE: Remember to clear VITE_PRELAUNCH_PASSWORD (leave it empty) to disable the password gate for public access.');
}
