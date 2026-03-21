import dotenv from 'dotenv';
dotenv.config();

import express from "express";
import cors from "cors";
import { simpleGit } from 'simple-git';
import path, { dirname } from "path";
import { fileURLToPath } from 'url';
import { createClient } from 'redis';

import { genertateId } from './generate.js';
import { getAllFiles } from './getAllFilePath.js';
import { uploadFile } from './uploadfiletoS3.js';

const app = express();

// 🔥 Redis client
const publisher = createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379"
});

publisher.on("error", (err) => {
  console.error("Redis error:", err);
});

app.use(express.json());
app.use(cors());

// __dirname setup (ESM)
const __fileName = fileURLToPath(import.meta.url);
const __dirname = dirname(__fileName);

function toS3Key(filePath: string) {
  return filePath.slice(__dirname.length + 1).split(path.sep).join("/");
}

// Routes
app.get('/', (req, res) => {
  res.send("hello");
});

app.post("/deploy", async (req, res) => {
  try {
    const repourl = req.body.repourl?.toString().trim();

    if (!repourl) {
      return res.status(400).json({ message: "Repository URL is required" });
    }

    const id = genertateId();
    const git = simpleGit();

    console.log("Cloning repo...");
    await git.clone(repourl, path.join(__dirname, `/output/${id}`));
    console.log("Clone complete");

    const files = getAllFiles(path.join(__dirname, `/output/${id}`));
    console.log("Files found:", files.length);

    // 🔥 Upload all files (fail fast)
    await Promise.all(
      files.map(async (file) => {
        try {
          await uploadFile(toS3Key(file), file);
        } catch (err) {
          throw new Error(`Failed to upload: ${file}`);
        }
      })
    );

    console.log("All uploads done");

    // 🔥 Push to Redis queue
    console.log("Pushing to Redis:", id);
    await publisher.lPush("build-queue", id);
    console.log("Pushed successfully");

    return res.status(200).json({ id });

  } catch (error) {
    console.error("Deploy error:", error);

    return res.status(500).json({
      message: "Deployment failed",
      error: error 
    });
  }
});

//  Start server ONLY after Redis connects
async function startServer() {
  try {
    await publisher.connect();
    console.log("Connected to Redis");

    app.listen(process.env.PORT || 3000, () => {
      console.log(`Server running on port ${process.env.PORT || 3000}`);
    });

  } catch (err) {
    console.error("Failed to connect to Redis:", err);
    process.exit(1);
  }
}

startServer();
