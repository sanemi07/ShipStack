import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { pipeline } from "stream/promises";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_KEY!,
    secretAccessKey: process.env.AWS_SECRET!,
  },
});

const app = express();

app.get("/*", async (req, res) => {
  try {
    const host = req.hostname;
    const id = host.split(".")[0];

    let filepath = req.path;

    // fix root path
    if (filepath === "/") {
      filepath = "/index.html";
    }

    // remove leading slash
    const cleanPath = filepath.replace(/^\/+/, "");

    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET,
      Key: `output/${id}/dist/${cleanPath}`,
    });

    const s3Response = await s3Client.send(command);
    const body = s3Response.Body;

    if (!body) {
      throw new Error(`S3 returned an empty body for path: ${cleanPath}`);
    }

    // ✅ Better content type handling
    const contentType =
      s3Response.ContentType ||
      (cleanPath.endsWith(".html")
        ? "text/html"
        : cleanPath.endsWith(".css")
        ? "text/css"
        : cleanPath.endsWith(".js")
        ? "application/javascript"
        : "application/octet-stream");

    res.setHeader("Content-Type", contentType);

    // ✅ STREAM (correct way)
    await pipeline(body as NodeJS.ReadableStream, res);

  } catch (err) {
    console.error(err);
    res.status(404).send("File not found");
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("Server running");
});
