import * as IotData from "aws-sdk/clients/iotdata";

const IOT_ENDPOINT = process.env.IOT_ENDPOINT!;
const REGION = "ap-northeast-1";

const TOPIC_PREFIX = process.env.TOPIC_PREFIX ? process.env.TOPIC_PREFIX : "";
const TOPIC_SUFFIX = process.env.TOPIC_SUFFIX ? process.env.TOPIC_SUFFIX : "";

export const iotDataClient = new IotData({
  endpoint: IOT_ENDPOINT,
  region: REGION,
});

export const publish = async (topicName: string, payload: any): Promise<void> => {
  const publishParam: IotData.PublishRequest = {
    topic: `${TOPIC_PREFIX}${topicName}${TOPIC_SUFFIX}`,
    payload: JSON.stringify(payload),
  };
  await iotDataClient.publish(publishParam).promise();
};
