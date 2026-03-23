# ShipStack

## 🚀 Overview

ShipStack is a backend system that replicates how platforms like Vercel deploy frontend applications — handling untrusted code, building it in isolated environments, storing artifacts, and serving them via unique deployment URLs.

This project focuses on the core infrastructure behind modern deployment platforms:
- containerized build execution
- asynchronous job orchestration
- artifact storage and delivery

---

## 🔗 Links

- GitHub: https://github.com/sanemi07/shipstack  
- Status: In Progress (Core system implemented)



## Problem Statement

Modern frontend deployment platforms hide a substantial amount of backend complexity behind a simple "deploy" button. Under the hood, they need to:

- ingest untrusted project source code
- build it in an isolated environment
- store immutable artifacts durably
- expose those artifacts through a low-latency serving layer
- do all of the above asynchronously and safely

ShipStack exists to model that system end to end. The project is intentionally scoped down, but the architecture mirrors real deployment infrastructure: an upload API, a background build worker, Redis-backed job orchestration, S3-backed artifact storage, and a request service that resolves deployment IDs to static assets.

## Architecture Overview

ShipStack is organized as a multi-service backend rather than a single monolith. That separation matters because the services have very different responsibilities and scaling characteristics.

- `uploadService` accepts deployment requests, clones repositories, uploads source files to object storage, queues build jobs, and exposes status polling.
- `deployService` is the build engine. It consumes jobs from Redis, downloads source snapshots, builds inside Docker, and uploads compiled output.
- `requestService` is the serving layer. It fetches built artifacts from S3 and streams them to clients with SPA fallback behavior.
- `frontend` is a thin Next.js interface used to submit repository URLs and poll deployment state.
- `Redis` is used for asynchronous job dispatch and deployment status tracking.
- `S3` stores both uploaded source snapshots and final build artifacts.

```text
                         +----------------------+
                         |      Frontend UI     |
                         |   Next.js dashboard  |
                         +----------+-----------+
                                    |
                                    | POST /deploy
                                    v
                         +----------------------+
                         |    uploadService     |
                         |  clone + validate    |
                         |  upload source files |
                         +----+------------+----+
                              |            |
             writes source to |            | LPUSH build-queue
                              v            v
                        +-----------+   +--------+
                        |    S3     |   | Redis  |
                        | source +  |   | queue  |
                        | build     |   | status |
                        | artifacts |   +----+---+
                        +-----+-----+        |
                              ^              | BRPOP
                              |              v
                              |      +----------------------+
                              |      |    deployService     |
                              |      | download -> build -> |
                              |      | upload dist -> mark  |
                              |      +----------+-----------+
                              |                 |
                              |                 | HSET status=deployed
                              |                 v
                              |             +--------+
                              |             | Redis  |
                              |             +--------+
                              |
                              | GET object
                              v
                         +----------------------+
                         |   requestService     |
                         | resolve id -> stream |
                         | static asset / SPA   |
                         +----------+-----------+
                                    |
                                    v
                           Unique deployment URL
```

## Detailed Workflow

### 1. Upload

The deployment starts when the client submits a repository URL to `uploadService`.

- the API validates that the repository URL is an absolute `http(s)` URL
- a deployment ID is generated
- the repository is cloned locally into a deployment-scoped directory
- the source tree is enumerated and uploaded to S3 under `output/<deploymentId>/...`
- the deployment ID is pushed into Redis list `build-queue`
- Redis hash `status[deploymentId]` is set to `uploaded`

This keeps the API fast: it performs ingestion and queueing, but it does not block on the build itself.

### 2. Build

`deployService` blocks on Redis using `BRPOP`, which turns Redis into a lightweight asynchronous job queue.

For each deployment:

- source files are downloaded from S3 back onto the worker filesystem
- the worker resolves the project path safely inside a fixed download root
- the project is mounted into a Docker container
- dependencies are installed
- the build command is executed
- the current implementation expects production output in `dist/`

### 3. Store

After a successful build:

- the worker recursively walks the `dist/` directory
- artifacts are uploaded to S3 under `output/<deploymentId>/dist/...`
- Redis hash `status[deploymentId]` is updated to `deployed`

At this point the deployment becomes immutable from the perspective of the serving layer.

### 4. Serve

`requestService` maps an incoming request to a deployment in one of two ways:

- query parameter: `/?id=<deploymentId>`
- subdomain-style routing: `<deploymentId>.<domain>`

It then:

- tries to fetch the exact requested asset from S3
- falls back to `index.html` for non-asset paths
- streams the object directly to the client
- sets content type headers based on file extension when needed

