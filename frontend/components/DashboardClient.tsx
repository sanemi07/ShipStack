"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";

import {
  BackendStatus,
  FrontendStatus,
  StatusCard,
} from "@/components/StatusCard";
import { getDeploymentStatus } from "@/lib/api";
import { fadeUp } from "@/lib/motion";

// ─── Constants preserved exactly from original ──────────────────
const POLL_INTERVAL_MS = 2500;
const BUILD_TIMEOUT_MS = 3 * 60 * 1000;

// ─── Minimum animation dwell per state (UI-only, does not affect polling) ──
const MIN_DWELL_MS = 3200;

// ─── Status mapping preserved exactly from original ─────────────
function mapBackendToFrontendStatus(
  status: BackendStatus,
  hasTimedOut: boolean
): FrontendStatus {
  if (hasTimedOut) return "failed";
  if (status === "uploaded") return "building";
  if (status === "deployed") return "success";
  return "pending";
}

// ─── Preview URL logic preserved exactly from original ──────────
function getPreviewUrl(deploymentId: string) {
  const hostTemplate = process.env.NEXT_PUBLIC_REQUEST_SERVICE_HOST_TEMPLATE;
  if (hostTemplate) return hostTemplate.replace("{id}", deploymentId);
  const baseUrl =
    process.env.NEXT_PUBLIC_REQUEST_SERVICE_URL ?? "http://localhost:3001";
  return `${baseUrl.replace(/\/$/, "")}/?id=${encodeURIComponent(deploymentId)}`;
}

export function DashboardClient() {
  const searchParams = useSearchParams();
  const deploymentId = searchParams.get("id")?.trim() ?? "";

  const [backendStatus, setBackendStatus] = useState<BackendStatus>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  const previewUrl = useMemo(
    () => (deploymentId ? getPreviewUrl(deploymentId) : ""),
    [deploymentId]
  );

  const frontendStatus = mapBackendToFrontendStatus(backendStatus, hasTimedOut);

  // ─── Display status: lags behind frontendStatus by MIN_DWELL_MS ─────────
  // This is purely visual — it ensures each cinematic animation scene plays
  // for at least MIN_DWELL_MS before transitioning, even if AWS/Docker are fast.
  const [displayStatus, setDisplayStatus] = useState<FrontendStatus>("pending");
  const dwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dwellStart = useRef<number>(Date.now());
  const queuedStatus = useRef<FrontendStatus | null>(null);

  useEffect(() => {
    if (frontendStatus === displayStatus) {
      queuedStatus.current = null;
      return;
    }
    const elapsed = Date.now() - dwellStart.current;
    const wait = Math.max(0, MIN_DWELL_MS - elapsed);
    queuedStatus.current = frontendStatus;
    if (dwellTimer.current) clearTimeout(dwellTimer.current);
    dwellTimer.current = setTimeout(() => {
      if (queuedStatus.current !== null) {
        dwellStart.current = Date.now();
        setDisplayStatus(queuedStatus.current);
        queuedStatus.current = null;
      }
    }, wait);
    return () => {
      if (dwellTimer.current) clearTimeout(dwellTimer.current);
    };
  }, [frontendStatus, displayStatus]);

  // ─── Polling logic preserved exactly from original ─────────────
  useEffect(() => {
    if (!deploymentId) {
      setError("Missing deployment ID. Open this page with ?id=<deploymentId>.");
      return;
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let intervalHandle: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function pollStatus() {
      try {
        setIsPolling(true);
        const response = await getDeploymentStatus(deploymentId);

        if (cancelled) return;

        setBackendStatus(response.status);
        setError(null);

        if (response.status === "deployed") {
          setHasTimedOut(false);
          setIsPolling(false);
          if (timeoutHandle) clearTimeout(timeoutHandle);
          if (intervalHandle) clearInterval(intervalHandle);
        }
      } catch (caughtError) {
        if (cancelled) return;
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to fetch deployment status."
        );
      } finally {
        if (!cancelled && backendStatus !== "deployed") {
          setIsPolling(true);
        }
      }
    }

    timeoutHandle = setTimeout(() => {
      setHasTimedOut(true);
      setIsPolling(false);
      setError(
        "Build polling timed out while the deployment remained in the uploaded state."
      );
      if (intervalHandle) clearInterval(intervalHandle);
    }, BUILD_TIMEOUT_MS);

    void pollStatus();
    intervalHandle = setInterval(() => {
      void pollStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      setIsPolling(false);
      if (timeoutHandle) clearTimeout(timeoutHandle);
      if (intervalHandle) clearInterval(intervalHandle);
    };
  }, [deploymentId]);

  // ─── Missing ID error state ─────────────────────────────────────
  if (!deploymentId) {
    return (
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border p-8"
        style={{
          background: "rgba(239,68,68,0.06)",
          borderColor: "rgba(239,68,68,0.2)",
        }}
      >
        <h1 className="text-2xl font-bold text-white">Missing deployment ID</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Open the dashboard with a query parameter like{" "}
          <code
            className="font-mono-custom px-2 py-0.5 rounded text-xs"
            style={{ background: "rgba(255,255,255,0.08)", color: "#f1f5f9" }}
          >
            /dashboard?id=&lt;deploymentId&gt;
          </code>
          .
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to deploy
        </Link>
      </motion.section>
    );
  }

  return (
    <motion.div
      className="space-y-5"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {/* Back link */}
      <motion.div variants={fadeUp}>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={13} />
          New deployment
        </Link>
      </motion.div>

      {/* Main status card — uses displayStatus so each scene plays fully */}
      <StatusCard
        deploymentId={deploymentId}
        backendStatus={backendStatus}
        frontendStatus={displayStatus}
        previewUrl={previewUrl}
        error={error}
        isPolling={isPolling}
      />
    </motion.div>
  );
}
