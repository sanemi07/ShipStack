import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const JOB_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function getDockerFailureMessage(stderr: string, code: number | null) {
  if (
    stderr.includes("dockerDesktopLinuxEngine") ||
    stderr.includes("docker_engine") ||
    stderr.includes("The system cannot find the file specified")
  ) {
    return "Docker engine is not running or is inaccessible on this machine. Start Docker Desktop and make sure the current user can access the Docker named pipe.";
  }

  if (stderr.includes("Access is denied")) {
    return "Docker is installed, but the current user does not have permission to access it. Try starting Docker Desktop and running the service with the right privileges.";
  }

  return `Build failed with exit code ${code ?? "unknown"}`;
}

function getBuildCommand(projectPath: string) {
  const packageLockPath = path.join(projectPath, "package-lock.json");
  const installCommand = fs.existsSync(packageLockPath)
    ? "npm ci"
    : "npm install";

  return `echo '[builder] Installing dependencies' && ${installCommand} && echo '[builder] Running build' && npm run build`;
}

function validateJobId(id: string) {
  const normalized = id.trim();

  if (!JOB_ID_PATTERN.test(normalized)) {
    throw new Error(`Invalid deployment id: ${id}`);
  }

  return normalized;
}

function resolveProjectPath(id: string) {
  const basePath = path.resolve(__dirname, "downloads", "output");
  const projectPath = path.resolve(basePath, validateJobId(id));
  const relativePath = path.relative(basePath, projectPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Resolved project path escaped build root for id: ${id}`);
  }

  return projectPath;
}

function toDockerMountPath(hostPath: string) {
  const resolvedPath = path.resolve(hostPath);

  if (process.platform !== "win32") {
    return resolvedPath;
  }

  const normalizedPath = resolvedPath.replace(/\\/g, "/");

  if (process.env.DOCKER_DESKTOP_WSL === "1") {
    const driveMatch = normalizedPath.match(/^([A-Za-z]):(.*)$/);

    if (!driveMatch || !driveMatch[1] || driveMatch[2] === undefined) {
      throw new Error(`Unable to convert Windows path for WSL mount: ${resolvedPath}`);
    }

    const driveLetter = driveMatch[1];
    const rest = driveMatch[2];
    return `/mnt/${driveLetter.toLowerCase()}${rest}`;
  }

  return normalizedPath;
}

const __fileName = fileURLToPath(import.meta.url);
const __dirname = dirname(__fileName);

export const buildProject = async (id: string) => {
  const deploymentId = validateJobId(id);
  const projectPath = resolveProjectPath(deploymentId);

  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project directory does not exist: ${projectPath}`);
  }

  const dockerPath = toDockerMountPath(projectPath);
  const buildCommand = getBuildCommand(projectPath);

  return new Promise<string>((resolve, reject) => {
    let stderrOutput = "";

    const docker = spawn(
      "docker",
      [
        "run",
        "--rm",
        "--memory=512m",
        "--cpus=0.5",
        "--read-only",
        "--tmpfs",
        "/tmp:rw,noexec,nosuid,size=512m",
        "--cap-drop=ALL",
        "--security-opt",
        "no-new-privileges",
        "--pids-limit",
        "256",
        "--user",
        "node",
        "-e",
        "HOME=/tmp",
        "-e",
        "npm_config_cache=/app/.npm-cache",
        "-e",
        "npm_config_update_notifier=false",
        "-v",
        `${dockerPath}:/app`,
        "-w",
        "/app",
        "node:18-alpine",
        "sh",
        "-c",
        buildCommand,
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          PATH: process.env.PATH,
          HOME: process.env.HOME ?? os.homedir(),
        },
      }
    );

    docker.on("error", (error) => {
      reject(new Error(`Failed to start docker build for ${deploymentId}: ${error.message}`));
    });

    docker.stdout.on("data", (data) => {
      process.stdout.write(`[${deploymentId}] ${data}`);
    });

    docker.stderr.on("data", (data) => {
      stderrOutput += data.toString();
      process.stderr.write(`[${deploymentId} ERROR] ${data}`);
    });

    docker.on("close", (code, signal) => {
      if (code === 0) {
        resolve("build complete");
        return;
      }

      if (signal) {
        reject(new Error(`Build container terminated by signal ${signal}`));
        return;
      }

      reject(new Error(getDockerFailureMessage(stderrOutput, code)));
    });
  });
};
