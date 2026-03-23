import dotenv from "dotenv";
dotenv.config();

import cors from "cors";
import express from "express";
import fs from "fs/promises";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createClient } from "redis";
import { simpleGit } from "simple-git";

import { genertateId } from "./generate.js";
import { getAllFiles } from "./getAllFilePath.js";
import { uploadFile } from "./uploadfiletoS3.js";

const app = express();
const git = simpleGit();
const publisher = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});
const subscriber=createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

const __fileName = fileURLToPath(import.meta.url);
const __dirname = dirname(__fileName);
const OUTPUT_ROOT = path.resolve(__dirname, "output");
const MAX_UPLOAD_CONCURRENCY = 8;

function validateRepoUrl(repoUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(repoUrl);
  } catch {
    throw new Error("Repository URL must be a valid absolute URL");
  }

  if (!["https:", "http:"].includes(parsedUrl.protocol)) {
    throw new Error("Only http(s) repository URLs are allowed");
  }

  return parsedUrl.toString();
}

function resolveOutputPath(id: string) {
  const outputPath = path.resolve(OUTPUT_ROOT, id);
  const relativePath = path.relative(OUTPUT_ROOT, outputPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Resolved output path escaped output root for id: ${id}`);
  }

  return outputPath;
}

function toS3Key(filePath: string) {
  const resolvedFilePath = path.resolve(filePath);
  const relativePath = path.relative(__dirname, resolvedFilePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`File path escaped upload root: ${filePath}`);
  }

  return relativePath.split(path.sep).join("/");
}

async function uploadFilesWithConcurrency(files: string[]) {
  for (let index = 0; index < files.length; index += MAX_UPLOAD_CONCURRENCY) {
    const batch = files.slice(index, index + MAX_UPLOAD_CONCURRENCY);

    await Promise.all(
      batch.map(async (file) => {
        await uploadFile(toS3Key(file), file);
      })
    );
  }
}

publisher.on("error", (err) => {
  console.error("Redis error:", err);
});

app.use(express.json({ limit: "16kb" }));
app.use(cors());

app.get("/", (_req, res) => {
  res.send("hello");
});

app.post("/deploy", async (req, res) => {
  let outputPath: string | undefined;

  try {
    const repoUrl = validateRepoUrl(req.body.repourl?.toString().trim() || "");
    const id = genertateId();

    await fs.mkdir(OUTPUT_ROOT, { recursive: true });

    outputPath = resolveOutputPath(id);
    await fs.rm(outputPath, { recursive: true, force: true });

    console.log("Cloning repo...");
    await git.clone(repoUrl, outputPath, ["--depth", "1"]);
    console.log("Clone complete");

    const files = getAllFiles(outputPath);
    console.log("Files found:", files.length);

    await uploadFilesWithConcurrency(files);
    console.log("All uploads done");

    console.log("Pushing to Redis:", id);
    await publisher.lPush("build-queue", id);
    console.log("Pushed successfully");
    await publisher.hSet("status",id,"uploaded")

    return res.status(200).json({ id });
  } catch (error) {
    console.error("Deploy error:", error);

    return res.status(500).json({
      message: "Deployment failed",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    if (outputPath) {
      await fs.rm(outputPath, { recursive: true, force: true }).catch((cleanupError) => {
        console.error("Cleanup failed:", cleanupError);
      });
    }
  }
});
app.get("/status", async (req, res) => {
    const id = req.query.id;
    const response = await subscriber.hGet("status", id as string);
    res.json({
        status: response
    })
})

async function startServer() {
  try {
    await publisher.connect();
    await subscriber.connect()
    console.log("Connected to Redis");

    app.listen(process.env.PORT || 3002, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });
  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }
}

startServer();
