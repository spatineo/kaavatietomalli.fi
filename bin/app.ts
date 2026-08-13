#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebsiteStack } from '../cdk/website-stack.ts';
import { PROJECT_CONFIG } from '../project.config.ts';
import { CertificateStack } from '../cdk/certificate-stack.ts';
import { execSync } from 'child_process';

/**
 * Utility function to validate required environment variables
 */
function getEnvVar(name: string, fallback?: string): string {
  const value = process.env[name] || fallback;
  if (!value) {
    throw new Error(
      `Missing required environment variable: "${name}". ` +
      `Ensure it is set in GitHub Action Variables or your local environment.`
    );
  }
  return value;
}

/**
 * Resolves the Git version tag dynamically.
 * Fallbacks to process.env.GIT_TAG or 'unknown' in CI/CD environments 
 * where the .git folder might not be checked out with history.
 */
export function getGitVersion(): string {
  // 1. Check if passed via Environment Variable (e.g., in GitHub Actions)
  if (process.env.GIT_TAG) {
    return process.env.GIT_TAG;
  }

  // 2. Otherwise query local Git repository directly
  try {
    const gitVersion = execSync('git describe --tags --always', { encoding: 'utf8' }).trim();
    return gitVersion;
  } catch (error) {
    console.warn('Unable to resolve git version via CLI, falling back to default.');
    return 'v0.0.0-dev';
  }
}

const app = new cdk.App();

const version = getGitVersion();
console.log(`🏷️ Deploying stack version: ${version}`);

// Certificate Stack in US East 1
const certStack = new CertificateStack(app, 'KaavatietomalliWebsiteCertStack', {
  env: {
    account: process.env.AWS_PROJECT_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  crossRegionReferences: true,
  domainName: PROJECT_CONFIG.domainName
});


cdk.Tags.of(certStack).add('GitVersion', version);
cdk.Tags.of(certStack).add('DeployedBy', 'CDK'); 

// Website Stack on EU North 1
const siteStack = new WebsiteStack(app, 'KaavatietomalliWebsiteMainStack', {
  env: {
    account: process.env.AWS_PROJECT_ACCOUNT_ID || process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-north-1',
  },
  crossRegionReferences: true,
  certificate: certStack.certificate,
  hostedZone: certStack.hostedZone,
  domainName: PROJECT_CONFIG.domainName,

  // GitHub Repository Configuration for OIDC
  githubOrg: PROJECT_CONFIG.repoOwner,
  githubRepo: PROJECT_CONFIG.repoName,
  
  isProduction: !process.env.VITE_PRELAUNCH_PASSWORD,

  deployerRole: getEnvVar('DEPLOYER_ROLE','GitHubActionsWebsiteDeployer'), // fallback
});

cdk.Tags.of(siteStack).add('GitVersion', version);
cdk.Tags.of(siteStack).add('DeployedBy', 'CDK');


siteStack.addStackDependency(certStack);
