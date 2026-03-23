"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Spinner } from "@/components/Spinner";
import {
  BackendStatus,
  FrontendStatus,
  StatusCard,
} from "@/components/StatusCard";
import { getDeploymentStatus } from "@/lib/api";

const POLL_INTERVAL_MS = 2500;
const BUILD_TIMEOUT_MS = 3 * 60 * 1000;

function mapBackendToFrontendStatus(
  status: BackendStatus,
  hasTimedOut: boolean,
): FrontendStatus {
  if (hasTimedOut) {
    return "failed";
  }

  if (status === "uploaded") {
    return "building";
  }

  if (status === "deployed") {
    return "success";
  }

  return "pending";
}

function getPreviewUrl(deploymentId: string) {
  const hostTemplate = process.env.NEXT_PUBLIC_REQUEST_SERVICE_HOST_TEMPLATE;

  if (hostTemplate) {
    return hostTemplate.replace("{id}", deploymentId);
  }

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
    [deploymentId],
  );

  const frontendStatus = mapBackendToFrontendStatus(backendStatus, hasTimedOut);

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

        if (cancelled) {
          return;
        }

        setBackendStatus(response.status);
        setError(null);

        if (response.status === "deployed") {
          setHasTimedOut(false);
          setIsPolling(false);

          if (timeoutHandle) {
            clearTimeout(timeoutHandle);
          }

          if (intervalHandle) {
            clearInterval(intervalHandle);
          }
        }
      } catch (caughtError) {
        if (cancelled) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Failed to fetch deployment status.",
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
        "Build polling timed out while the deployment remained in the uploaded state.",
      );

      if (intervalHandle) {
        clearInterval(intervalHandle);
      }
    }, BUILD_TIMEOUT_MS);

    void pollStatus();
    intervalHandle = setInterval(() => {
      void pollStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      setIsPolling(false);

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      if (intervalHandle) {
        clearInterval(intervalHandle);
      }
    };
  }, [deploymentId]);

  if (!deploymentId) {
    return (
      <section className="rounded-[2rem] border border-rose-400/20 bg-rose-500/10 p-8 text-rose-100">
        <h1 className="text-2xl font-semibold text-white">
          Missing deployment ID
        </h1>
        <p className="mt-3 text-sm leading-6">
          Open the dashboard with a query parameter like
          <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-xs text-rose-50">
            /dashboard?id=&lt;deploymentId&gt;
          </span>
          .
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-2xl bg-white/10 px-4 py-2 text-sm font-medium text-white"
        >
          Back to deploy page
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <StatusCard
        deploymentId={deploymentId}
        backendStatus={backendStatus}
        frontendStatus={frontendStatus}
        previewUrl={previewUrl}
        error={error}
        isPolling={isPolling}
      />

      <section className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/80">
            Frontend mapping
          </p>
          <div className="mt-4 space-y-3 text-sm text-slate-300">
            <p>
              <span className="font-mono text-slate-100">uploaded</span> maps to
              <span className="mx-1 rounded bg-sky-400/10 px-2 py-1 font-semibold text-sky-100">
                building
              </span>
            </p>
            <p>
              <span className="font-mono text-slate-100">deployed</span> maps to
              <span className="mx-1 rounded bg-emerald-400/10 px-2 py-1 font-semibold text-emerald-100">
                success
              </span>
            </p>
            <p>
              <span className="font-mono text-slate-100">null</span> maps to
              <span className="mx-1 rounded bg-amber-400/10 px-2 py-1 font-semibold text-amber-100">
                pending
              </span>
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white/5 p-6">
          <div className="flex items-center gap-3">
            <Spinner className="text-sky-300" />
            <div>
              <p className="text-sm font-medium text-white">
                {frontendStatus === "success"
                  ? "Success"
                  : frontendStatus === "failed"
                    ? "Failed"
                    : frontendStatus === "building"
                      ? "Building..."
                      : "Pending"}
              </p>
              <p className="text-sm text-slate-400">
                Polling every 2.5 seconds until the backend reports
                <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-xs text-slate-100">
                  deployed
                </span>
                or the timeout is reached.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