That gives ChipStack the behavior expected from a static hosting platform, including client-side routed single-page apps.

## Key Features

- Containerized builds using Docker rather than building directly on the host
- Redis-backed asynchronous job handling so uploads and builds are decoupled
- S3-backed artifact storage for durable, deployment-scoped output
- Static asset serving with SPA fallback semantics
- Deployment ID based routing for preview environments
- Cross-platform path handling for Windows and WSL-backed Docker Desktop setups
- Defensive path validation to prevent directory traversal and unsafe filesystem writes
- Build-time isolation controls such as read-only root filesystem, dropped Linux capabilities, process limits, and non-root execution

## Deep Dive

### Docker Build System

The deploy worker runs builds inside `node:22-alpine` containers. The choice is important: the host machine never executes arbitrary project build scripts directly.

Current build behavior:

- detects package manager from lockfiles and `packageManager` metadata
- supports `npm`, `pnpm`, and `yarn`
- mounts the checked-out project into `/app`
- runs dependency installation followed by the build command
- streams stdout and stderr with deployment ID prefixes for traceability

This design is much closer to a real deployment platform than running `npm run build` on the server process itself. It creates a clean boundary between orchestration code and untrusted user code.

### Security Decisions

The build container is intentionally locked down. The current worker applies the following controls:

- `--user node`
  The container does not run as root.
- `--read-only`
  The root filesystem is immutable.
- `--tmpfs /tmp:rw,noexec,nosuid,size=512m`
  Temporary writes are allowed only in memory-backed scratch space.
- `--cap-drop=ALL`
  Linux capabilities are removed.
- `--security-opt no-new-privileges`
  Processes cannot gain additional privileges.
- `--memory=512m`
  Prevents a single build from consuming unbounded memory.
- `--cpus=0.5`
  Caps CPU usage per build.
- `--pids-limit=256`
  Prevents fork-heavy or runaway processes.

This is not a complete sandbox in the same category as Firecracker or gVisor, but for a self-built deployment system it demonstrates the right security posture: assume builds are untrusted and constrain them aggressively.

### Path Handling Across Windows and WSL

One of the more subtle engineering problems in a system like this is path translation.

ChipStack runs on Windows-hosted development environments while still using Linux containers. The deploy worker handles that by:

- normalizing host paths before mounting them into Docker
- converting `C:\...` style paths into `/mnt/c/...` when `DOCKER_DESKTOP_WSL=1`
- rejecting deployment IDs and resolved paths that escape the intended root directories
- converting local filesystem paths into normalized S3 keys with forward slashes

This is a small implementation detail with a big operational impact. Without it, builds fail inconsistently depending on whether Docker is running through native Windows integration or WSL-backed mounts.

### Failure Handling

A production-style build system is mostly about failure modes, not the happy path.

ChipStack explicitly handles:

- invalid repository URLs before clone begins
- empty or malformed deployment IDs from the queue
- missing project directories on the build worker
- Docker engine availability and permission errors
- missing build output directories
- missing S3 objects in the serving layer
- stream failures while proxying artifacts back to the client

The current system updates status to `uploaded` and `deployed`; failed jobs are logged but do not yet write a durable terminal failure state. That is a realistic tradeoff for an early-stage deployment system and also one of the clearest next improvements.

## Tech Stack

- Backend runtime: Node.js
- Language: TypeScript
- API layer: Express
- Frontend: Next.js 15 + React 19
- Build isolation: Docker
- Queue and state store: Redis
- Artifact storage: Amazon S3
- Git operations: `simple-git`
- Package managers supported inside builds: npm, pnpm, yarn

## Folder Structure

```text
ChipStack/
├── frontend/
│   ├── app/
│   │   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── DashboardClient.tsx
│   │   ├── DeployForm.tsx
│   │   ├── Spinner.tsx
│   │   └── StatusCard.tsx
│   ├── lib/
│   │   └── api.ts
│   └── package.json
├── uploadService/
│   ├── src/
│   │   ├── index.ts
│   │   ├── generate.ts
│   │   ├── getAllFilePath.ts
│   │   └── uploadfiletoS3.ts
│   ├── dist/
│   └── package.json
├── deployService/
│   ├── src/
│   │   ├── index.ts
│   │   ├── buildjs.ts
│   │   ├── downloadFromS3.ts
│   │   └── uploadtoS3.ts
│   ├── dist/
│   └── package.json
├── requestService/
│   ├── src/
│   │   └── index.ts
│   ├── dist/
│   └── package.json
└── README.md
```

