# ShipStack

ShipStack is a simplified Vercel-style deployment platform that accepts a frontend codebase, builds it inside an isolated Docker environment, and prepares the generated static assets for serving.

## Problem Statement

Modern frontend deployment platforms hide a lot of backend engineering behind a simple "deploy" button. Under the hood, they need to accept untrusted user input, move source code through a build pipeline, isolate execution, store artifacts, and make deployments reproducible.

This project explores that backend problem directly.

ShipStack is useful because it demonstrates the core infrastructure behind platforms like Vercel or Netlify in a compact, understandable system:

- an upload pipeline that ingests project source code
- a queue-driven deploy pipeline that decouples intake from builds
- a containerized build environment with resource and privilege restrictions
- an artifact-oriented architecture that can evolve into a production CDN-backed deployment system

## High-Level Architecture

The system is designed as multiple backend services with clear responsibilities:

- `uploadService`
  Accepts a repository URL, clones the project, collects files, uploads them to object storage, and pushes a build job into Redis.
- `deployService`
  Pulls build jobs from Redis, downloads project files for a deployment ID, runs an isolated Docker build, and produces static artifacts.
- `requestService` planned
  Will resolve deployment IDs or project domains to the generated build output and serve the correct static deployment.

### Architecture Diagram

```text
Client / Frontend
       |
       v
+------------------+
|   uploadService  |
|  - clone repo    |
|  - upload source |
|  - enqueue job   |
+------------------+
       |
       v
+------------------+
|      Redis       |
|   build-queue    |
+------------------+
       |
       v
+------------------+         +------------------+
|   deployService  | <-----> |    AWS S3 /      |
|  - download src  |         | object storage   |
|  - docker build  |         | source + assets  |
|  - emit logs     |         +------------------+
+------------------+
       |
       v
+------------------+
| requestService   |
| static serving   |
| domain routing   |
+------------------+
```

## System Workflow

### 1. Upload

The upload service receives a deployment request containing a repository URL. It clones the repository into a temporary local output directory, walks the cloned files, filters unsafe or unnecessary directories such as `.git`, and uploads the source tree to object storage using normalized S3 keys.

### 2. Queue

After the upload completes, the upload service pushes the generated deployment ID into Redis. This separates user-facing intake from build execution and prevents the request lifecycle from being coupled to a potentially slow build.

### 3. Download

The deploy service listens to Redis using a blocking pop operation. When a job arrives, it downloads the project files associated with `output/<deploymentId>` into a local workspace under `downloads/output/<deploymentId>`.

### 4. Build

The deploy service starts a Docker container using `node:18-alpine`, mounts the downloaded project directory into `/app`, installs dependencies with `npm ci` or `npm install`, and runs `npm run build`.

The build is intentionally constrained:

- non-root container user
- read-only container filesystem
- writable `tmpfs` only for temporary files
- limited CPU and memory
- dropped Linux capabilities
- `no-new-privileges`

### 5. Artifact Output

For a typical Vite or React build, Docker writes the generated static assets back into the mounted project directory, usually under:

`downloads/output/<deploymentId>/dist`

That makes the output available for the next serving or upload stage.

## Key Features

- Containerized frontend builds using Docker
- Queue-based asynchronous deployment processing with Redis
- Source upload and artifact-oriented workflow using S3-compatible object storage
- Build isolation through non-root execution, privilege dropping, and resource limits
- Cross-platform path handling for Windows and WSL-based Docker setups
- Streamed build logs for deployment visibility
- Safer file handling with path validation, root-bound checks, and symlink avoidance

## Technical Deep Dive

### Docker-Based Build System

The deploy service creates a fresh container for every build job. Instead of running build commands directly on the host machine, it runs them inside `node:18-alpine` with a mounted project directory. This keeps the host environment cleaner and gives the system a natural place to apply CPU, memory, and privilege restrictions.

The build command is selected dynamically:

- `npm ci` when `package-lock.json` exists
- `npm install` otherwise

This keeps builds closer to real-world project expectations while still allowing deterministic installs when a lockfile is present.

### Path Handling and Windows / WSL Compatibility

One of the harder parts of local container orchestration is path translation. Docker on Linux, Docker Desktop on Windows, and Docker via WSL do not always interpret host mount paths the same way.

The deploy service normalizes project paths before mounting them into Docker and supports Windows-to-WSL path translation when needed. This prevents broken bind mounts such as passing a Windows path into a Linux-style Docker runtime.

### Job Validation and Security

Deployment IDs are validated before being used to construct filesystem paths. Downloaded files are also forced to remain under an expected root directory, which helps prevent traversal bugs and accidental writes outside the deployment workspace.

On the upload side, repository URLs are validated and restricted to HTTP(S), recursive file walking is bounded to the clone root, and symlinks are skipped. This reduces risk from hostile repositories and accidental filesystem escape.

### Resource Limiting

