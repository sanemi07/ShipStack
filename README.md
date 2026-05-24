# ShipStack

## 🚀 Overview

ShipStack is a backend system that replicates how platforms like Vercel deploy frontend applications — handling untrusted code, building it in isolated environments, storing artifacts, and serving them via unique deployment URLs. It ships with a **cinematic, sci-fi-themed dashboard** built on Framer Motion and Tailwind CSS that surfaces every stage of the deployment pipeline in real time.

This project focuses on the core infrastructure behind modern deployment platforms:
- Containerized build execution
- Asynchronous job orchestration
- Artifact storage and delivery
- Animated, status-aware monitoring UI

---

## 🔗 Links

- GitHub: https://github.com/sanemi07/shipstack  
- Status: In Progress (Core system + cinematic UI implemented)

---

## Problem Statement

Modern frontend deployment platforms hide a substantial amount of backend complexity behind a simple "deploy" button. Under the hood, they need to:

- Ingest untrusted project source code
- Build it in an isolated environment
- Store immutable artifacts durably
- Expose those artifacts through a low-latency serving layer
- Do all of the above asynchronously and safely

ShipStack models that system end to end. The architecture mirrors real deployment infrastructure: an upload API, a background build worker, Redis-backed job orchestration, S3-backed artifact storage, and a request service that resolves deployment IDs to static assets — all surfaced through a premium, animated frontend.

---

## Architecture Overview

ShipStack is organized as a multi-service backend with a Next.js frontend.

- `uploadService` — accepts deployment requests, clones repositories, uploads source files to S3, queues build jobs, and exposes status polling.
- `deployService` — the build engine. Consumes jobs from Redis, downloads source snapshots, builds inside Docker, and uploads compiled output.
- `requestService` — the serving layer. Fetches built artifacts from S3 and streams them to clients with SPA fallback behavior.
- `frontend` — a cinematic Next.js 15 dashboard used to submit repository URLs and monitor deployment state through animated scenes.
- `Redis` — used for asynchronous job dispatch and deployment status tracking.
- `S3` — stores both uploaded source snapshots and final build artifacts.

```text
                         +----------------------+
                         |      Frontend UI     |
                         |  Next.js dashboard   |
                         |  (Framer Motion UI)  |
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

---

## Frontend — Cinematic UI

The frontend is a fully redesigned, sci-fi-themed Next.js 15 application. Every deployment state maps to its own animated "scene" powered by Framer Motion.

### Pages

| Route | Description |
|---|---|
| `/` | Landing page with animated hero, interactive deploy form, pipeline visualization, and feature grid |
| `/dashboard?id=<deploymentId>` | Real-time deployment monitor showing animated status scenes |

### Deployment Status Scenes

The dashboard maps backend states to four distinct visual scenes, each with a minimum 3.2s dwell time so animations play fully regardless of backend speed:

| Frontend Status | Backend State | Visual Scene |
|---|---|---|
| **Pending** | `null` / initial | Amber orbital core + system telemetry metrics |
| **Building** | `uploaded` | Cyan orbital core + build phase tracker + live terminal log |
| **Success** | `deployed` | Green burst animation + letter-by-letter "DEPLOYMENT LIVE" + preview URL card |
| **Failed** | timeout | Red flickering core + failure terminal log + error message |

### Component Architecture

```text
frontend/
├── app/
│   ├── globals.css          # Design tokens, grid-bg, font-mono-custom utility
│   ├── layout.tsx           # Root layout with Inter font
│   ├── page.tsx             # Landing page (StarField, MouseGradient, DeployForm, PipelineViz, feature grid)
│   └── dashboard/
│       └── page.tsx         # Dashboard shell (nav + Suspense wrapper)
├── components/
│   ├── DeployForm.tsx       # Animated repo URL form; POST /deploy → redirect to dashboard
│   ├── DashboardClient.tsx  # Polling logic, MIN_DWELL_MS dwell timer, displayStatus lag
│   ├── StatusCard.tsx       # Master status card with header bar, pipeline strip, and scene switcher
│   ├── DeploymentCore.tsx   # Animated orbital sphere (spinning rings, ripple pulses, status colors)
│   ├── PipelineViz.tsx      # 6-node pipeline visualization with animated flow particles
│   ├── TerminalLog.tsx      # Line-by-line animated build console with syntax coloring
│   ├── SystemMetrics.tsx    # Animated metric bars with cubic ease-out counters (pending scene)
│   └── Spinner.tsx          # Minimal loading spinner
└── lib/
    ├── api.ts               # createDeployment() and getDeploymentStatus() fetch wrappers
    └── motion.ts            # Shared Framer Motion variants (fadeUp, scaleIn, staggerContainer, letterContainer, etc.)
