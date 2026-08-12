import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { ARecord, AaaaRecord, PublicHostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import * as route53 from 'aws-cdk-lib/aws-route53';

export interface WebsiteStackProps extends cdk.StackProps {
  githubOrg: string;
  githubOrgId: string;
  githubRepo: string;
  githubRepoId: string;
  domainName: string;
  deployerRole: string;
  certificate: acm.ICertificate;
  hostedZone: route53.IHostedZone;
  isProduction: boolean;
}

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    // =========================================================================
    // 1. Dedicated CloudFront Access Logs Bucket
    // =========================================================================
    const logBucket = new s3.Bucket(this, 'CloudFrontLogBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Object ownership must be set to OBJECT_WRITER to allow standard CloudFront log delivery
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      removalPolicy: props.isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !props.isProduction,
      lifecycleRules: [
        {
          // Auto-expire logs after 90 days to control S3 storage costs
          expiration: cdk.Duration.days(90),
        },
      ],
    });

    // =========================================================================
    // 2. Private S3 Bucket for React Website Build Files
    // =========================================================================
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // =========================================================================
    // 3. CloudFront Distribution with OAC, Access Logging & SPA Error Pages
    // =========================================================================
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket);

    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: props.certificate,

      // Enable CloudFront Access Logging
      logBucket: logBucket,
      logFilePrefix: 'raw-logs/',

      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },

      // Handle React SPA Client-Side Routing (Reroute 404/403 -> index.html)
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.seconds(0),
        },
      ],
    });

    // Aggressive Caching behavior for fingerprinted static assets (/assets/*)
    distribution.addBehavior('/assets/*', s3Origin, {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    });

    // ====================================================================
    // 4. Alias records for the hosted zone referring the Cloudfront distribution
    // ====================================================================
    
    new ARecord(this, 'IPV4AliasRecord',{
      zone: props.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
    });

    new AaaaRecord(this, 'IPv6AliasRecord',{
      zone: props.hostedZone,
      target: RecordTarget.fromAlias(new CloudFrontTarget(distribution))
    });

    // For extra safety: certificate creation allowed only by AWS 
    new route53.CaaRecord(this, 'AmazonCaaRecord', {
      zone: props.hostedZone,
      values: [
        {
          flag: 0,
          tag: route53.CaaTag.ISSUE,
          value: 'amazon.com',
        }
      ],
    });
    

    // =========================================================================
    // 5. GitHub Actions OIDC Deploy Role (Keyless Deployments)
    // =========================================================================
    const ghaProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOIDCProvider',
      `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`
    );

    const githubRole = new iam.Role(this, props.deployerRole, {
      roleName: `${this.stackName}-${props.deployerRole}`,
      assumedBy: new iam.FederatedPrincipal(
        ghaProvider.openIdConnectProviderArn,
        {
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
          },
          StringLike: {
            'token.actions.githubusercontent.com:sub': `repo:${props.githubOrg}@${props.githubOrgId}/${props.githubRepo}@${props.githubRepoId}:ref:refs/heads/main`,
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Grant GitHub Actions role rights to push files & invalidate CloudFront cache
    websiteBucket.grantReadWrite(githubRole);
    distribution.grantCreateInvalidation(githubRole);

    // Grant CDK CloudFormation deployment permissions
    githubRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
    );

    // =========================================================================
    // 6. Stack Outputs
    // =========================================================================
    new cdk.CfnOutput(this, 'S3BucketName', {
      value: websiteBucket.bucketName,
      description: 'Use for S3 Sync in GitHub Actions',
    });

    new cdk.CfnOutput(this, 'LogBucketName', {
      value: logBucket.bucketName,
      description: 'Target S3 bucket containing CloudFront access logs for Athena',
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.distributionId,
      description: 'Use for CloudFront invalidations in GitHub Actions',
    });

    new cdk.CfnOutput(this, 'GitHubDeployRoleArn', {
      value: githubRole.roleArn,
      description: 'Role ARN to paste into your GitHub Actions workflow file',
    });

  }
}