The build container is started with explicit limits so that a single deployment cannot monopolize the machine:

- memory cap
- CPU limit
- PID limit
- read-only root filesystem
- dedicated writable temp space

This is not equivalent to production-grade sandboxing, but it is a meaningful engineering step toward safer multi-tenant builds.

### Error Handling and Observability

The build pipeline streams stdout and stderr with the deployment ID prefixed in logs, which makes it easier to correlate build events to jobs. The deploy service also waits for Docker process completion correctly, surfaces startup failures, and reports job-level failures without crashing the entire worker loop.

## Tech Stack

- Node.js
- TypeScript
- Docker
- Redis
- AWS S3
- Express
- simple-git
- AWS SDK v3

## Folder Structure

```text
shipStack/
├── README.md
├── uploadService/
│   ├── src/
│   │   ├── index.ts
│   │   ├── getAllFilePath.ts
│   │   ├── uploadfiletoS3.ts
│   │   └── generate.ts
│   ├── dist/
│   │   └── output/
│   └── package.json
└── deployService/
    ├── src/
    │   ├── index.ts
    │   ├── buildjs.ts
    │   └── downloadFromS3.ts
    ├── dist/
    │   └── downloads/
    │       └── output/
    └── package.json
```

### Important Runtime Directories

- `uploadService/dist/output/`
  Temporary checkout location used by the upload pipeline before cleanup
- `deployService/dist/downloads/output/<deploymentId>/`
  Downloaded source tree for a deployment
- `deployService/dist/downloads/output/<deploymentId>/dist/`
  Typical frontend build output directory after `npm run build`

## Challenges Faced and Solutions

### 1. Docker on Windows and WSL

Bind mounts behave differently depending on whether Docker is running through Windows Desktop, Linux containers, or WSL integration. I solved this by explicitly normalizing host paths and adding Windows-to-WSL path conversion logic for Docker mounts.

### 2. Async Build Handling

An early version of the deploy worker resolved the job before Docker had actually finished. That caused false-positive deployments. The fix was to make the worker await the Docker process lifecycle and only mark success after a zero exit code.

### 3. Filesystem Safety

Directly joining deployment IDs or downloaded object keys into paths creates traversal risk. I added root-bound path resolution checks on both upload and download flows so files cannot escape the expected workspace.

### 4. Build Isolation vs Practicality

A fully locked-down container can break package installation if writable paths are unavailable. I kept the root filesystem read-only, but redirected npm cache and temp usage into controlled writable paths so builds still succeed.

### 5. Queue Decoupling

Without a queue, upload requests would be tightly coupled to build time. Redis allowed the system to split intake from execution and made the architecture closer to a real deployment platform.

## What I Would Improve Next

- Add artifact caching to avoid rebuilding unchanged deployments
- Upload the built `dist/` output back to object storage automatically
- Add a CDN-backed request service for static serving and custom domain mapping
- Introduce structured deployment state tracking instead of a simple queue-only model
- Add OpenTelemetry or equivalent observability for traces, metrics, and logs
- Replace static AWS credentials with IAM roles or short-lived credentials
- Add stronger sandboxing for untrusted code using Firecracker, gVisor, or isolated build workers
- Add build timeouts, retries, and dead-letter queue handling
- Add dependency caching to reduce cold-start build times

## How to Run Locally

### Prerequisites

- Node.js 18+
- Docker Desktop or a working Docker daemon
- Redis
- AWS S3 bucket or S3-compatible storage

### Environment Variables

Configure both services with the required environment variables:

```env
AWS_REGION=your-region
AWS_BUCKET=your-bucket
AWS_KEY=your-access-key
AWS_SECRET=your-secret-key
REDIS_URL=redis://127.0.0.1:6379
PORT=3000
```

### Install Dependencies

```bash
cd uploadService
npm install

cd ../deployService
npm install
```

### Run the Upload Service

```bash
cd uploadService
node dist/index.js
```

### Run the Deploy Service

```bash
cd deployService
node dist/index.js
```

### Trigger a Deployment

Example request:

```bash
curl -X POST http://localhost:3000/deploy \
  -H "Content-Type: application/json" \
  -d "{\"repourl\":\"https://github.com/your-user/your-frontend-repo.git\"}"
```

### Expected Flow

- upload service clones and uploads source files
- Redis receives the deployment ID
- deploy service downloads the source
- Docker installs dependencies and runs the build
- generated static assets appear in the deployment output directory

## Why This Project Stands Out

This project is not just a CRUD backend or a wrapper around a single API. It models the core mechanics of a real deployment platform:

- asynchronous job processing
- isolated build execution
- artifact-oriented architecture
- cross-service coordination
- practical security tradeoffs

It is directly relevant to real-world infrastructure used by products like Vercel, Netlify, and internal platform engineering teams. For recruiters and engineers, it demonstrates backend depth in system design, operational thinking, and the ability to turn a developer-facing product idea into a working distributed pipeline.
