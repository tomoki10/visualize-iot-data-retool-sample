import * as fs from "fs";
import * as readline from "readline";
import * as IotClient from "./helpers/iot/iot-client";

interface IotPayload {
  accountId: string;
  createdAt: number;
  date: string;
  answer: string;
}

const sleep = async (ms: any) => {
  return new Promise((r) => setTimeout(r, ms));
};

const HEADER_FIRST_COLUMN_NAME = "accountId";

const main = async () => {
  const fileName = process.argv[2];
  const topicName = process.argv[3];
  const stream = fs.createReadStream(fileName, "utf8");
  const reader = readline.createInterface({
    input: stream,
  });
  for await (const line of reader) {
    await sleep(500);
    const splitCsvLine = line.split(",");
    // Header以外の行の場合に実行
    if (splitCsvLine[0] !== HEADER_FIRST_COLUMN_NAME) {
      console.log(splitCsvLine);
      const iotPayload: IotPayload = {
        accountId: splitCsvLine[0],
        createdAt: Number(splitCsvLine[1]),
        date: splitCsvLine[2],
        answer: splitCsvLine[3],
      };
      await IotClient.publish(topicName, iotPayload);
    }
  }
};

(async () => await main())();
