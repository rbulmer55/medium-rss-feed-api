#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MediumFeedApiStack } from '../lib/medium-feed-api-stack';

const app = new cdk.App();
new MediumFeedApiStack(app, 'MediumFeedApiStack', {
	env: { account: '727626130853', region: 'eu-west-1' },
});
