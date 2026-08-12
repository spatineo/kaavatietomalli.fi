#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { WebsiteStack } from '../cdk/website-stack.ts';
import { PROJECT_CONFIG } from '../project.config.ts';

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

function checkCertificateARN(arn: string, accountId: string): string {
  //Must always by issued in us-east-1 for CloudFront.
  //Pattern to expect: arn:aws:acm:us-east-1:999999999999:certificate/abc12345-6789-0123-4567-89abcdef0123
  const pattern = new RegExp(`^arn:aws:acm:us-east-1:${accountId}:certificate\/[a-z0-9-]*$`,"g");
  if (!arn.match(pattern)) {
    throw new Error("The certificate ARN " + arn + " does not look like it's issued for the us-east-1 region, or by the project AWS account (" + accountId + ")");
  }
  return arn;
}

const app = new cdk.App();

new WebsiteStack(app, 'ReactWebsiteProjectStack', {
  // Dynamically pulls target account and region from CLI environment
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-north-1',
  },
  
  // GitHub Repository Configuration for OIDC
  githubOrg: PROJECT_CONFIG.repoOwner,
  githubRepo: PROJECT_CONFIG.repoName,
  githubOrgId: PROJECT_CONFIG.repoOwnerId,
  githubRepoId: PROJECT_CONFIG.repoId,

  // Domain & Cross-Account DNS Configuration
  domainName: PROJECT_CONFIG.domainName,
  deployerRole: getEnvVar('DEPLOYER_ROLE','GitHubActionsWebsiteDeployer'), // fallback
  certificateArn: checkCertificateARN(getEnvVar('ACM_CERTIFICATE_ARN'), getEnvVar('AWS_PROJECT_ACCOUNT_ID'))
});