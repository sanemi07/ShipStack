import fs from "fs"
import path from "path"
import { getS3Client } from "./downloadFromS3.js";
import { Upload } from "@aws-sdk/lib-storage";




const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".npm-cache",
]);
const MAX_UPLOAD_CONCURRENCY = 8;


function normalizeS3Key(fileName: string) {
  const normalized = fileName.replace(/\\/g, "/").replace(/^\/+/, "");

  if (!normalized || normalized.includes("../")) {
    throw new Error(`Invalid S3 key: ${fileName}`);
  }

  return normalized;
}

function resolveInsideRoot(rootPath: string, candidatePath: string) {
  const resolvedRoot = path.resolve(rootPath);
  const resolvedCandidate = path.resolve(candidatePath);
  const relativePath = path.relative(resolvedRoot, resolvedCandidate);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Path escaped upload root: ${candidatePath}`);
  }

  return resolvedCandidate;
}

export const getAllFiles = (dirPath: string, rootPath: string = dirPath): string[] => {
  const safeDirPath = resolveInsideRoot(rootPath, dirPath);
  const response: string[] = [];
  const entries = fs.readdirSync(safeDirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      continue;
    }

    const fullPath = resolveInsideRoot(rootPath, path.join(safeDirPath, entry.name));

    if (entry.isDirectory()) {
      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      response.push(...getAllFiles(fullPath, rootPath));
    } else if (entry.isFile()) {
      response.push(fullPath);
    }
  }

  return response;
};


export const uploadFile = async (fileName: string, localFilePath: string) => {
  const resolvedLocalPath = path.resolve(localFilePath);

  if (!fs.existsSync(resolvedLocalPath)) {
    throw new Error(`Local file does not exist: ${resolvedLocalPath}`);
  }

  const fileStream = fs.createReadStream(resolvedLocalPath);
  const upload = new Upload({
    client: getS3Client(),
    params: {
      Body: fileStream,
      Bucket: process.env.AWS_BUCKET,
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

function toS3Key(filePath: string, rootPath: string, keyPrefix = "") {
  const resolvedRootPath = path.resolve(rootPath);
  const resolvedFilePath = resolveInsideRoot(resolvedRootPath, filePath);
  const relativePath = path.relative(resolvedRootPath, resolvedFilePath);

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`File path escaped upload root: ${filePath}`);
  }

  return normalizeS3Key(path.posix.join(keyPrefix, relativePath.split(path.sep).join("/")));
}

export async function uploadFilesWithConcurrency(
  files: string[],
  rootPath: string,
  keyPrefix = ""
) {
  for (let index = 0; index < files.length; index += MAX_UPLOAD_CONCURRENCY) {
    const batch = files.slice(index, index + MAX_UPLOAD_CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        await uploadFile(toS3Key(file, rootPath, keyPrefix), file);
      })
    );
  }
}
