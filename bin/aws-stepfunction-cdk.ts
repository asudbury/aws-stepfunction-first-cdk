#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AwsStepfunctionCdkStack } from '../lib/aws-stepfunction-cdk-stack';

  const app = new cdk.App();
  new AwsStepfunctionCdkStack(app, 'AwsStepfunctionCdkStack', {
});