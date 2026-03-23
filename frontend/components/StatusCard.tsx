import Link from "next/link";

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

const frontendStatusStyles: Record<FrontendStatus, string> = {
  pending: "border-amber-300/30 bg-amber-400/10 text-amber-100",
  building: "border-sky-300/30 bg-sky-400/10 text-sky-100",
  success: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
  failed: "border-rose-300/30 bg-rose-400/10 text-rose-100",
};

function formatBackendStatus(status: BackendStatus) {
  return status ?? "null";
}

export function StatusCard({
  deploymentId,
  backendStatus,
  frontendStatus,
  previewUrl,
  error,
  isPolling,
}: StatusCardProps) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-xl sm:p-8">
      <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/80">
            Status dashboard
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Deployment progress
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-slate-300">
            The dashboard follows the backend contract exactly, then maps the
            backend status into clearer frontend states for the user.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${frontendStatusStyles[frontendStatus]}`}
          >
            {frontendStatus}
          </span>
          <span className="text-slate-400">{isPolling ? "Polling" : "Idle"}</span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Deployment ID</p>
          <p className="mt-2 break-all font-mono text-sm text-white">
            {deploymentId}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Backend status</p>
          <p className="mt-2 font-mono text-sm text-white">
            {formatBackendStatus(backendStatus)}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Frontend status</p>
          <p className="mt-2 text-sm font-semibold capitalize text-white">
            {frontendStatus}
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-slate-400">Preview URL</p>
          {frontendStatus === "success" ? (
            <Link
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex break-all text-sm font-medium text-sky-300 underline decoration-sky-400/40 underline-offset-4"
            >
              {previewUrl}
            </Link>
          ) : (
            <p className="mt-2 text-sm text-slate-300">
              Preview becomes active after the backend status changes to
              <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-xs text-slate-100">
                deployed
              </span>
              .
            </p>
          )}
        </div>
      </div>

      {error ? (
        <div className="mt-6 rounded-3xl border border-rose-400/25 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </section>
  );
}
