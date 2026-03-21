import fs from "fs";
import path from "path";

const IGNORED_DIRECTORIES = new Set([
  ".git",
  "node_modules",
  ".npm-cache",
]);

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
