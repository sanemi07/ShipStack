"use client";

import { motion } from "framer-motion";
import { clsx } from "clsx";
import type { FrontendStatus } from "./StatusCard";

type DeploymentCoreProps = {
  status: FrontendStatus;
  size?: "sm" | "md" | "lg";
};

const statusColors: Record<
  FrontendStatus,
  { primary: string; secondary: string; ring: string; glow: string }
> = {
  pending: {
    primary: "#f59e0b",
    secondary: "#d97706",
    ring: "rgba(245,158,11,0.3)",
    glow: "rgba(245,158,11,0.15)",
  },
  building: {
    primary: "#06b6d4",
    secondary: "#0891b2",
    ring: "rgba(6,182,212,0.35)",
    glow: "rgba(6,182,212,0.15)",
  },
  success: {
    primary: "#10b981",
    secondary: "#059669",
    ring: "rgba(16,185,129,0.35)",
    glow: "rgba(16,185,129,0.15)",
  },
  failed: {
    primary: "#ef4444",
    secondary: "#dc2626",
    ring: "rgba(239,68,68,0.35)",
    glow: "rgba(239,68,68,0.15)",
  },
};

const sizeMap = {
  sm: { outer: 96, middle: 68, inner: 44 },
  md: { outer: 140, middle: 100, inner: 66 },
  lg: { outer: 200, middle: 144, inner: 96 },
};

export function DeploymentCore({ status, size = "md" }: DeploymentCoreProps) {
  const colors = statusColors[status];
  const s = sizeMap[size];

  return (
    <div
      className="relative flex items-center justify-center flex-shrink-0"
      style={{ width: s.outer, height: s.outer }}
    >
      {/* Outer glow backdrop */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: colors.glow }}
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.6, 1, 0.6],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Outer spinning ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: s.outer,
          height: s.outer,
          border: `1px solid ${colors.primary}40`,
          background: `conic-gradient(from 0deg, ${colors.primary}00, ${colors.primary}80, ${colors.primary}00)`,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      />

      {/* Middle counter-spin ring */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: s.middle,
          height: s.middle,
          border: `1px solid ${colors.secondary}50`,
          background: `conic-gradient(from 180deg, ${colors.secondary}00, ${colors.secondary}60, ${colors.secondary}00)`,
        }}
        animate={{ rotate: -360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />

      {/* Tick marks ring (static) */}
      <div
        className="absolute rounded-full"
        style={{
          width: s.outer - 8,
          height: s.outer - 8,
          border: `1px dashed ${colors.primary}25`,
        }}
      />

      {/* Inner core sphere */}
      <motion.div
        className="relative z-10 rounded-full flex items-center justify-center"
        style={{
          width: s.inner,
          height: s.inner,
          background: `radial-gradient(circle at 35% 35%, ${colors.primary}90, ${colors.secondary}60, #04070d)`,
          boxShadow: `0 0 ${size === "lg" ? 40 : 24}px ${colors.ring}, inset 0 0 ${size === "lg" ? 20 : 12}px rgba(0,0,0,0.5)`,
        }}
        animate={
          status === "failed"
            ? { opacity: [1, 0.5, 1, 0.7, 1], scale: [1, 0.97, 1] }
            : status === "success"
            ? { scale: [1, 1.04, 1] }
            : { scale: [1, 1.02, 1] }
        }
        transition={{ duration: status === "failed" ? 0.8 : 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Inner light dot */}
        <div
          className="rounded-full"
          style={{
            width: size === "lg" ? 16 : size === "md" ? 10 : 6,
            height: size === "lg" ? 16 : size === "md" ? 10 : 6,
            background: colors.primary,
            boxShadow: `0 0 ${size === "lg" ? 16 : 10}px ${colors.primary}`,
          }}
        />
      </motion.div>

      {/* Ripple rings (for success/pending) */}
      {(status === "success" || status === "pending" || status === "building") && (
        <>
          {[0, 1].map((i) => (
            <motion.div
              key={i}
              className="absolute rounded-full border"
              style={{
                width: s.outer * 0.85,
                height: s.outer * 0.85,
                borderColor: `${colors.primary}30`,
              }}
              animate={{
                scale: [1, 1.6],
                opacity: [0.5, 0],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: "easeOut",
                delay: i * 1.1,
              }}
            />
          ))}
        </>
      )}

      {/* Failure flicker overlay */}
      {status === "failed" && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ background: `${colors.primary}15` }}
          animate={{ opacity: [0, 0.8, 0, 0.5, 0] }}
          transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 2 }}
        />
      )}
    </div>
  );
}
