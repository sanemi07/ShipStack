"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink, CheckCircle2, Copy, Check } from "lucide-react";

import { DeploymentCore } from "./DeploymentCore";
import { PipelineViz } from "./PipelineViz";
import { TerminalLog } from "./TerminalLog";
import { SystemMetrics } from "./SystemMetrics";
import { staggerContainer, fadeUp, scaleIn, letterContainer, letterVariant } from "@/lib/motion";

// ─── Types (preserved exactly from original) ────────────────────
export type BackendStatus = "uploaded" | "deployed" | null;
export type FrontendStatus = "pending" | "building" | "success" | "failed";

type StatusCardProps = {
  deploymentId: string;
  backendStatus: BackendStatus;
  frontendStatus: FrontendStatus;
  previewUrl: string;
  error: string | null;
  isPolling: boolean;
};

// ─── Copy button ────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for older browsers
      const el = document.createElement("textarea");
      el.value = text;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <motion.button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      className="flex-shrink-0 flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors"
      style={{
        background: copied ? "rgba(16,185,129,0.12)" : "rgba(255,255,255,0.05)",
        border: `1px solid ${copied ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
        color: copied ? "#10b981" : "#64748b",
        cursor: "pointer",
      }}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span
            key="check"
            className="flex items-center gap-1"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            <Check size={11} />
            Copied!
          </motion.span>
        ) : (
          <motion.span
            key="copy"
            className="flex items-center gap-1"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.15 }}
          >
            <Copy size={11} />
            Copy
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Build log lines for terminal ───────────────────────────────
const BUILD_LOGS = [
  "$ shipstack build --env production",
  "→ Initializing Docker build environment",
  "→ Pulling base image: node:20-alpine",
  "✓ Image pulled (cached)",
  "→ Resolving dependency graph...",
  "$ npm install --frozen-lockfile",
  "  ├─ resolved 847 packages",
  "  ├─ fetched 312 packages",
  "  └─ linked 847 packages",
  "✓ Dependencies installed in 18.4s",
  "→ Running build pipeline",
  "$ npm run build",
  "  ├─ Type checking...",
  "  ├─ Linting source files...",
  "  ├─ Compiling TypeScript...",
  "  ├─ Bundling modules [████████░░] 80%",
  "  ├─ Optimizing chunks...",
  "  ├─ Generating static pages...",
  "  └─ Minifying output...",
  "✓ Build complete — 3.2 MB artifact",
  "→ Uploading artifact to S3...",
  "✓ Artifact indexed at s3://shipstack-artifacts/",
  "→ Registering deployment record",
  "✓ Deployment ready — awaiting DNS propagation",
];

const FAILURE_LOGS = [
  "$ shipstack build --env production",
  "→ Initializing Docker build environment",
  "→ Pulling base image: node:20-alpine",
  "✓ Image pulled",
  "→ Resolving dependency graph...",
  "$ npm install --frozen-lockfile",
  "ERROR: ERESOLVE unable to resolve dependency tree",
  "  ├─ peer dep conflict: react@^18 vs react@^19",
  "  └─ Cannot resolve module '@scope/pkg@2.1.0'",
  "FAILED — npm install exited with code 1",
  "✗ Build stage terminated",
  "→ Collecting failure diagnostics",
  "→ Sending error report to orchestrator",
  "✗ Deployment pipeline halted",
];

// ─── Pending state ──────────────────────────────────────────────
function PendingScene() {
  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-6">
        <DeploymentCore status="pending" size="md" />
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs uppercase tracking-[0.2em] font-semibold px-2.5 py-1 rounded-full border"
              style={{
                color: "#f59e0b",
                borderColor: "rgba(245,158,11,0.3)",
                background: "rgba(245,158,11,0.08)",
                fontSize: "10px",
              }}
            >
              ◈ INITIALIZING PIPELINE
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white">
            Queuing your deployment
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            The orchestrator has received your repository. Redis queue is allocating a build worker and spinning up an isolated Docker environment.
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-amber-400"
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            />
            Polling every 2.5s
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <SystemMetrics />
      </motion.div>
    </motion.div>
  );
}

// ─── Building state ─────────────────────────────────────────────
function BuildingScene() {
  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-6">
        <DeploymentCore status="building" size="md" />
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="text-xs uppercase tracking-[0.2em] font-semibold px-2.5 py-1 rounded-full border"
              style={{
                color: "#06b6d4",
                borderColor: "rgba(6,182,212,0.3)",
                background: "rgba(6,182,212,0.08)",
                fontSize: "10px",
              }}
            >
              ▶ BUILD IN PROGRESS
            </span>
          </div>
          <h3 className="text-xl font-semibold text-white">
            Docker container building
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            Your repository is compiling inside an isolated build environment. Artifacts will be streamed to S3 upon completion.
          </p>
        </div>
      </motion.div>

      {/* Build phase progress */}
      <motion.div variants={fadeUp}>
        <BuildPhaseTracker />
      </motion.div>

      {/* Terminal */}
      <motion.div variants={fadeUp}>
        <TerminalLog lines={BUILD_LOGS} lineDelay={180} maxHeight={220} />
      </motion.div>
    </motion.div>
  );
}

function BuildPhaseTracker() {
  const phases = [
    { label: "Install Deps", done: true },
    { label: "Compile",      done: true },
    { label: "Bundle",       done: false, active: true },
    { label: "Optimize",     done: false },
    { label: "Upload",       done: false },
  ];

  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "rgba(6,182,212,0.03)", borderColor: "rgba(6,182,212,0.12)" }}
    >
      <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/70 font-semibold mb-4" style={{ fontSize: "10px" }}>
        Build Phases
      </p>
      <div className="flex items-center gap-0">
        {phases.map((phase, idx) => (
          <div key={phase.label} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className="w-full h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                {phase.done && (
                  <div className="h-full w-full rounded-full bg-cyan-500" />
                )}
                {phase.active && (
                  <motion.div
                    className="h-full rounded-full bg-cyan-400"
                    initial={{ width: "0%" }}
                    animate={{ width: "65%" }}
                    transition={{ duration: 1.8, ease: "easeInOut", repeat: Infinity, repeatType: "reverse" }}
                  />
                )}
              </div>
              <span
                className="text-center"
                style={{
                  fontSize: "9px",
                  color: phase.done ? "#06b6d4" : phase.active ? "#e2e8f0" : "#475569",
                  fontWeight: phase.active ? 600 : 400,
                }}
              >
                {phase.label}
              </span>
            </div>
            {idx < phases.length - 1 && (
              <div
                className="w-2 h-px flex-shrink-0"
                style={{ background: phase.done ? "rgba(6,182,212,0.4)" : "rgba(255,255,255,0.08)" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Success state ───────────────────────────────────────────────
function SuccessScene({ previewUrl, deploymentId }: { previewUrl: string; deploymentId: string }) {
  const words = "DEPLOYMENT LIVE".split("");

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
    >
      {/* Energy burst + core */}
      <div className="relative flex flex-col items-center py-4">
        {/* Ripple rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border"
            style={{ borderColor: "rgba(16,185,129,0.25)", inset: 0 }}
            initial={{ scale: 0.5, opacity: 0.8 }}
            animate={{ scale: 2.5 + i * 0.8, opacity: 0 }}
            transition={{ duration: 2, delay: i * 0.5, repeat: Infinity, ease: "easeOut" }}
          />
        ))}

        <motion.div
          initial={{ scale: 0.4, opacity: 0, filter: "blur(20px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
        >
          <DeploymentCore status="success" size="lg" />
        </motion.div>

        {/* DEPLOYMENT LIVE text */}
        <motion.div
          className="mt-5 flex items-center gap-0.5"
          variants={letterContainer}
          initial="hidden"
          animate="visible"
          style={{ marginTop: "1.5rem" }}
        >
          {"DEPLOYMENT LIVE".split("").map((char, i) => (
            <motion.span
              key={i}
              variants={letterVariant}
              className="font-mono-custom font-bold"
              style={{
                color: char === " " ? "transparent" : "#10b981",
                fontSize: "clamp(16px, 3vw, 22px)",
                textShadow: "0 0 20px rgba(16,185,129,0.6)",
                letterSpacing: "0.1em",
              }}
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.div>

        {/* Live badge */}
        <motion.div
          className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-full border"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9, duration: 0.4 }}
          style={{
            borderColor: "rgba(16,185,129,0.4)",
            background: "rgba(16,185,129,0.1)",
          }}
        >
          <motion.div
            className="w-2 h-2 rounded-full bg-emerald-400"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <span className="text-emerald-400 text-xs font-semibold tracking-widest uppercase" style={{ fontSize: "10px" }}>
            System Online
          </span>
        </motion.div>
      </div>

      {/* URL card */}
      <motion.div
        initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
        transition={{ delay: 0.6, duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      >
        <Link
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
          className="block group"
        >
          <div
            className="rounded-xl border p-4 transition-all duration-300"
            style={{
              background: "rgba(16,185,129,0.05)",
              borderColor: "rgba(16,185,129,0.25)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  <CheckCircle2 size={14} className="text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 mb-0.5" style={{ fontSize: "10px" }}>Deployment URL</p>
                  <p className="text-sm font-mono-custom text-emerald-300 truncate group-hover:text-emerald-200 transition-colors">
                    {previewUrl}
                  </p>
                </div>
              </div>
              <ExternalLink
                size={14}
                className="text-emerald-400/60 flex-shrink-0 group-hover:text-emerald-300 transition-colors"
              />
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Deployment ID row */}
      <motion.div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.4 }}
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        <span className="text-xs text-slate-500 flex-shrink-0" style={{ fontSize: "10px" }}>DEPLOYMENT ID</span>
        <span className="font-mono-custom text-xs text-slate-300 truncate flex-1">{deploymentId}</span>
        <CopyButton text={deploymentId} />
      </motion.div>
    </motion.div>
  );
}

// ─── Failed state ─────────────────────────────────────────────────
function FailedScene({ error, deploymentId }: { error: string | null; deploymentId: string }) {
  return (
    <motion.div
      className="space-y-5"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center gap-6">
        <motion.div
          animate={{ opacity: [1, 0.6, 1, 0.8, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 2 }}
        >
          <DeploymentCore status="failed" size="md" />
        </motion.div>
        <div className="space-y-3 flex-1">
          <div className="flex items-center gap-2">
            <motion.span
              className="text-xs uppercase tracking-[0.2em] font-semibold px-2.5 py-1 rounded-full border"
              style={{
                color: "#ef4444",
                borderColor: "rgba(239,68,68,0.3)",
                background: "rgba(239,68,68,0.08)",
                fontSize: "10px",
              }}
              animate={{ opacity: [1, 0.6, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              ✗ SYSTEM FAULT
            </motion.span>
          </div>
          <h3 className="text-xl font-semibold text-white">Deployment pipeline failed</h3>
          <p className="text-sm text-slate-400 leading-relaxed">
            {error ?? "The build worker reported an unrecoverable error. Review the logs and retry."}
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <TerminalLog lines={FAILURE_LOGS} lineDelay={160} maxHeight={200} />
      </motion.div>

      <motion.div
        variants={fadeUp}
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
      >
        <span className="text-xs text-slate-500 flex-shrink-0" style={{ fontSize: "10px" }}>DEPLOYMENT ID</span>
        <span className="font-mono-custom text-xs text-slate-300 truncate flex-1">{deploymentId}</span>
        <CopyButton text={deploymentId} />
      </motion.div>
    </motion.div>
  );
}

// ─── Main StatusCard ──────────────────────────────────────────────
export function StatusCard({
  deploymentId,
  backendStatus,
  frontendStatus,
  previewUrl,
  error,
  isPolling,
}: StatusCardProps) {
  const statusConfig: Record<FrontendStatus, { label: string; color: string; bg: string; border: string }> = {
    pending:  { label: "Pending",  color: "#f59e0b", bg: "rgba(245,158,11,0.08)",  border: "rgba(245,158,11,0.25)"  },
    building: { label: "Building", color: "#06b6d4", bg: "rgba(6,182,212,0.08)",   border: "rgba(6,182,212,0.25)"   },
    success:  { label: "Live",     color: "#10b981", bg: "rgba(16,185,129,0.08)",  border: "rgba(16,185,129,0.25)"  },
    failed:   { label: "Failed",   color: "#ef4444", bg: "rgba(239,68,68,0.08)",   border: "rgba(239,68,68,0.25)"   },
  };
  const cfg = statusConfig[frontendStatus];

  return (
    <section
      className="rounded-2xl border overflow-hidden"
      style={{
        background: "rgba(8,17,31,0.85)",
        backdropFilter: "blur(24px)",
        borderColor: cfg.border,
        boxShadow: `0 0 60px ${cfg.color}15, 0 0 0 1px ${cfg.border}`,
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.2)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: cfg.color + "80" }} />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
            <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          </div>
          <span className="font-mono-custom text-xs text-slate-500 tracking-wider hidden sm:inline" style={{ fontSize: "10px" }}>
            shipstack.io / deployment
          </span>
          {/* Deployment ID in header — always visible + copyable */}
          <div className="flex items-center gap-1.5 ml-2">
            <span
              className="font-mono-custom text-xs text-slate-600 truncate max-w-[140px] sm:max-w-[220px]"
              style={{ fontSize: "10px" }}
              title={deploymentId}
            >
              {deploymentId}
            </span>
            <CopyButton text={deploymentId} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border"
            style={{ color: cfg.color, borderColor: cfg.border, background: cfg.bg, fontSize: "10px" }}
          >
            {cfg.label}
          </span>
          {isPolling && (
            <div className="flex items-center gap-1.5">
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: cfg.color }}
                animate={{ opacity: [1, 0.2, 1] }}
                transition={{ duration: 1.1, repeat: Infinity }}
              />
              <span className="text-xs text-slate-500" style={{ fontSize: "10px" }}>polling</span>
            </div>
          )}
        </div>
      </div>

      {/* Pipeline strip */}
      <div className="px-6 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.04)" }}>
        <PipelineViz status={frontendStatus} compact />
      </div>

      {/* Main content — animated scene per state */}
      <div className="p-6">
        <AnimatePresence mode="wait">
          {frontendStatus === "pending" && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <PendingScene />
            </motion.div>
          )}

          {frontendStatus === "building" && (
            <motion.div
              key="building"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <BuildingScene />
            </motion.div>
          )}

          {frontendStatus === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              <SuccessScene previewUrl={previewUrl} deploymentId={deploymentId} />
            </motion.div>
          )}

          {frontendStatus === "failed" && (
            <motion.div
              key="failed"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35 }}
            >
              <FailedScene error={error} deploymentId={deploymentId} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