## Challenges Faced

### 1. Docker on Windows and WSL

Running Linux build containers from a Windows host introduces mount path inconsistencies that do not exist on Linux. The worker needs to understand when to pass native Windows-style normalized paths and when to translate them into WSL mount paths.

### 2. Asynchronous Builds

The API cannot synchronously wait for a build to finish without turning a deployment request into a long-lived, fragile HTTP connection. Moving build execution behind Redis forces cleaner service boundaries and better failure isolation.

### 3. Path Conversion and Safety

This system constantly crosses boundaries:

- URL -> local clone path
- local file path -> S3 object key
- S3 object key -> worker download path
- worker path -> Docker mount path

Every conversion is a place where traversal bugs or broken mounts can appear. The current code adds explicit path normalization and root-boundary checks in multiple layers for that reason.

### 4. Container Failures

Build infrastructure fails in ways ordinary web APIs do not:

- Docker daemon is down
- user lacks access to the Docker socket / named pipe
- dependencies exceed memory budget
- project writes output somewhere other than `dist/`
- install scripts behave differently across package managers

Handling those failures cleanly is a core part of making the platform feel reliable.

## Future Improvements

- CDN fronting with CloudFront to cache immutable artifacts closer to users
- Build output caching keyed by lockfile and source hash
- Parallel build workers with queue depth based autoscaling
- Durable failed/cancelled status states in Redis or a database
- Build log persistence and per-deployment log streaming to the UI
- Support for `build/` output and framework-specific detection beyond `dist/`
- Observability via structured logging, metrics, traces, and alerting
- Rate limiting, auth, and per-user quotas for safer multi-tenant usage
- Stronger sandboxing with network egress controls and ephemeral worker hosts

## How to Run Locally

### Prerequisites

- Node.js 18+
- Docker Desktop
- Redis running locally on `redis://127.0.0.1:6379` or a reachable Redis instance
- An S3 bucket or S3-compatible object store

### 1. Install dependencies

```bash
cd frontend && npm install
cd ../uploadService && npm install
cd ../deployService && npm install
cd ../requestService && npm install
```

### 2. Configure environment variables

Create service-local `.env` files with placeholders like:

```env
PORT=3002
REDIS_URL=redis://127.0.0.1:6379
AWS_REGION=your-region
AWS_BUCKET=your-bucket
AWS_KEY=your-access-key
AWS_SECRET=your-secret-key
DOCKER_DESKTOP_WSL=1
```

Notes:

- `uploadService` uses `PORT` and `REDIS_URL`
- `deployService` uses AWS credentials and optional `DOCKER_DESKTOP_WSL=1` for WSL path translation
- `requestService` uses AWS credentials and `PORT`
- `frontend/.env.local` should point to the upload and request services

Example frontend config:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_REQUEST_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_REQUEST_SERVICE_HOST_TEMPLATE=http://{id}:3001
```

### 3. Start the services

The repo already contains compiled backend output under each service's `dist/` folder, so the fastest local path is to run the compiled services directly.

```bash
cd uploadService && node dist/index.js
cd deployService && node dist/index.js
cd requestService && node dist/index.js
cd frontend && npm run dev
```

Default ports in the current repo:

- `uploadService`: `3002`
- `deployService`: worker process, no public HTTP port required
- `requestService`: `3001`
- `frontend`: `3000`

### 4. Test a deployment

1. Open the frontend.
2. Submit a public Git repository URL.
3. Wait for the dashboard to poll until the deployment reaches `deployed`.
4. Open the preview URL returned by the frontend.

Important implementation note: the current worker expects the built frontend to emit its production files into `dist/`.

## Why This Project Stands Out

ChipStack stands out because it is not just another CRUD backend or a thin wrapper around a cloud service. It tackles a genuinely systems-oriented problem: safely executing untrusted build workloads, moving artifacts through an asynchronous pipeline, and serving immutable deployments through a storage-backed request layer.

From a recruiter or interview perspective, the project demonstrates several signals that matter:

- separation of control plane and execution plane responsibilities
- understanding of why deployment systems are queue-driven
- practical container hardening decisions rather than superficial Docker usage
- awareness of object storage as the source of truth for build artifacts
- handling of cross-platform operational issues such as Windows/WSL mount translation
- design tradeoffs around reliability, failure states, and scalability

In short, ChipStack reads like infrastructure because it is infrastructure. It shows backend engineering beyond REST endpoints: orchestration, isolation, storage design, and deployment lifecycle management.
