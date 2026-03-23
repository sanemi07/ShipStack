import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import fs from "fs";
import path from "path";

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

function getBucketName() {
  return getRequiredEnv("AWS_BUCKET");
}

function normalizeS3Key(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/").replace(/^\/+/, "");

  if (!normalized || normalized.includes("../")) {
    throw new Error(`Invalid S3 key: ${fileName}`);
  }

  return normalized;
}

export const uploadFile = async (fileName: string, localFilePath: string) => {
  const resolvedLocalPath = path.resolve(localFilePath);
  const s3Client = getS3Client();
  const bucket = getBucketName();

  if (!fs.existsSync(resolvedLocalPath)) {
    throw new Error(`Local file does not exist: ${resolvedLocalPath}`);
  }

  const fileStream = fs.createReadStream(resolvedLocalPath);
  const upload = new Upload({
    client: s3Client,
    params: {
      Body: fileStream,
      Bucket: bucket,
      Key: normalizeS3Key(fileName),
    },
  });

  try {
    const result = await upload.done();
    console.log("Uploaded:", fileName);
    return result;
  } catch (err) {
    console.error("Upload failed:", fileName, err);
    throw err;
  }
};
