import * as cdk from 'aws-cdk-lib';
import { Cors, LambdaIntegration, RestApi } from 'aws-cdk-lib/aws-apigateway';
//import { CfnWebACL, CfnWebACLAssociation } from '@aws-cdk/aws-wafv2';
import {
	Certificate,
	CertificateValidation,
} from 'aws-cdk-lib/aws-certificatemanager';
import { HttpMethod } from 'aws-cdk-lib/aws-events';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction, SourceMapMode } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { ARecord, HostedZone, RecordTarget } from 'aws-cdk-lib/aws-route53';
import { ApiGateway } from 'aws-cdk-lib/aws-route53-targets';
import { Construct } from 'constructs';
import { join } from 'path';

const domain = 'architechinsights.com';

export class MediumFeedApiStack extends cdk.Stack {
	constructor(scope: Construct, id: string, props?: cdk.StackProps) {
		super(scope, id, props);

		const getFeedLambda = new NodejsFunction(this, 'get-feed-lambda', {
			runtime: Runtime.NODEJS_18_X,
			timeout: cdk.Duration.seconds(10),
			entry: join(__dirname, '../src/feed/medium-feed.handler.ts'),
			handler: 'mediumFeed',
			bundling: {
				minify: true,
				sourceMap: true,
				sourceMapMode: SourceMapMode.INLINE,
			},
			logRetention: RetentionDays.SIX_MONTHS,
		});

		// Retrieve the hosted zone
		const hostedZone = HostedZone.fromHostedZoneAttributes(this, 'hostedZone', {
			hostedZoneId: '',
			zoneName: domain,
		});

		const apig = new RestApi(this, 'feed-api', {
			defaultCorsPreflightOptions: {
				allowOrigins: [
					'https://architechinsights.com',
					'http://localhost:3000/',
				],
				allowHeaders: Cors.DEFAULT_HEADERS,
				allowMethods: Cors.ALL_METHODS,
			},
			domainName: {
				domainName: `api.${domain}`,
				certificate: new Certificate(this, 'Certificate', {
					domainName: `api.${domain}`,
					validation: CertificateValidation.fromDns(hostedZone),
				}),
			},
		});

		// // enable waf
		// //Web ACL
		// const APIGatewayWebACL = new CfnWebACL(this, 'APIGatewayWebACL', {
		// 	name: 'demo-api-gateway-webacl',
		// 	description: 'This is WebACL for Auth APi Gateway',
		// 	scope: 'REGIONAL',
		// 	defaultAction: { block: {} },
		// 	visibilityConfig: {
		// 		metricName: 'demo-APIWebACL',
		// 		cloudWatchMetricsEnabled: true,
		// 		sampledRequestsEnabled: true,
		// 	},
		// 	rules: [
		// 		{
		// 			name: 'demo-rateLimitRule',
		// 			priority: 20,
		// 			action: { block: {} },
		// 			visibilityConfig: {
		// 				metricName: 'demo-rateLimitRule',
		// 				cloudWatchMetricsEnabled: true,
		// 				sampledRequestsEnabled: false,
		// 			},
		// 			statement: {
		// 				rateBasedStatement: {
		// 					aggregateKeyType: 'IP',
		// 					limit: 20,
		// 				},
		// 			},
		// 		},
		// 	],
		// });

		// // Web ACL Association
		// // const APIGatewayWebACLAssociation =
		// new CfnWebACLAssociation(this, 'APIGatewayWebACLAssociation', {
		// 	webAclArn: APIGatewayWebACL.attrArn,
		// 	resourceArn: cdk.Fn.join('', [
		// 		'arn:aws:apigateway:eu-west-1::/restapis/',
		// 		apig.restApiId,
		// 		'/stages/prod',
		// 	]),
		// });

		// Create the DNS entry for our website and point to the ALB
		new ARecord(this, 'ARecord', {
			zone: hostedZone,
			recordName: `api.${domain}`,
			ttl: cdk.Duration.minutes(5),
			target: RecordTarget.fromAlias(new ApiGateway(apig)),
		});

		const apigFeed = apig.root.addResource('feed');
		apigFeed.addMethod(HttpMethod.GET, new LambdaIntegration(getFeedLambda), {
			apiKeyRequired: true,
		});

		const key = apig.addApiKey('feed-api-key', {
			apiKeyName: 'feed-api',
			value: '',
		});

		const plan = apig.addUsagePlan('usage-plan', {
			name: 'feed-plan',
			throttle: {
				rateLimit: 10,
				burstLimit: 2,
			},
			apiStages: [{ stage: apig.deploymentStage }],
		});
		plan.addApiKey(key);
	}
}
