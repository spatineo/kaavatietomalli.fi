import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import * as custom_resources from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';

export interface CertificateStackProps extends cdk.StackProps {
  domainName: string;
}

export class CertificateStack extends cdk.Stack {
    public readonly certificate: acm.ICertificate;
    public readonly hostedZone: route53.IHostedZone;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        this.hostedZone = new route53.PublicHostedZone(this, 'HostedZone', {
        zoneName: props.domainName,
        comment: 'Public hosted zone for kaavatietomalli.fi',
        });

        this.certificate = new acm.Certificate(this, 'SiteCertificate', {
        domainName: props.domainName,
        validation: acm.CertificateValidation.fromDns(this.hostedZone),
        });

        // Automatically update Route 53 Registrar name servers to match the new Hosted Zone
        new custom_resources.AwsCustomResource(this, 'UpdateDomainNameServers', {
            onCreate: {
                service: 'Route53Domains',
                action: 'updateDomainNameservers', // Calls AWS SDK under the hood
                region: 'us-east-1',
                parameters: {
                DomainName: props.domainName,
                Nameservers: [
                    { Name: cdk.Fn.select(0, this.hostedZone.hostedZoneNameServers!) },
                    { Name: cdk.Fn.select(1, this.hostedZone.hostedZoneNameServers!) },
                    { Name: cdk.Fn.select(2, this.hostedZone.hostedZoneNameServers!) },
                    { Name: cdk.Fn.select(3, this.hostedZone.hostedZoneNameServers!) },
                ],
                },
                physicalResourceId: custom_resources.PhysicalResourceId.of(`UpdateNS-${props.domainName}`),
            },
            policy: custom_resources.AwsCustomResourcePolicy.fromStatements([
                new iam.PolicyStatement({
                actions: ['route53domains:UpdateDomainNameservers'],
                resources: ['*'],
                }),
            ]),
        });
    }
}

