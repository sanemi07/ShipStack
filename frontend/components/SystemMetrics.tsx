"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";

type Metric = {
  label: string;
  unit: string;
  min: number;
  max: number;
  color: string;
};

const METRICS: Metric[] = [
  { label: "Build Workers",       unit: "/ 4 active",  min: 1, max: 4,   color: "#06b6d4" },
  { label: "Queue Depth",         unit: "jobs",        min: 0, max: 12,  color: "#8b5cf6" },
  { label: "Container Init",      unit: "%",           min: 0, max: 100, color: "#10b981" },
  { label: "Dependency Graph",    unit: "nodes",       min: 8, max: 240, color: "#f59e0b" },
  { label: "Bundle Chunks",       unit: "/ KB",        min: 0, max: 512, color: "#06b6d4" },
];

function useAnimatedValue(target: number, duration = 1200) {
  const [current, setCurrent] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    const start = performance.now();
    const from = current;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setCurrent(Math.round(from + (target - from) * eased));
      if (progress < 1) raf.current = requestAnimationFrame(tick);
    }

    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return current;
}

function MetricRow({ metric, seed }: { metric: Metric; seed: number }) {
  const [target] = useState(() =>
    Math.floor(metric.min + seed * (metric.max - metric.min))
  );
  const value = useAnimatedValue(target);
  const pct = ((value - metric.min) / (metric.max - metric.min)) * 100;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400 font-medium tracking-wide" style={{ fontSize: "11px" }}>
          {metric.label}
        </span>
        <span className="font-mono-custom text-xs font-semibold" style={{ color: metric.color, fontSize: "11px" }}>
          {value} <span className="text-slate-600 font-normal">{metric.unit}</span>
        </span>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${metric.color}80, ${metric.color})` }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.4, ease: [0.21, 0.47, 0.32, 0.98] }}
        />
      </div>
    </div>
  );
}

type SystemMetricsProps = {
  visible?: boolean;
};

export function SystemMetrics({ visible = true }: SystemMetricsProps) {
  // Stable random seeds per session
  const [seeds] = useState(() => METRICS.map(() => Math.random()));

  if (!visible) return null;

  return (
    <div
      className="rounded-xl border p-4 space-y-4"
      style={{
        background: "rgba(6,182,212,0.03)",
        borderColor: "rgba(6,182,212,0.12)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-cyan-400/70 font-semibold" style={{ fontSize: "10px" }}>
          System Telemetry
        </p>
        <div className="flex items-center gap-1.5">
          <motion.div
            className="w-1.5 h-1.5 rounded-full bg-cyan-400"
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
          <span className="text-xs text-cyan-400/50" style={{ fontSize: "10px" }}>LIVE</span>
        </div>
      </div>

      {METRICS.map((metric, idx) => (
        <MetricRow key={metric.label} metric={metric} seed={seeds[idx]} />
      ))}
    </div>
  );
}
