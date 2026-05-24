"use client";

import { motion } from "framer-motion";
import type { FrontendStatus } from "./StatusCard";

type PipelineNode = {
  id: string;
  label: string;
  sub: string;
};

const NODES: PipelineNode[] = [
  { id: "github",  label: "GitHub",       sub: "Source" },
  { id: "upload",  label: "Upload",        sub: "Ingest" },
  { id: "queue",   label: "Redis Queue",   sub: "Orchestrate" },
  { id: "docker",  label: "Docker Build",  sub: "Compile" },
  { id: "s3",      label: "S3 Storage",    sub: "Artifact" },
  { id: "live",    label: "Live",          sub: "Deploy" },
];

// Map status → how many nodes are "active"
function getActiveCount(status: FrontendStatus): number {
  if (status === "pending")  return 2;
  if (status === "building") return 4;
  if (status === "success")  return 6;
  if (status === "failed")   return 3;
  return 1;
}

type PipelineVizProps = {
  status?: FrontendStatus;
  compact?: boolean;
};

export function PipelineViz({ status = "pending", compact = false }: PipelineVizProps) {
  const activeCount = getActiveCount(status);

  return (
    <div className={`w-full overflow-x-auto ${compact ? "" : "pb-2"}`}>
      <div
        className="flex items-center gap-0 min-w-max mx-auto"
        style={{ padding: compact ? "0 4px" : "8px 0" }}
      >
        {NODES.map((node, idx) => {
          const isActive   = idx < activeCount;
          const isCurrent  = idx === activeCount - 1;
          const isLast     = idx === NODES.length - 1;
          const isFailed   = status === "failed" && isCurrent;

          const nodeColor = isFailed
            ? "#ef4444"
            : isActive
            ? "#06b6d4"
            : "rgba(148,163,184,0.25)";

          return (
            <div key={node.id} className="flex items-center">
              {/* Node */}
              <div className="relative flex flex-col items-center gap-1">
                {/* Dot */}
                <div className="relative">
                  {/* Pulse ring for current active node */}
                  {isCurrent && !isFailed && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{ background: nodeColor }}
                      animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}

                  <motion.div
                    className="relative rounded-full flex items-center justify-center"
                    style={{
                      width: compact ? 28 : 36,
                      height: compact ? 28 : 36,
                      background: isActive
                        ? `radial-gradient(circle, ${nodeColor}40, ${nodeColor}15)`
                        : "rgba(15,30,55,0.8)",
                      border: `1px solid ${nodeColor}`,
                      boxShadow: isActive
                        ? `0 0 ${isCurrent ? 16 : 8}px ${nodeColor}60`
                        : "none",
                    }}
                    animate={isCurrent && !isFailed ? { scale: [1, 1.06, 1] } : {}}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {/* Inner fill */}
                    <div
                      className="rounded-full"
                      style={{
                        width: compact ? 8 : 10,
                        height: compact ? 8 : 10,
                        background: nodeColor,
                        boxShadow: isActive ? `0 0 6px ${nodeColor}` : "none",
                      }}
                    />
                  </motion.div>
                </div>

                {/* Labels */}
                {!compact && (
                  <div className="flex flex-col items-center gap-0.5 mt-1">
                    <span
                      className="text-xs font-semibold tracking-wide"
                      style={{ color: isActive ? "#f1f5f9" : "rgba(148,163,184,0.4)", fontSize: "10px" }}
                    >
                      {node.label}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: isActive ? nodeColor : "rgba(148,163,184,0.25)", fontSize: "9px" }}
                    >
                      {node.sub}
                    </span>
                  </div>
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="relative mx-1" style={{ width: compact ? 28 : 40, height: 2 }}>
                  {/* Base line */}
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: idx < activeCount - 1
                        ? "rgba(6,182,212,0.3)"
                        : "rgba(148,163,184,0.1)",
                    }}
                  />
                  {/* Animated flow particle */}
                  {idx < activeCount - 1 && (
                    <motion.div
                      className="absolute top-0 bottom-0 rounded-full"
                      style={{
                        width: "40%",
                        background: `linear-gradient(90deg, transparent, #06b6d4, transparent)`,
                      }}
                      animate={{ x: ["-100%", "250%"] }}
                      transition={{
                        duration: 1.4,
                        repeat: Infinity,
                        ease: "linear",
                        delay: idx * 0.22,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