```

### Key UI Features

- **StarField** — 55 twinkling stars with randomized size, duration, and delay
- **MouseGradient** — spring-physics radial gradient that follows the cursor
- **PulseBadge** — animated "Production-grade deployment infrastructure" badge in the hero
- **DeploymentCore** — three-layer orbital widget (outer conic spin, inner counter-spin, core sphere) with status-specific colors and ripple rings
- **PipelineViz** — 6-step pipeline (GitHub → Upload → Redis Queue → Docker Build → S3 → Live) with animated flow particles between active nodes; works in both full and compact modes
- **TerminalLog** — typewriter-style build console with color-coded output (`✓` green, `✗` red, `→` cyan, `$` cyan), line numbers, blinking cursor, and auto-scroll
- **SystemMetrics** — 5 animated metric bars with `requestAnimationFrame`-driven cubic ease-out counters, shown during the pending scene
- **BuildPhaseTracker** — 5-phase build progress bar (Install Deps → Compile → Bundle → Optimize → Upload) shown during the building scene
- **CopyButton** — clipboard copy button with animated `Copy` ↔ `Copied!` icon swap

### Animation Library — `lib/motion.ts`

Shared Framer Motion variants used across all components:

| Export | Purpose |
|---|---|
| `fadeUp` | Fade + slide up + blur-in, used for staggered list items |
| `fadeIn` | Simple opacity fade |
| `slideRight` / `slideLeft` | Directional slide with blur |
| `scaleIn` | Scale + blur entrance |
| `staggerContainer` | Parent container that staggers children by 80ms |
| `pageTransition` | Full-page enter/exit with y-shift and blur |
| `successBurst` | Large-scale blur-in used for success core |
| `letterContainer` / `letterVariant` | Character-by-character stagger for "DEPLOYMENT LIVE" text |
| `springSnappy` / `springGentle` / `springBouncy` | Named spring configs |

### Polling Architecture

```
Backend status: null → "uploaded" → "deployed"
                  ↓         ↓            ↓
Frontend status: pending → building → success
                                          (or "failed" on BUILD_TIMEOUT_MS = 3 min)

