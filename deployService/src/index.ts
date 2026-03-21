import dotenv from "dotenv";
dotenv.config();

import { createClient } from "redis";
import { downloadFilesS3 } from "./downloadFromS3.js";
import { buildProject } from "./buildjs.js";

const subscriber = createClient();

async function main() {
  subscriber.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  await subscriber.connect();

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
      

    } catch (error) {
      console.error(`[${deploymentId}] job failed`, error);
    }
  }
}

main().catch(console.error);
