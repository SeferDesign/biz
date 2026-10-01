#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BizStack } from '../lib/biz-stack';

const app = new cdk.App();
const context = (key: string, envKey: string): string | undefined =>
  app.node.tryGetContext(key) ?? process.env[envKey] ?? undefined;

new BizStack(app, 'biz-prod', {
  stackName: 'biz-prod',
  env: {
    account: context('account', 'CDK_DEFAULT_ACCOUNT'),
    region: context('region', 'CDK_DEFAULT_REGION') ?? 'us-east-1',
  },
  tags: {
    Project: 'biz',
    Environment: 'prod',
  },
  appDomainName: context('appDomainName', 'APP_DOMAIN_NAME') ?? 'biz.seferdesign.com',
  apiDomainName: context('apiDomainName', 'API_DOMAIN_NAME') ?? 'api.biz.seferdesign.com',
  hostedZoneId: context('hostedZoneId', 'HOSTED_ZONE_ID'),
  hostedZoneName: context('hostedZoneName', 'HOSTED_ZONE_NAME') ?? 'seferdesign.com',
  acmeEmail: context('acmeEmail', 'ACME_EMAIL') ?? 'info@seferdesign.com',
  instanceType: context('instanceType', 'INSTANCE_TYPE') ?? 't4g.micro',
  backupRetentionDays: Number(context('backupRetentionDays', 'BACKUP_RETENTION_DAYS') ?? 30),
});