displayStatus lags frontendStatus by MIN_DWELL_MS (3200ms)
so each animated scene always plays fully before transitioning.
```

- Poll interval: every **2.5 seconds** (`POLL_INTERVAL_MS = 2500`)
- Build timeout: **3 minutes** (`BUILD_TIMEOUT_MS = 180000`)
- Preview URL: derived from `NEXT_PUBLIC_REQUEST_SERVICE_HOST_TEMPLATE` or falls back to `NEXT_PUBLIC_REQUEST_SERVICE_URL/?id=<deploymentId>`

---

## Detailed Workflow

### 1. Upload

The deployment starts when the client submits a repository URL to `uploadService`.

- the API validates that the repository URL is an absolute `http(s)` URL
- a deployment ID is generated
- the repository is cloned locally into a deployment-scoped directory
- the source tree is enumerated and uploaded to S3 under `output/<deploymentId>/...`
- the deployment ID is pushed into Redis list `build-queue`
- Redis hash `status[deploymentId]` is set to `uploaded`

### 2. Build

`deployService` blocks on Redis using `BRPOP`. For each deployment:

- source files are downloaded from S3 back onto the worker filesystem
- the worker resolves the project path safely inside a fixed download root
- the project is mounted into a Docker container
- dependencies are installed
- the build command is executed
- production output is expected in `dist/`

### 3. Store

After a successful build:

- the worker recursively walks the `dist/` directory
- artifacts are uploaded to S3 under `output/<deploymentId>/dist/...`
- Redis hash `status[deploymentId]` is updated to `deployed`

### 4. Serve

`requestService` maps an incoming request to a deployment via:

- query parameter: `/?id=<deploymentId>`
- subdomain-style routing: `<deploymentId>.<domain>`

It then streams the requested S3 object to the client, falling back to `index.html` for non-asset paths.

---

## Key Features

- Containerized builds using Docker rather than building directly on the host
- Redis-backed asynchronous job handling so uploads and builds are decoupled
- S3-backed artifact storage for durable, deployment-scoped output
- Static asset serving with SPA fallback semantics
- Deployment ID based routing for preview environments
- Cross-platform path handling for Windows and WSL-backed Docker Desktop setups
- Defensive path validation to prevent directory traversal and unsafe filesystem writes
- Build-time isolation: read-only root filesystem, dropped Linux capabilities, process limits, non-root execution
- Cinematic, animated deployment dashboard with status-specific scenes and minimum dwell timing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend runtime | Node.js |
| Language | TypeScript |
| API layer | Express |
| Frontend framework | Next.js 15 + React 19 |
| UI animations | Framer Motion 12 |
| UI icons | Lucide React |
| Styling | Tailwind CSS 4 |
| Utilities | clsx, tailwind-merge |
| Build isolation | Docker (`node:22-alpine`) |
| Queue and state store | Redis |
| Artifact storage | Amazon S3 |
| Git operations | `simple-git` |
| Package managers (in builds) | npm, pnpm, yarn |

---

## Folder Structure

```text
ShipStack/
├── frontend/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Landing page
│   │   └── dashboard/
│   │       └── page.tsx              # Deployment monitor
│   ├── components/
│   │   ├── DeployForm.tsx            # Repo URL form + submit
│   │   ├── DashboardClient.tsx       # Polling + dwell timer logic
│   │   ├── StatusCard.tsx            # Master status card + scene switcher
│   │   ├── DeploymentCore.tsx        # Animated orbital sphere widget
│   │   ├── PipelineViz.tsx           # 6-node pipeline with flow particles
│   │   ├── TerminalLog.tsx           # Typewriter build console
│   │   ├── SystemMetrics.tsx         # Animated metric bars (pending scene)
│   │   └── Spinner.tsx               # Minimal spinner
│   ├── lib/
│   │   ├── api.ts                    # fetch wrappers for upload + status APIs
│   │   └── motion.ts                 # Shared Framer Motion variants
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

---

## Deep Dive

### Docker Build System

The deploy worker runs builds inside `node:22-alpine` containers. The host machine never executes arbitrary project build scripts directly.

- Detects package manager from lockfiles and `packageManager` metadata
- Supports `npm`, `pnpm`, and `yarn`
- Mounts the checked-out project into `/app`
- Runs dependency installation followed by the build command
- Streams stdout and stderr with deployment ID prefixes for traceability

### Security Decisions

The build container is intentionally locked down:

- `--user node` — does not run as root
- `--read-only` — root filesystem is immutable
- `--tmpfs /tmp:rw,noexec,nosuid,size=512m` — temporary writes in memory-backed scratch only
- `--cap-drop=ALL` — all Linux capabilities removed
- `--security-opt no-new-privileges` — processes cannot gain additional privileges
- `--memory=512m` — caps memory per build
- `--cpus=0.5` — caps CPU per build
- `--pids-limit=256` — prevents fork-heavy or runaway processes

### Path Handling Across Windows and WSL

ShipStack runs on Windows-hosted environments while using Linux containers. The deploy worker handles this by:

- Normalizing host paths before mounting into Docker
- Converting `C:\...` paths into `/mnt/c/...` when `DOCKER_DESKTOP_WSL=1`
- Rejecting deployment IDs and resolved paths that escape intended root directories
- Converting local filesystem paths into normalized S3 keys with forward slashes

### Failure Handling

- Invalid repository URLs rejected before clone begins
- Empty or malformed deployment IDs from the queue
- Missing project directories on the build worker
- Docker engine availability and permission errors
- Missing build output directories
- Missing S3 objects in the serving layer
- Stream failures while proxying artifacts to the client
- Frontend: build timeout after 3 minutes maps to a `failed` scene with the error message surfaced in the UI

