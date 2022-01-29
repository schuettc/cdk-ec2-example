import { Construct } from 'constructs';
import { Stack, Duration } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ec2 from 'aws-cdk-lib/aws-ec2';

export class Ec2Example extends Stack {
  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'AsteriskPublic',
          subnetType: ec2.SubnetType.PUBLIC,
        },
      ],
    });

    const ec2Eip = new ec2.CfnEIP(this, 'ec2Eip');

    const ec2Instance = new ec2.Instance(this, 'Instance', {
      vpc,
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T4G,
        ec2.InstanceSize.MICRO,
      ),
      machineImage: new ec2.AmazonLinuxImage({
        generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      init: ec2.CloudFormationInit.fromConfigSets({
        configSets: {
          default: ['install', 'config'],
        },
        configs: {
          install: new ec2.InitConfig([
            ec2.InitFile.fromObject('/etc/config.json', {
              IP: ec2Eip.ref,
            }),
            ec2.InitFile.fromFileInline(
              '/etc/install.sh',
              './src/asteriskConfig/install.sh',
            ),
            ec2.InitCommand.shellCommand('chmod +x /etc/install.sh'),
            ec2.InitCommand.shellCommand('cd /tmp'),
            ec2.InitCommand.shellCommand('/etc/install.sh'),
          ]),
          config: new ec2.InitConfig([
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/pjsip.conf',
              './src/asteriskConfig/pjsip.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/asterisk.conf',
              './src/asteriskConfig/asterisk.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/asterisk/logger.conf',
              './src/asteriskConfig/logger.conf',
            ),
            ec2.InitFile.fromFileInline(
              '/etc/config_asterisk.sh',
              './src/asteriskConfig/config_asterisk.sh',
            ),
            ec2.InitCommand.shellCommand('chmod +x /etc/config_asterisk.sh'),
            ec2.InitCommand.shellCommand('/etc/config_asterisk.sh'),
          ]),
        },
      }),
      initOptions: {
        timeout: Duration.minutes(15),
      },
      role: new iam.Role(this, 'ec2Role', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            'AmazonSSMManagedInstanceCore',
          ),
        ],
      }),
    });

    new ec2.CfnEIPAssociation(this, 'EIP Association', {
      eip: ec2Eip.ref,
      instanceId: ec2Instance.instanceId,
    });
  }
}
