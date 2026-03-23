import dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { createClient } from "redis";
import { downloadFilesS3 } from "./downloadFromS3.js";
import { buildProject } from "./buildjs.js";
import { getAllFiles, uploadFilesWithConcurrency } from "./uploadtoS3.js";
import path from "path"
import { __dirname } from "./downloadFromS3.js";

const subscriber = createClient();
const publisher=createClient()
const DOWNLOAD_ROOT = path.resolve(__dirname, "downloads", "output");

async function main() {
  subscriber.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  await subscriber.connect();
  await publisher.connect()

  while (true) {
    const response = await subscriber.brPop("build-queue", 0);
    const deploymentId = response?.element?.trim();

    if (!deploymentId) {
      console.error("Received empty deployment id from build queue");
      continue;
    }

    try {
      const downloaded = await downloadFilesS3(`output/${deploymentId}`);
      console.log(`[${deploymentId}] downloaded ${downloaded} file(s)`);

      const result = await buildProject(deploymentId);
      console.log(`[${deploymentId}] ${result}`);

      const buildOutputPath = path.join(DOWNLOAD_ROOT, deploymentId, "dist");
      if (!path.isAbsolute(buildOutputPath)) {
        throw new Error(`Invalid build output path for deployment: ${deploymentId}`);
      }

      if (!fs.existsSync(buildOutputPath)) {
        throw new Error(
          `[${deploymentId}] build output directory not found at ${buildOutputPath}. Check whether the project writes its production build to dist/.`
        );
      }

      const files = getAllFiles(buildOutputPath);
      await uploadFilesWithConcurrency(files, buildOutputPath, `output/${deploymentId}/dist`);
      console.log("all uploads done")
      publisher.hSet("status",deploymentId,"deployed")

      

    } catch (error) {
      console.error(`[${deploymentId}] job failed`, error);
    }
  }
}

main().catch(console.error);
