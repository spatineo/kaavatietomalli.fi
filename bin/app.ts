#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebsiteStack } from '../cdk/website-stack.ts';
import { PROJECT_CONFIG } from '../project.config.ts';
import { CertificateStack } from '@/cdk/certificate-stack.ts';

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

const app = new cdk.App();

// Certificate Stack in US East 1
const certStack = new CertificateStack(app, 'WebsiteCertStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: 'us-east-1'
  },
  crossRegionReferences: true,
  domainName: PROJECT_CONFIG.domainName
});

// Website Stack on EU North 1
new WebsiteStack(app, 'WebsiteMainStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-north-1',
  },
  crossRegionReferences: true,
  certificate: certStack.certificate,
  hostedZone: certStack.hostedZone,
  domainName: PROJECT_CONFIG.domainName,

  // GitHub Repository Configuration for OIDC
  githubOrg: PROJECT_CONFIG.repoOwner,
  githubRepo: PROJECT_CONFIG.repoName,
  githubOrgId: PROJECT_CONFIG.repoOwnerId,
  githubRepoId: PROJECT_CONFIG.repoId,
  
  isProduction: !process.env.VITE_PRELAUNCH_PASSWORD,

  deployerRole: getEnvVar('DEPLOYER_ROLE','GitHubActionsWebsiteDeployer'), // fallback
});