import fs from "fs";
import path from "path";

export const getAllFiles = (dirPath: string): string[] => {
  let response: string[] = [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      response.push(...getAllFiles(fullPath));
    } else if (entry.isFile()) {
      response.push(fullPath);
    }
  }

  return response;
};