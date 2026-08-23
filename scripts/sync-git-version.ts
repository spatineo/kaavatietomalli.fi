import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const packageJsonPath = path.join(process.cwd(), 'package.json');
const configPath = path.join(process.cwd(), 'src', 'config.ts');

function getLatestGitTag(): string | null {
  try {
    const tag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    return tag || null;
  } catch {
    return null;
  }
}

function run() {
  let version = '0.5.0'; // Default fallback

  // 1. Get version from package.json first as standard fallback
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.version) {
        version = pkg.version;
      }
    } catch (err) {
      console.warn('Warning: Could not parse package.json, using default fallback version.', err);
    }
  }

  // 2. Try to get version from latest git tag
  const latestTag = getLatestGitTag();
  if (latestTag) {
    const cleanVersion = latestTag.replace(/^v/, '');
    console.log(`Found latest git tag: ${latestTag} (Normalized: ${cleanVersion})`);
    version = cleanVersion;
  } else {
    console.log(`No git tag found. Using fallback version: ${version}`);
  }

  // 3. Update package.json if it exists and version is different
  if (fs.existsSync(packageJsonPath)) {
    try {
      const pkgContent = fs.readFileSync(packageJsonPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      if (pkg.version !== version) {
        pkg.version = version;
        fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
        console.log(`Updated package.json version to: ${version}`);
      } else {
        console.log(`package.json version is already ${version}`);
      }
    } catch (err) {
      console.error('Error updating package.json:', err);
    }
  }

  // 4. Update src/config.ts if it exists
  if (fs.existsSync(configPath)) {
    try {
      let configContent = fs.readFileSync(configPath, 'utf-8');

      // Update export const APP_VERSION = '...';
      const appVersionRegex = /export const APP_VERSION = '[^']+'/g;
      const newAppVersionLine = `export const APP_VERSION = '${version}'`;

      let changed = false;

      if (appVersionRegex.test(configContent)) {
        configContent = configContent.replace(appVersionRegex, newAppVersionLine);
        changed = true;
      }

      if (changed) {
        fs.writeFileSync(configPath, configContent, 'utf-8');
        console.log(`Successfully synced src/config.ts version to: ${version}`);
      } else {
        console.log('src/config.ts version is already up to date.');
      }
    } catch (err) {
      console.error('Error syncing src/config.ts version:', err);
    }
  }
}

run();
