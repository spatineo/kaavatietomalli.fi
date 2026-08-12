import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface WebsiteStackProps extends cdk.StackProps {
  githubOrg: string;
  githubOrgId: string;
  githubRepo: string;
  githubRepoId: string;
  domainName: string;
  primaryAccountId: string;
  primaryHostedZoneId: string;
  crossAccountDnsRoleName: string;
  certificateArn: string;
  deployerRole: string;
}

export class WebsiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, props);

    const isProduction = !process.env.VITE_PRELAUNCH_PASSWORD;

    // =========================================================================
    // 1. Dedicated CloudFront Access Logs Bucket
    // =========================================================================
    const logBucket = new s3.Bucket(this, 'CloudFrontLogBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Object ownership must be set to OBJECT_WRITER to allow standard CloudFront log delivery
      objectOwnership: s3.ObjectOwnership.OBJECT_WRITER,
      removalPolicy: isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProduction,
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
    // 3. Import TLS Certificate
    // =========================================================================
    const certificate = acm.Certificate.fromCertificateArn(
      this,
      'ImportedCertificate',
      props.certificateArn
    );

    // =========================================================================
    // 4. CloudFront Distribution with OAC, Access Logging & SPA Error Pages
    // =========================================================================
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket);

    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: certificate,

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

    // =========================================================================
    // 5. Cross-Account Route 53 A Alias Record via AwsCustomResource
    // =========================================================================
    const primaryDnsRoleArn = `arn:aws:iam::${props.primaryAccountId}:role/${props.crossAccountDnsRoleName}`;

    // CloudFront's global canonical hosted zone ID (Always Z2FDTNDATAQYW2 for CloudFront distributions)
    const cloudFrontGlobalHostedZoneId = 'Z2FDTNDATAQYW2';

    new cr.AwsCustomResource(this, 'CrossAccountRoute53Record', {
      onCreate: {
        service: 'Route53',
        action: 'changeResourceRecordSets',
        parameters: {
          HostedZoneId: props.primaryHostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'UPSERT',
                ResourceRecordSet: {
                  Name: props.domainName,
                  Type: 'A',
                  AliasTarget: {
                    HostedZoneId: cloudFrontGlobalHostedZoneId,
                    DNSName: distribution.distributionDomainName,
                    EvaluateTargetHealth: false,
                  },
                },
              },
            ],
          },
        },
        physicalResourceId: cr.PhysicalResourceId.of(`Route53Alias-${props.domainName}`),
      },
      onDelete: {
        service: 'Route53',
        action: 'changeResourceRecordSets',
        parameters: {
          HostedZoneId: props.primaryHostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: 'DELETE',
                ResourceRecordSet: {
                  Name: props.domainName,
                  Type: 'A',
                  AliasTarget: {
                    HostedZoneId: cloudFrontGlobalHostedZoneId,
                    DNSName: distribution.distributionDomainName,
                    EvaluateTargetHealth: false,
                  },
                },
              },
            ],
          },
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['sts:AssumeRole'],
          resources: [primaryDnsRoleArn],
        }),
      ]),
      // Role assumed locally by the CustomResource Lambda handler
      role: new iam.Role(this, 'CustomResourceExecutionRole', {
        assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ],
      }),
    });

    // =========================================================================
    // 6. GitHub Actions OIDC Deploy Role (Keyless Deployments)
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
    // 7. Stack Outputs
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