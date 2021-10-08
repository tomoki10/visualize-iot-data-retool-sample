import * as cdk from "@aws-cdk/core";
import * as iam from "@aws-cdk/aws-iam";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as iot from "@aws-cdk/aws-iot";

export class RetoolWorkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Retool で読み込むテーブルを作成
    const retoolSampleTable = new dynamodb.Table(this, "RetoolSampleTable", {
      partitionKey: { name: "accountId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "createdAt", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const putItemToTableRole = new iam.Role(this, "PutItemToTableRole", {
      assumedBy: new iam.ServicePrincipal("iot.amazonaws.com"),
      inlinePolicies: {
        putItemToTableRole: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: ["dynamodb:PutItem"],
              resources: [retoolSampleTable.tableArn],
            }),
          ],
        }),
      },
    });

    // デバイスがパブリッシュするサブスクライバー
    new iot.CfnTopicRule(this, "WriteRetoolTable", {
      topicRulePayload: {
        sql: `SELECT * FROM 'retool-topic/'`,
        actions: [
          {
            dynamoDBv2: {
              roleArn: putItemToTableRole.roleArn,
              putItem: {
                tableName: retoolSampleTable.tableName,
              },
            },
          },
        ],
        ruleDisabled: false,
        awsIotSqlVersion: "2016-03-23",
      },
      ruleName: `WriteRetoolTable`,
    });

    // Retool 接続用ユーザ
    const retoolUser = new iam.User(this, "retool-user", {
      userName: "retool-user",
    });
    // ユーザ用ポリシー
    const retoolUserPolicyStatement = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ["sts:AssumeRole"],
      resources: [`*`],
    });
    new iam.Policy(this, "retool-user-policy", {
      users: [retoolUser],
      statements: [retoolUserPolicyStatement],
    });

    // 認証情報の取得
    const retoolUserAccessKey = new iam.CfnAccessKey(this, "retool-user-access-key", {
      userName: retoolUser.userName,
    });

    // 認証キーの生成。初回実行以降はコメントアウト
    const accessKeyId = retoolUserAccessKey.ref;
    const secretAccessKey = retoolUserAccessKey.attrSecretAccessKey;

    new cdk.CfnOutput(this, "access-key-id", { value: accessKeyId });
    new cdk.CfnOutput(this, "secret-access-key", {
      value: secretAccessKey,
    });

    // IAMロールを作成
    const retoolAssumeRole = new iam.Role(this, `retool-assume-role`, {
      assumedBy: new iam.ArnPrincipal(retoolUser.userArn), // assume-roleの許可設定
    });

    // Retool で使用するロール用IAMポリシーの設定
    const retoolAssumeRolePolicy = new iam.Policy(this, `retool-assume-role-policy`, {
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: [
            "dynamodb:ListTables",
            "dynamodb:DeleteItem",
            "dynamodb:ListTagsOfResource",
            "dynamodb:DescribeReservedCapacityOfferings",
            "dynamodb:DescribeTable",
            "dynamodb:GetItem",
            "dynamodb:DescribeContinuousBackups",
            "dynamodb:DescribeLimits",
            "dynamodb:BatchGetItem",
            "dynamodb:BatchWriteItem",
            "dynamodb:PutItem",
            "dynamodb:ListBackups",
            "dynamodb:Scan",
            "dynamodb:Query",
            "dynamodb:DescribeStream",
            "dynamodb:UpdateItem",
            "dynamodb:DescribeTimeToLive",
            "dynamodb:ListStreams",
            "dynamodb:DescribeGlobalTableSettings",
            "dynamodb:ListGlobalTables",
            "dynamodb:GetShardIterator",
            "dynamodb:DescribeGlobalTable",
            "dynamodb:DescribeReservedCapacity",
            "dynamodb:DescribeBackup",
            "dynamodb:GetRecords",
          ],
          resources: [
            `arn:aws:dynamodb:ap-northeast-1:*:table/${retoolSampleTable.tableName}`,
            `arn:aws:dynamodb:ap-northeast-1:*:table/${retoolSampleTable.tableName}/index/*`,
          ],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["dynamodb:ListTables"],
          resources: ["*"],
        }),
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["sts:AssumeRole"],
          resources: ["*"],
          conditions: {
            IpAddress: {
              "aws:SourceIp": [
                // See: https://docs.retool.com/docs/connecting-your-database
                "13.80.4.170/32",
                "13.93.15.89/32",
                "13.93.15.84/32",
                "13.76.231.249/32",
                "13.76.97.52/32",
                "13.76.194.227/32",
                "52.177.12.28/32",
                "52.177.12.26/32",
                "52.177.118.220/32",
                "52.175.194.171/32",
                "52.175.251.223/32",
                "52.247.195.225/32",
              ],
            },
          },
        }),
      ],
    });
    retoolAssumeRole.attachInlinePolicy(retoolAssumeRolePolicy);
  }
}
