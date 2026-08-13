import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import { Construct } from 'constructs';
import { ARecord, AaaaRecord, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { CloudFrontTarget } from 'aws-cdk-lib/aws-route53-targets';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as glue from 'aws-cdk-lib/aws-glue';
import * as athena from 'aws-cdk-lib/aws-athena';

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

    // ============================================
    // Website content and deployment resources
    // ============================================


    // Dedicated CloudFront Access Logs Bucket
    const logBucket = new s3.Bucket(this, 'CloudFrontLogBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      // Object ownership must be set to OBJECT_WRITER or BUCKET_OWNER_PREFERRED to 
      // allow standard CloudFront log delivery that requires ACL.
      // BUCKET_OWNER_PREFERRED grants access to the AWS account, not just CF, which
      // should work better for Athena access
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_PREFERRED,
      removalPolicy: props.isProduction ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !props.isProduction,
      lifecycleRules: [
        {
          transitions: [
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          expiration: cdk.Duration.days(365),
        }
      ]
    });

    // Private S3 Bucket for React Website Build Files
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });


    // CloudFront Distribution with OAC, Access Logging & SPA Error Pages
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(websiteBucket);

    const distribution = new cloudfront.Distribution(this, 'WebsiteDistribution', {
      defaultRootObject: 'index.html',
      domainNames: [props.domainName],
      certificate: props.certificate,

      logBucket: logBucket,
      logFilePrefix: 'raw-logs/',

      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
      },

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

    distribution.addBehavior('/assets/*', s3Origin, {
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
    });
 
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

    // =====================================
    // Athena setup for access log quering
    // =====================================

    // Query Result Bucket for Athena
    const athenaQueryResultBucket = new s3.Bucket(this, 'AthenaQueryResultBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [{ expiration: cdk.Duration.days(7) }], // Auto-clean query results
    });

    // Create Athena Database
    const athenaDb = new glue.CfnDatabase(this, 'AccessLogsAthenaDb', {
      catalogId: this.account,
      databaseInput: {
        name: 'website_access_logs_db',
        description: 'Database for CloudFront website access logs',
      },
    });

    // Create Glue Catalog Table for CloudFront Log Format
    const cloudfrontLogsTable = new glue.CfnTable(this, 'CloudFrontLogsGlueTable', {
      catalogId: this.account,
      databaseName: 'website_access_logs_db',
      tableInput: {
        name: 'cloudfront_logs',
        description: 'CloudFront access logs schema',
        tableType: 'EXTERNAL_TABLE',
        parameters: {
          'serialization.null.format': '',
          'skip.header.line.count': '2', // Skip CloudFront log header rows
        },
        storageDescriptor: {
          location: `s3://${logBucket.bucketName}/cloudfront/`,
          inputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
          outputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
          serdeInfo: {
            serializationLibrary: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
            parameters: {
              'field.delim': '\t',
              'serialization.format': '\t',
            },
          },
          columns: [
            { name: 'date', type: 'date' },
            { name: 'time', type: 'string' },
            { name: 'location', type: 'string' },
            { name: 'bytes', type: 'bigint' },
            { name: 'request_ip', type: 'string' },
            { name: 'method', type: 'string' },
            { name: 'host', type: 'string' },
            { name: 'uri', type: 'string' },
            { name: 'status', type: 'int' },
            { name: 'referrer', type: 'string' },
            { name: 'user_agent', type: 'string' },
            { name: 'query_string', type: 'string' },
            { name: 'cookie', type: 'string' },
            { name: 'result_type', type: 'string' },
            { name: 'request_id', type: 'string' },
            { name: 'host_header', type: 'string' },
            { name: 'request_protocol', type: 'string' },
            { name: 'request_bytes', type: 'bigint' },
            { name: 'time_taken', type: 'float' },
            { name: 'xforwarded_for', type: 'string' },
            { name: 'ssl_protocol', type: 'string' },
            { name: 'ssl_cipher', type: 'string' },
            { name: 'response_result_type', type: 'string' },
            { name: 'fle_encrypted_fields', type: 'string' },
            { name: 'fle_status', type: 'string' },
            { name: 'sc_content_type', type: 'string' },
            { name: 'sc_content_len', type: 'bigint' },
            { name: 'sc_range_start', type: 'bigint' },
            { name: 'sc_range_end', type: 'bigint' },
          ],
        },
      },
    });

    // Ensure database exists before table is created
    cloudfrontLogsTable.addResourceDependency(athenaDb);

    // Athena Workgroup (enforces query result location and cost limits)
    const workgroup = new athena.CfnWorkGroup(this, 'AccessLogsWorkgroup', {
      name: 'WebsiteAnalyticsWorkgroup',
      description: 'Workgroup for querying CloudFront access logs',
      state: 'ENABLED',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaQueryResultBucket.bucketName}/results/`,
        },
        // Safeguard: Limit max data scanned per query to avoid unexpected costs
        bytesScannedCutoffPerQuery: 10_000_000_000, // 10 GB limit per query
      },
    });

    // Pre-configured saved Athena console queries:

    const topRequestedPagesQuery = new athena.CfnNamedQuery(this, 'TopRequestedPagesQuery', {
      database: 'website_access_logs_db',
      workGroup: workgroup.name,
      name: 'Top 20 Most Requested Pages',
      description: 'Returns the top 20 requested URIs in the last 7 days',
      queryString: `
        SELECT uri, count(*) AS count
        FROM website_access_logs_db.cloudfront_logs
        WHERE date >= current_date - interval '7' day
        GROUP BY uri
        ORDER BY count DESC
        LIMIT 20;
      `
    });
    topRequestedPagesQuery.addResourceDependency(workgroup);
    topRequestedPagesQuery.addResourceDependency(cloudfrontLogsTable);

    const aIMachineReadableEndpointTotalActivityQuery = new athena.CfnNamedQuery(this, 'AIMachineReadableEndpointTotalActivityQuery', {
      database: 'website_access_logs_db',
      workGroup: workgroup.name,
      name: 'Total Activity on AI & Machine-Readable Endpoints',
      description: 'How many times llms.txt, sitemap.xml, rss.xml, or .md files are requested',
      queryString: `
        SELECT 
            uri,
            status,
            COUNT(*) AS total_requests,
            COUNT(DISTINCT request_ip) AS unique_ips
        FROM website_access_logs_db.cloudfront_logs
        WHERE uri LIKE '%llms.txt%'
          OR uri LIKE '%sitemap%.xml'
          OR uri LIKE '%rss%.xml'
          OR uri LIKE '%.md'
        GROUP BY uri, status
        ORDER BY total_requests DESC;
      `
    });
    aIMachineReadableEndpointTotalActivityQuery.addResourceDependency(workgroup);
    aIMachineReadableEndpointTotalActivityQuery.addResourceDependency(cloudfrontLogsTable);

    const specificAIHarvestersSearchCrawlersQuery = new athena.CfnNamedQuery(this, 'SpecificAIHarvestersSearchCrawlersQuery' , {
      database: 'website_access_logs_db',
      workGroup: workgroup.name,
      name: 'Identify Specific AI Harvesters & Search Crawlers',
      description: 'Filter requests by known AI and Search Engine User-Agents',
      queryString: `
        SELECT 
            CASE 
                WHEN user_agent LIKE '%GPTBot%' THEN 'OpenAI (GPTBot)'
                WHEN user_agent LIKE '%ChatGPT-User%' THEN 'OpenAI (ChatGPT)'
                WHEN user_agent LIKE '%ClaudeBot%' OR user_agent LIKE '%anthropic-ai%' THEN 'Anthropic (Claude)'
                WHEN user_agent LIKE '%PerplexityBot%' THEN 'Perplexity'
                WHEN user_agent LIKE '%Bytespider%' THEN 'ByteDance (TikTok)'
                WHEN user_agent LIKE '%Meta-ExternalAgent%' THEN 'Meta AI'
                WHEN user_agent LIKE '%Amazonbot%' THEN 'Amazon'
                WHEN user_agent LIKE '%Google-Extended%' OR user_agent LIKE '%GoogleOther%' THEN 'Google AI'
                WHEN user_agent LIKE '%CCBot%' THEN 'Common Crawl'
                WHEN user_agent LIKE '%cohere-ai%' THEN 'Cohere'
                WHEN user_agent LIKE '%Applebot-Extended%' THEN 'Apple AI'
                ELSE 'Other / Custom Bot'
            END AS ai_agent,
            uri,
            status,
            COUNT(*) as request_count,
            MAX(concat(cast(date as varchar), ' ', time)) as last_seen_utc
        FROM website_access_logs_db.cloudfront_logs
        WHERE user_agent LIKE '%Bot%'
          OR user_agent LIKE '%Crawler%'
          OR user_agent LIKE '%Spider%'
          OR user_agent LIKE '%GPTBot%'
          OR user_agent LIKE '%ClaudeBot%'
          OR user_agent LIKE '%PerplexityBot%'
          OR user_agent LIKE '%Meta-ExternalAgent%'
        GROUP BY 1, uri, status
        ORDER BY request_count DESC;
      `
    });
    specificAIHarvestersSearchCrawlersQuery.addResourceDependency(workgroup);
    specificAIHarvestersSearchCrawlersQuery.addResourceDependency(cloudfrontLogsTable);

    const trackLLMSTxtVsSitemapXmlFetchFrequencyQuery = new athena.CfnNamedQuery(this ,'TrackLLMSTxtVsSitemapXmlFetchFrequencyQuery', {
      database: 'website_access_logs_db',
      workGroup: workgroup.name,
      name: 'Track llms.txt vs. sitemap.xml Fetch Frequency',
      description: 'Compare how frequently AI bots inspect your llms.txt versus standard search sitemaps',
      queryString: `
        SELECT 
              date,
              SUM(CASE WHEN uri LIKE '%llms.txt' THEN 1 ELSE 0 END) AS llms_txt_hits,
              SUM(CASE WHEN uri LIKE '%sitemap%.xml' THEN 1 ELSE 0 END) AS sitemap_hits,
              SUM(CASE WHEN uri LIKE '%rss%.xml' THEN 1 ELSE 0 END) AS rss_hits,
              SUM(CASE WHEN uri LIKE '%.md' THEN 1 ELSE 0 END) AS markdown_hits
          FROM website_access_logs_db.cloudfront_logs
          WHERE date >= CURRENT_DATE - INTERVAL '30' DAY
          GROUP BY date
          ORDER BY date DESC;
      `
    });
    trackLLMSTxtVsSitemapXmlFetchFrequencyQuery.addResourceDependency(workgroup);
    trackLLMSTxtVsSitemapXmlFetchFrequencyQuery.addResourceDependency(cloudfrontLogsTable);

    const detectUnverifiedOrMaskedAIScrapers = new athena.CfnNamedQuery(this, 'DetectUnverifiedOrMaskedAIScrapers', {
      database: 'website_access_logs_db',
      workGroup: workgroup.name,
      name: 'Detect Unverified / Masked AI Scrapers',
      description: 'Find requests specifically asking for .md or llms.txt using non-standard browsers',
      queryString: `
        SELECT 
            request_ip,
            user_agent,
            uri,
            status,
            COUNT(*) as fetch_count
        FROM website_access_logs_db.cloudfront_logs
        WHERE (uri LIKE '%.md' OR uri LIKE '%llms.txt')
          AND user_agent NOT LIKE '%GPTBot%'
          AND user_agent NOT LIKE '%ClaudeBot%'
          AND user_agent NOT LIKE '%Mozilla%'
        GROUP BY request_ip, user_agent, uri, status
        ORDER BY fetch_count DESC;
      `
    });
    detectUnverifiedOrMaskedAIScrapers.addResourceDependency(workgroup);
    detectUnverifiedOrMaskedAIScrapers.addResourceDependency(cloudfrontLogsTable);


    // ==========================================================
    // GitHub Actions OIDC Deploy Role (Keyless Deployments)
    // ==========================================================
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
            'token.actions.githubusercontent.com:sub': `repo:${props.githubOrg}@${props.githubOrgId}/${props.githubRepo}@${props.githubRepoId}:*`,
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    websiteBucket.grantReadWrite(githubRole);
    distribution.grantCreateInvalidation(githubRole);

    githubRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess')
    );

    // Stack Outputs
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