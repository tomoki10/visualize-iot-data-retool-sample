#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "@aws-cdk/core";
import { RetoolWorkStack } from "../lib/retool-work-stack";

const app = new cdk.App();
new RetoolWorkStack(app, "RetoolWorkStack", {});
