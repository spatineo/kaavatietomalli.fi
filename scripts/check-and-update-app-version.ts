import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { exit } from 'process';
import { parseArgs } from "node:util";

const packageJsonPath = path.join(process.cwd(), 'package.json');
const configPath = path.join(process.cwd(), 'src', 'config.ts');
const APP_VERSION_PATTERN = /export const APP_VERSION = '(?<version>[0-9\.]+)'/;

const { values } = parseArgs({
  args: process.argv.slice(2),
  options: {
    version: {
      type: "string",
      short: "v",
    },
  },
  strict: false,
});

function getPackageVersion():string {
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    if (pkg.version) {
      return pkg.version;
    } else {
      throw new Error('Version property does not exist in ' + packageJsonPath);
    }
  } else {
    throw new Error('File '+packageJsonPath + ' does not exist');
  }
}

function getConfigVersion(): string {
  const configContent = fs.readFileSync(configPath, 'utf-8');
  const match = configContent.match(APP_VERSION_PATTERN);
  if (match && match.groups) {
    return match.groups.version;
  } else {
    throw new Error('No const APP_VERSION found in ' + configPath);
  }
}


function getGitTagVersion(): string {
  // Try to get version from latest git tag
  const tag = execSync('git describe --tags --abbrev=0', {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  if (tag) {
    return tag.replace(/^v/, '');
  } else {
    throw new Error('`No git tag found');
  }
}

function matchVersionsOrExit(packageVersion: string, configVersion: string, gitVersion: string) {
  if (packageVersion !== configVersion) {
    console.error('Mismatch of version numbers in package.json (' + packageVersion +') and config.ts (' + configVersion +')');
    exit(1);
  } else if (packageVersion != gitVersion) {
    console.error('The version number in package.json (' + packageVersion +') does not equal the latest git tag version (' + gitVersion +')');
    exit(1);
  }
  console.log('App versions match');
}


function updateAppVersion(version:string) {
  if (fs.existsSync(packageJsonPath) && fs.existsSync(configPath)) {
    const pkgContent = fs.readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    if (pkg.version !== version) {
      pkg.version = version;
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      console.log(`Updated package.json version to: ${version}`);
    } else {
      console.log(`package.json version is already ${version}, not updating`);
    }

    const currentConfigVersion = getConfigVersion();
    if (currentConfigVersion !== version) {
      const newAppVersionLine = `export const APP_VERSION = '${version}'`;
      let configContent = fs.readFileSync(configPath, 'utf-8');
      configContent = configContent.replace(APP_VERSION_PATTERN, newAppVersionLine);
      fs.writeFileSync(configPath, configContent, 'utf-8');
      console.log(`Updated src/config.ts version to: ${version}`);
    } else {
      console.log(`src/config.ts version is already ${version}, not updating`);
    }
  } else {
    throw new Error('One or both of package.json (' + packageJsonPath + ') and config.ts (' + configPath + ') do not exist');
  }
}

if (process.env.NODE_ENV !== 'test') {
  const update = process.env.UPDATE_APP_VERSION;
  let gitVersion = null;
  try {
    if (values.version) {
      gitVersion = values.version;
    } else {
      gitVersion = getGitTagVersion();
    }
    try {
      if (update) {
        updateAppVersion(gitVersion);
      } else {
        const packageVersion = getPackageVersion();
        const configVersion = getConfigVersion();
        matchVersionsOrExit(packageVersion, configVersion, gitVersion);
      }
    } catch(err) {
      console.error('Error in checking or updating app version:', err);
      process.exit(1);
    }
  } catch (err) {
    console.log('No git version tag found, skipping version consistency check');
  }
}