---

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

Create service-local `.env` files:

```env
# uploadService / requestService
PORT=3002
REDIS_URL=redis://127.0.0.1:6379
AWS_REGION=your-region
AWS_BUCKET=your-bucket
AWS_KEY=your-access-key
AWS_SECRET=your-secret-key

# deployService (additional)
DOCKER_DESKTOP_WSL=1
```

Frontend `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
NEXT_PUBLIC_REQUEST_SERVICE_URL=http://localhost:3001
NEXT_PUBLIC_REQUEST_SERVICE_HOST_TEMPLATE=http://{id}:3001
```

### 3. Start the services

```bash
cd uploadService && node dist/index.js
cd deployService && node dist/index.js
cd requestService && node dist/index.js
cd frontend && npm run dev
```

Default ports:

| Service | Port |
|---|---|
| `uploadService` | `3002` |
| `deployService` | worker only, no HTTP port |
| `requestService` | `3001` |
| `frontend` | `3000` |

### 4. Test a deployment

1. Open `http://localhost:3000`
2. Paste a public GitHub repository URL into the deploy form
3. Click **Deploy to ShipStack** — you'll be redirected to `/dashboard?id=<id>`
4. Watch the animated scenes cycle through Pending → Building → Success
5. Click the preview URL card to open the deployed application

> **Note:** The current worker expects built output in `dist/`. Frameworks that output to `build/` or `.next/` are not yet supported.

---

## Challenges Faced

### 1. Docker on Windows and WSL

Running Linux build containers from a Windows host introduces mount path inconsistencies. The worker translates native Windows paths into WSL mount paths when needed.

### 2. Asynchronous Builds

The API cannot synchronously wait for a build. Redis as a job queue forces clean service separation and prevents long-lived, fragile HTTP connections.

### 3. Path Conversion and Safety

The system crosses multiple path boundaries:

- URL → local clone path
- Local file path → S3 object key
- S3 object key → worker download path
- Worker path → Docker mount path

Each conversion is a potential source of traversal bugs or broken mounts. Explicit path normalization and root-boundary checks are applied at every layer.

### 4. Container Failures

Build infrastructure fails in ways ordinary web APIs do not — Docker daemon down, socket permission errors, memory budget exceeded, or wrong output directory. Handling these cleanly is core to platform reliability.

### 5. Minimum Dwell Timing for UI Scenes

Fast builds (e.g., a trivial repo) would transition through states faster than animations could render. A `MIN_DWELL_MS = 3200ms` dwell timer ensures each cinematic scene plays fully before the UI transitions, even when the backend is instant.

---

## Future Improvements

- CDN fronting with CloudFront to cache immutable artifacts closer to users
- Build output caching keyed by lockfile and source hash
- Parallel build workers with queue-depth-based autoscaling
- Durable failed/cancelled status states in Redis or a database
- Real build log streaming from Docker stdout to the frontend terminal (replacing the current simulated logs)
- Support for `build/` and `.next/` output directories and framework-specific detection
- Observability via structured logging, metrics, traces, and alerting
- Rate limiting, auth, and per-user quotas for safer multi-tenant usage
- Stronger sandboxing with network egress controls and ephemeral worker hosts

---

## Why This Project Stands Out

ShipStack is not just another CRUD backend or a thin wrapper around a cloud service. It tackles a genuinely systems-oriented problem: safely executing untrusted build workloads, moving artifacts through an asynchronous pipeline, and serving immutable deployments through a storage-backed request layer — all surfaced through a premium, animated dashboard that makes the infrastructure visible and legible.

From a recruiter or interview perspective, the project demonstrates:

- Separation of control plane and execution plane responsibilities
- Understanding of why deployment systems are queue-driven
- Practical container hardening decisions rather than superficial Docker usage
- Awareness of object storage as the source of truth for build artifacts
- Handling of cross-platform operational issues such as Windows/WSL mount translation
- Design tradeoffs around reliability, failure states, and scalability
- Frontend engineering depth: state machines, animation choreography, minimum dwell timing, and real-time polling UX

In short, ShipStack reads like infrastructure because it is infrastructure — with a UI that treats deployment monitoring as a first-class product experience.
