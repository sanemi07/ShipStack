"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type TerminalLogProps = {
  lines: string[];
  /** ms delay between each line appearing */
  lineDelay?: number;
  maxHeight?: number;
};

export function TerminalLog({ lines, lineDelay = 220, maxHeight = 260 }: TerminalLogProps) {
  const [visibleCount, setVisibleCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setVisibleCount(i);
      if (i >= lines.length) clearInterval(interval);
    }, lineDelay);
    return () => clearInterval(interval);
  }, [lines, lineDelay]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [visibleCount]);

  function getLineColor(line: string): string {
    if (line.startsWith("✓") || line.startsWith("SUCCESS"))  return "#10b981";
    if (line.startsWith("✗") || line.startsWith("ERROR") || line.startsWith("FAILED")) return "#ef4444";
    if (line.startsWith("→") || line.startsWith("$"))        return "#06b6d4";
    if (line.startsWith("[warn]") || line.startsWith("⚠"))   return "#f59e0b";
    if (line.startsWith("#"))                                  return "#64748b";
    return "#94a3b8";
  }

  return (
    <div
      className="rounded-xl border font-mono-custom text-xs leading-relaxed overflow-hidden"
      style={{
        background: "rgba(2,5,10,0.95)",
        borderColor: "rgba(6,182,212,0.15)",
      }}
    >
      {/* Terminal header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5 border-b"
        style={{ borderColor: "rgba(6,182,212,0.1)", background: "rgba(6,182,212,0.04)" }}
      >
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        </div>
        <span className="text-slate-500 text-xs ml-2 tracking-wider uppercase" style={{ fontSize: "10px" }}>
          shipstack build console
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="text-cyan-400/60 text-xs" style={{ fontSize: "10px" }}>LIVE</span>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={scrollRef}
        className="overflow-y-auto p-4 space-y-0.5"
        style={{ maxHeight, scrollBehavior: "smooth" }}
      >
        <AnimatePresence>
          {lines.slice(0, visibleCount).map((line, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex items-start gap-2"
            >
              <span className="text-slate-700 select-none flex-shrink-0" style={{ fontSize: "10px", marginTop: "1px" }}>
                {String(idx + 1).padStart(3, "0")}
              </span>
              <span style={{ color: getLineColor(line) }}>{line}</span>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Blinking cursor */}
        {visibleCount < lines.length && (
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-slate-700 select-none" style={{ fontSize: "10px" }}>
              {String(visibleCount + 1).padStart(3, "0")}
            </span>
            <motion.span
              className="inline-block w-1.5 h-3.5 bg-cyan-400"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.6, repeat: Infinity }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
