"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { createDeployment } from "@/lib/api";
import { Spinner } from "@/components/Spinner";

function isValidHttpUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function DeployForm() {
  const router = useRouter();
  const [repourl, setRepourl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedUrl = repourl.trim();

    if (!trimmedUrl) {
      setError("Repository URL is required.");
      return;
    }

    if (!isValidHttpUrl(trimmedUrl)) {
      setError("Enter a valid absolute http(s) repository URL.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const response = await createDeployment(trimmedUrl);
      router.push(`/dashboard?id=${encodeURIComponent(response.id)}`);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create deployment.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/80">
          Deploy page
        </p>
        <h2 className="text-3xl font-semibold tracking-tight text-white">
          Launch a new deployment
        </h2>
        <p className="text-sm leading-6 text-slate-300">
          Paste a GitHub repository URL and ShipStack will queue the build through
          the existing backend services.
        </p>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-200">
            Repository URL
          </span>
          <input
            value={repourl}
            onChange={(event) => setRepourl(event.target.value)}
            type="url"
            inputMode="url"
            placeholder="https://github.com/owner/repository.git"
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none ring-0 transition placeholder:text-slate-500 focus:border-sky-300/60 focus:bg-white/10"
            disabled={isSubmitting}
            aria-invalid={error ? "true" : "false"}
          />
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-400/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-sky-400 px-5 py-3 font-medium text-slate-950 transition hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-sky-200/60"
        >
          {isSubmitting ? <Spinner className="text-slate-950" /> : null}
          {isSubmitting ? "Submitting..." : "Deploy"}
        </button>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
        <p className="font-medium text-white">Contract reminder</p>
        <p className="mt-2 leading-6">
          This form sends
          <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-xs text-sky-100">
            {`{ "repourl": "<value>" }`}
          </span>
          to the API. The field name is intentionally not renamed.
        </p>
      </div>
    </div>
  );
}
