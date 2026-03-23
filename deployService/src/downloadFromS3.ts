import {
  GetObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

import path, { dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { pipeline } from "stream/promises";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".npm-cache",
]);


export function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getS3Client() {
  return new S3Client({
    region: getRequiredEnv("AWS_REGION"),
    credentials: {
      accessKeyId: getRequiredEnv("AWS_KEY"),
      secretAccessKey: getRequiredEnv("AWS_SECRET"),
    },
  });
}

export const __fileName = fileURLToPath(import.meta.url);
export const __dirname = dirname(__fileName);
const DOWNLOAD_ROOT = path.resolve(__dirname, "downloads");

function resolveDownloadPath(key: string) {
  const normalizedKey = key.replace(/\\/g, "/");
  const resolvedPath = path.resolve(DOWNLOAD_ROOT, normalizedKey);
  const relativePath = path.relative(DOWNLOAD_ROOT, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to write S3 object outside download root: ${key}`);
  }

  return resolvedPath;
}

export const downloadFilesS3 = async (prefix: string) => {
  const s3Client = getS3Client();
  const bucket = getRequiredEnv("AWS_BUCKET");
  let continuationToken: string | undefined;
  let downloadedCount = 0;

  do {
    const listResponse = await s3Client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    const allPromises =
      listResponse.Contents?.map(async ({ Key }) => {
        if (!Key || Key.endsWith("/")) return;

        const finalOutputPath = resolveDownloadPath(Key);
        const dirName = path.dirname(finalOutputPath);

        fs.mkdirSync(dirName, { recursive: true });

        const response = await s3Client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key,
          })
        );

        const body = response.Body;
        if (!body) {
          throw new Error(`S3 returned an empty body for object: ${Key}`);
        }

        await pipeline(
          body as NodeJS.ReadableStream,
          fs.createWriteStream(finalOutputPath)
        );

        downloadedCount += 1;
        console.log("Downloaded:", Key);
      }) || [];

    await Promise.all(allPromises);
    continuationToken = listResponse.NextContinuationToken;
  } while (continuationToken);

  if (downloadedCount === 0) {
    console.log(`No files found in S3 for prefix: ${prefix}`);
  }

  return downloadedCount;
};


