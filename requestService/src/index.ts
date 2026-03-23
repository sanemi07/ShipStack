import { GetObjectCommand, NoSuchKey, S3Client } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function normalizeRequestedPath(requestPath: string) {
  const trimmedPath = requestPath.replace(/^\/+/, "");
  return trimmedPath || "index.html";
}

function buildCandidateKeys(siteId: string, requestPath: string) {
  const normalizedPath = normalizeRequestedPath(requestPath);
  const exactKey = `output/${siteId}/dist/${normalizedPath}`;
  const isAssetRequest = normalizedPath.includes(".");

  return isAssetRequest ? [exactKey] : [exactKey, `output/${siteId}/dist/index.html`];
}

const CONTENT_TYPES: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function getContentTypeFromPath(filePath: string) {
  const extension = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

const app = express();

const bucket = getRequiredEnv("AWS_BUCKET");
const s3Client = new S3Client({
  region: getRequiredEnv("AWS_REGION"),
  credentials: {
    secretAccessKey: getRequiredEnv("AWS_SECRET"),
    accessKeyId: getRequiredEnv("AWS_KEY"),
  },
});

function resolveDeploymentId(req: express.Request) {
  const requestedDeploymentId = req.query.id?.toString().trim();
  if (requestedDeploymentId) {
    return requestedDeploymentId;
  }

  const host = req.hostname;
  const subdomain = host.split(".")[0]?.trim();

  if (!subdomain || subdomain === "localhost" || subdomain === "127" || subdomain === "www") {
    return undefined;
  }

  return subdomain;
}

app.get("/{*path}", async (req, res) => {
  const siteId = resolveDeploymentId(req);

  if (!siteId) {
    res.status(400).send("Unable to determine site id. Use a deployment subdomain or pass ?id=<deployment-id>.");
    return;
  }

  const candidateKeys = buildCandidateKeys(siteId, req.path);

  for (const key of candidateKeys) {
    try {
      const response = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      if (!response.Body) {
        res.status(404).send("File not found");
        return;
      }

      res.set("Content-Type", response.ContentType || getContentTypeFromPath(key));

      if (response.ContentLength !== undefined) {
        res.setHeader("Content-Length", response.ContentLength.toString());
      }

      if (response.CacheControl) {
        res.setHeader("Cache-Control", response.CacheControl);
      }

      const bodyStream = response.Body as NodeJS.ReadableStream;
      bodyStream.on("error", (error) => {
        console.error("S3 stream error:", error);

        if (!res.headersSent) {
          res.status(500).send("Failed to stream file");
        } else {
          res.destroy(error as Error);
        }
      });

      bodyStream.pipe(res);
      return;
    } catch (error) {
      const isMissingObject =
        error instanceof NoSuchKey ||
        (typeof error === "object" &&
          error !== null &&
          "$metadata" in error &&
          typeof error.$metadata === "object" &&
          error.$metadata !== null &&
          "httpStatusCode" in error.$metadata &&
          error.$metadata.httpStatusCode === 404);

      if (isMissingObject) {
        continue;
      }

      console.error("Failed to fetch file from S3:", error);
      res.status(500).send("Failed to fetch file");
      return;
    }
  }

  res.status(404).send("File not found");
});

app.listen(process.env.PORT || 3001, () => {
  console.log("server running");
});
