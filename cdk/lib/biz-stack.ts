import * as fs from 'node:fs';
import * as path from 'node:path';
import { CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecrAssets from 'aws-cdk-lib/aws-ecr-assets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3Assets from 'aws-cdk-lib/aws-s3-assets';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

const repoRoot = path.join(__dirname, '..', '..');
const buildEnv = Object.fromEntries(
  fs
    .readFileSync(path.join(repoRoot, 'build.env'), 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.includes('=') && !line.startsWith('#'))
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);

export interface BizStackProps extends StackProps {
  appDomainName: string;
  apiDomainName: string;
  hostedZoneId?: string;
  hostedZoneName: string;
  acmeEmail: string;
  instanceType: string;
}

export class BizStack extends Stack {
  constructor(scope: Construct, id: string, props: BizStackProps) {
    super(scope, id, props);

    const instanceType = new ec2.InstanceType(props.instanceType);
    const isArm = instanceType.architecture === ec2.InstanceArchitecture.ARM_64;
    const secretsParameterName = `/${this.stackName}/secrets`;

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 1,
      natGateways: 0,
      subnetConfiguration: [{ name: 'Public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 }],
    });

    const hostSecurityGroup = new ec2.SecurityGroup(this, 'HostSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'biz app host (Caddy on 80/443, no SSH; use SSM)',
    });
    hostSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'HTTP');
    hostSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443), 'HTTPS');
    hostSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.udp(443), 'HTTP/3');

    const backupBucket = new s3.Bucket(this, 'Backups', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
      lifecycleRules: [{ prefix: 'mysql/', expiration: Duration.days(30) }],
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const platform = isArm ? ecrAssets.Platform.LINUX_ARM64 : ecrAssets.Platform.LINUX_AMD64;
    const image = (target: string) =>
      new ecrAssets.DockerImageAsset(this, `${target}Image`, {
        directory: repoRoot,
        file: 'Dockerfile',
        target,
        platform,
        buildArgs: {
          NODE_VERSION_MAJOR: process.env.NODE_VERSION_MAJOR ?? buildEnv.NODE_VERSION_MAJOR,
          BUILD_ENV: 'prod',
        },
      });
    const apiImage = image('api-production');
    const webImage = image('web-production');
    const hostBundle = new s3Assets.Asset(this, 'HostBundle', { path: path.join(__dirname, '..', 'host') });

    const logGroup = new logs.LogGroup(this, 'Logs', {
      logGroupName: `/${this.stackName}/containers`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const deployParameter = new ssm.StringParameter(this, 'DeployParameter', {
      parameterName: `/${this.stackName}/deploy`,
      stringValue: JSON.stringify({
        api: apiImage.imageUri,
        web: webImage.imageUri,
        hostBundle: hostBundle.s3ObjectUrl,
        mysqlVersion: buildEnv.MYSQL_VERSION,
        appDomain: props.appDomainName,
        apiDomain: props.apiDomainName,
        acmeEmail: props.acmeEmail,
        logGroup: logGroup.logGroupName,
        backupBucket: backupBucket.bucketName,
        secretsParameter: secretsParameterName,
      }),
    });

    const role = new iam.Role(this, 'HostRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });
    apiImage.repository.grantPull(role);
    webImage.repository.grantPull(role);
    hostBundle.grantRead(role);
    deployParameter.grantRead(role);
    backupBucket.grantReadWrite(role);
    logGroup.grantWrite(role);
    // The host creates this SecureString itself (CloudFormation cannot), encrypted with the free aws/ssm key.
    role.addToPolicy(
      new iam.PolicyStatement({
        actions: ['ssm:GetParameter', 'ssm:PutParameter'],
        resources: [`arn:${this.partition}:ssm:${this.region}:${this.account}:parameter${secretsParameterName}`],
      }),
    );

    // Kept stable on purpose: all deploy logic ships in the host bundle so user data never changes.
    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      'set -euxo pipefail',
      'dnf install -y docker jq unzip',
      'systemctl enable --now docker',
      'if [ ! -f /swapfile ]; then fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile && echo "/swapfile none swap sw 0 0" >> /etc/fstab; fi',
      'swapon -a',
      'mkdir -p /opt/biz',
      "cat > /opt/biz/update.sh <<'BIZ_UPDATE'",
      '#!/usr/bin/env bash',
      'set -euo pipefail',
      `export AWS_REGION=${this.region} AWS_DEFAULT_REGION=${this.region}`,
      `config="$(aws ssm get-parameter --name ${deployParameter.parameterName} --query Parameter.Value --output text)"`,
      'bundle="$(mktemp -d)"',
      'aws s3 cp "$(jq -r .hostBundle <<<"$config")" "$bundle/host.zip" --only-show-errors',
      'unzip -q "$bundle/host.zip" -d "$bundle/host"',
      'chmod 700 "$bundle"/host/*.sh',
      'rm -rf /opt/biz/host && mv "$bundle/host" /opt/biz/host && rm -rf "$bundle"',
      'BIZ_CONFIG="$config" exec /opt/biz/host/deploy.sh',
      'BIZ_UPDATE',
      'chmod 700 /opt/biz/update.sh',
      '/opt/biz/update.sh',
    );

    const host = new ec2.Instance(this, 'Host', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType,
      // Resolved at launch so new AMI releases never replace the instance (the database lives on it).
      machineImage: ec2.MachineImage.resolveSsmParameterAtLaunch(
        `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-${isArm ? 'arm64' : 'x86_64'}`,
      ),
      securityGroup: hostSecurityGroup,
      role,
      userData,
      userDataCausesReplacement: false,
      requireImdsv2: true,
      creditSpecification: ec2.CpuCredits.STANDARD,
      blockDevices: [
        {
          deviceName: '/dev/xvda',
          volume: ec2.BlockDeviceVolume.ebs(8, {
            volumeType: ec2.EbsDeviceVolumeType.GP3,
            encrypted: true,
            deleteOnTermination: false,
          }),
        },
      ],
    });

    const eip = new ec2.CfnEIP(this, 'HostIp', { domain: 'vpc', instanceId: host.instanceId });

    // Rolls new images/scripts onto the running host. Ignored on first boot, when user data deploys itself.
    const sendDeploy: cr.AwsSdkCall = {
      service: 'SSM',
      action: 'sendCommand',
      parameters: {
        InstanceIds: [host.instanceId],
        DocumentName: 'AWS-RunShellScript',
        Comment: `biz deploy ${this.stackName}`,
        Parameters: { commands: ['/opt/biz/update.sh'] },
        CloudWatchOutputConfig: { CloudWatchOutputEnabled: true, CloudWatchLogGroupName: logGroup.logGroupName },
      },
      physicalResourceId: cr.PhysicalResourceId.of(
        [host.instanceId, apiImage.assetHash, webImage.assetHash, hostBundle.assetHash].join(':'),
      ),
      ignoreErrorCodesMatching: 'InvalidInstanceId',
    };
    const deployCommand = new cr.AwsCustomResource(this, 'DeployCommand', {
      onCreate: sendDeploy,
      onUpdate: sendDeploy,
      installLatestAwsSdk: false,
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['ssm:SendCommand'],
          resources: [
            `arn:${this.partition}:ssm:${this.region}::document/AWS-RunShellScript`,
            `arn:${this.partition}:ec2:${this.region}:${this.account}:instance/${host.instanceId}`,
          ],
        }),
      ]),
    });
    deployCommand.node.addDependency(deployParameter);

    if (props.hostedZoneId) {
      const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
        hostedZoneId: props.hostedZoneId,
        zoneName: props.hostedZoneName,
      });
      for (const [recordId, recordName] of [
        ['AppRecord', props.appDomainName],
        ['ApiRecord', props.apiDomainName],
      ]) {
        new route53.ARecord(this, recordId, {
          zone,
          recordName,
          target: route53.RecordTarget.fromIpAddresses(eip.attrPublicIp),
          ttl: Duration.minutes(5),
        });
      }
    }

    new CfnOutput(this, 'InstanceId', { value: host.instanceId });
    new CfnOutput(this, 'PublicIp', { value: eip.attrPublicIp });
    new CfnOutput(this, 'AppUrl', { value: `https://${props.appDomainName}` });
    new CfnOutput(this, 'ApiUrl', { value: `https://${props.apiDomainName}` });
    new CfnOutput(this, 'BackupBucketName', { value: backupBucket.bucketName });
    new CfnOutput(this, 'SecretsParameterName', { value: secretsParameterName });
    new CfnOutput(this, 'LogGroupName', { value: logGroup.logGroupName });
  }
}
