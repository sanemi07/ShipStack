import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { pipeline } from "stream/promises";

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getS3Client() {
  return new S3Client({
    region: getRequiredEnv("AWS_REGION"),
    credentials: {
      accessKeyId: getRequiredEnv("AWS_KEY"),
      secretAccessKey: getRequiredEnv("AWS_SECRET"),
    },
  });
}

const __fileName = fileURLToPath(import.meta.url);
const __dirname = dirname(__fileName);

export const downloadFilesS3 = async (prefix: string) => {
  const s3Client = getS3Client();
  let continuationToken: string | undefined;
  let downloadedCount = 0;

  do {
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: getRequiredEnv("AWS_BUCKET"),
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const allPromises =
      listResponse.Contents?.map(async ({ Key }) => {
        if (!Key) return;

        const finalOutputPath = path.join(
          __dirname,
          "downloads",
          Key
        );

        const dirName = path.dirname(finalOutputPath);

        // ✅ safe directory creation
        fs.mkdirSync(dirName, { recursive: true });

        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: getRequiredEnv("AWS_BUCKET"),
            Key,
          })
        );

        const body = response.Body;
        if (!body) return;

        await pipeline(
          body as any,
          fs.createWriteStream(finalOutputPath)
        );

        downloadedCount += 1;
        console.log("Downloaded:", Key);
      }) || [];

    // ✅ wait for all downloads in this batch
    await Promise.all(allPromises);

    // ✅ update pagination AFTER downloads
    continuationToken = listResponse.NextContinuationToken;

  } while (continuationToken);

  if (downloadedCount === 0) {
    console.log(`No files found in S3 for prefix: ${prefix}`);
  }

  return downloadedCount;
};
