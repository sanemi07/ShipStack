"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";

import { createDeployment } from "@/lib/api";

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
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Preserved exactly — no changes to business logic
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
          : "Failed to create deployment."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      {/* Form header */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-[0.28em] font-semibold" style={{ color: "rgba(6,182,212,0.7)", fontSize: "10px" }}>
          Deploy page
        </p>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Launch a deployment
        </h2>
        <p className="text-sm leading-6 text-slate-400">
          Paste a public GitHub repo URL. ShipStack will queue, build, and serve it automatically.
        </p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-300 tracking-wide" htmlFor="repourl-input">
            Repository URL
          </label>
          <div className="relative">
            {/* Glow border */}
            <motion.div
              className="absolute inset-0 rounded-xl pointer-events-none"
              animate={{
                boxShadow: isFocused
                  ? "0 0 0 1px rgba(6,182,212,0.5), 0 0 20px rgba(6,182,212,0.15)"
                  : "0 0 0 1px rgba(255,255,255,0.08)",
              }}
              transition={{ duration: 0.25 }}
            />

            <div className="flex items-center">
              <GitBranch
                size={15}
                className="absolute left-3.5 text-slate-500 pointer-events-none"
              />
              <input
                id="repourl-input"
                ref={inputRef}
                value={repourl}
                onChange={(e) => setRepourl(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                type="url"
                inputMode="url"
                placeholder="https://github.com/owner/repository"
                className="w-full rounded-xl pl-9 pr-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid transparent",
                }}
                disabled={isSubmitting}
                aria-invalid={error ? "true" : "false"}
              />
            </div>
          </div>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              className="rounded-xl px-4 py-3 text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit button */}
        <motion.button
          type="submit"
          disabled={isSubmitting}
          className="relative w-full rounded-xl py-3 px-5 text-sm font-semibold overflow-hidden disabled:cursor-not-allowed"
          style={{
            background: isSubmitting
              ? "rgba(6,182,212,0.3)"
              : "linear-gradient(135deg, #06b6d4, #0891b2)",
            color: isSubmitting ? "rgba(255,255,255,0.5)" : "#fff",
          }}
          whileHover={!isSubmitting ? { scale: 1.015 } : {}}
          whileTap={!isSubmitting ? { scale: 0.985 } : {}}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {/* Scan beam on submit */}
          {isSubmitting && (
            <motion.div
              className="absolute inset-y-0 w-16 pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
              animate={{ x: ["-100%", "200%"] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            />
          )}

          <span className="relative flex items-center justify-center gap-2">
            {isSubmitting ? (
              <>
                <motion.div
                  className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                />
                Ingesting repository...
              </>
            ) : (
              <>
                Deploy to ShipStack
                <ArrowRight size={15} />
              </>
            )}
          </span>
        </motion.button>
      </form>

      {/* Contract reminder */}
      <div
        className="rounded-xl p-4 text-sm"
        style={{
          background: "rgba(255,255,255,0.025)",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-xs font-medium text-white mb-1.5">API contract</p>
        <p className="text-xs leading-5 text-slate-500">
          Sends{" "}
          <code
            className="font-mono-custom px-1.5 py-0.5 rounded text-xs"
            style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9" }}
          >
            {`{ "repourl": "<value>" }`}
          </code>{" "}
          to{" "}
          <code
            className="font-mono-custom px-1.5 py-0.5 rounded text-xs"
            style={{ background: "rgba(6,182,212,0.1)", color: "#67e8f9" }}
          >
            POST /deploy
          </code>
          . Field name is not renamed.
        </p>
      </div>
    </div>
  );
}
