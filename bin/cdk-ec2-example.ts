#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Ec2Example } from '../lib/cdk-ec2-example';

const app = new cdk.App();
new Ec2Example(app, 'Ec2Example', {});
