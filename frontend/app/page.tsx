"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Zap, Shield, Activity, GitBranch, Box, Globe } from "lucide-react";
import { DeployForm } from "@/components/DeployForm";
import { PipelineViz } from "@/components/PipelineViz";
import { staggerContainer, fadeUp, scaleIn } from "@/lib/motion";

// ─── Stars background ────────────────────────────────────────────
function StarField() {
  const stars = Array.from({ length: 55 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 1.5 + 0.5,
    duration: Math.random() * 6 + 4,
    delay: Math.random() * 6,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
          }}
          animate={{ opacity: [0, 0.7, 0], scale: [0.5, 1, 0.5] }}
          transition={{
            duration: s.duration,
            delay: s.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Mouse-reactive gradient ──────────────────────────────────────
function MouseGradient() {
  const mouseX = useMotionValue(50);
  const mouseY = useMotionValue(50);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  useEffect(() => {
    function handleMove(e: MouseEvent) {
      mouseX.set((e.clientX / window.innerWidth) * 100);
      mouseY.set((e.clientY / window.innerHeight) * 100);
    }
    window.addEventListener("mousemove", handleMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMove);
  }, [mouseX, mouseY]);

  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: `radial-gradient(600px circle at ${springX.get()}% ${springY.get()}%, rgba(6,182,212,0.07) 0%, transparent 70%)`,
      }}
    />
  );
}

// ─── Feature cards ────────────────────────────────────────────────
const FEATURES = [
  {
    icon: GitBranch,
    title: "Repository Ingestion",
    desc: "Clone any public GitHub repo. Source files are streamed directly into the upload pipeline.",
    color: "#06b6d4",
  },
  {
    icon: Box,
    title: "Dockerized Builds",
    desc: "Each deployment runs in an isolated Docker container. Zero environment bleed between builds.",
    color: "#8b5cf6",
  },
  {
    icon: Activity,
    title: "Redis Orchestration",
    desc: "Build jobs are queued and distributed across workers via Redis. Real-time state tracking.",
    color: "#f59e0b",
  },
  {
    icon: Shield,
    title: "S3 Artifact Storage",
    desc: "Compiled artifacts are stored in S3 and served through the request service via deployment ID.",
    color: "#10b981",
  },
  {
    icon: Zap,
    title: "Instant Polling",
    desc: "The frontend polls GET /status every 2.5s and maps backend states to cinematic UI phases.",
    color: "#06b6d4",
  },
  {
    icon: Globe,
    title: "Live Deployment URL",
    desc: "Preview URL is derived from your deployment ID and request service configuration.",
    color: "#8b5cf6",
  },
];

function FeatureCard({
  icon: Icon,
  title,
  desc,
  color,
}: (typeof FEATURES)[0]) {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className="relative rounded-xl p-5 cursor-default overflow-hidden"
      style={{
        background: "rgba(8,17,31,0.7)",
        border: `1px solid ${hovered ? color + "30" : "rgba(255,255,255,0.06)"}`,
        transition: "border-color 0.3s ease",
      }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      variants={fadeUp}
    >
      {/* Hover glow */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-xl"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.25 }}
        style={{
          background: `radial-gradient(circle at 30% 30%, ${color}10, transparent 70%)`,
        }}
      />

      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
        style={{ background: `${color}15`, border: `1px solid ${color}25` }}
      >
        <Icon size={15} style={{ color }} />
      </div>
      <p className="text-sm font-semibold text-white mb-1.5">{title}</p>
      <p className="text-xs leading-5 text-slate-500">{desc}</p>
    </motion.div>
  );
}

// ─── Animated badge ────────────────────────────────────────────────
function PulseBadge() {
  return (
    <motion.div
      className="inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium border"
      style={{
        background: "rgba(6,182,212,0.08)",
        borderColor: "rgba(6,182,212,0.25)",
        color: "#67e8f9",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <motion.span
        className="w-1.5 h-1.5 rounded-full bg-cyan-400"
        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      Production-grade deployment infrastructure
    </motion.div>
  );
}

// ─── Hero headline words ───────────────────────────────────────────
const HEADLINE = ["Ship", "code.", "Watch", "it", "go", "live."];

// ─── Page ─────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <main
      className="relative min-h-screen overflow-hidden grid-bg"
      style={{ background: "#04070d" }}
    >
      {/* Atmospheric layers */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.12) 0%, transparent 60%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(13,31,60,0.5) 0%, transparent 60%)",
        }}
      />
      <StarField />
      <MouseGradient />

      {/* ─ Nav ─────────────────────────────────────────────────── */}
      <motion.nav
        className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #0891b2)",
              boxShadow: "0 0 16px rgba(6,182,212,0.4)",
            }}
          >
            <Zap size={13} className="text-white" />
          </div>
          <span className="font-bold text-white tracking-tight">ShipStack</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-500">All systems operational</span>
        </div>
      </motion.nav>

      {/* ─ Hero + Form grid ────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-16">
        <div className="grid gap-12 lg:grid-cols-[1fr_420px] lg:gap-16 items-start">
          {/* Left — hero copy */}
          <div className="space-y-8">
            <PulseBadge />

            <motion.div
              className="space-y-5"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              {/* Headline */}
              <div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {HEADLINE.map((word, i) => (
                    <motion.span
                      key={i}
                      className="font-bold text-white"
                      style={{ fontSize: "clamp(36px, 5.5vw, 68px)", lineHeight: 1.05 }}
                      initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
                      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                      transition={{
                        duration: 0.6,
                        delay: 0.2 + i * 0.07,
                        ease: [0.21, 0.47, 0.32, 0.98],
                      }}
                    >
                      {word === "live." ? (
                        <span style={{ color: "#06b6d4", textShadow: "0 0 40px rgba(6,182,212,0.5)" }}>
                          {word}
                        </span>
                      ) : (
                        word
                      )}
                    </motion.span>
                  ))}
                </div>
              </div>

              <motion.p
                className="max-w-xl text-base leading-7 text-slate-400 sm:text-lg"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.6 }}
              >
                A Vercel-style deployment platform built on Docker, Redis, and S3.
                Submit a GitHub repo, watch the build orchestrate in real time, and get a live preview URL.
              </motion.p>
            </motion.div>

            {/* Pipeline visualization */}
            <motion.div
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.75 }}
            >
              <p className="text-xs uppercase tracking-[0.2em] text-slate-600 font-semibold" style={{ fontSize: "10px" }}>
                Deployment Pipeline
              </p>
              <div
                className="rounded-xl border p-4"
                style={{
                  background: "rgba(8,17,31,0.6)",
                  borderColor: "rgba(6,182,212,0.1)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <PipelineViz status="success" />
              </div>
            </motion.div>

            {/* API contract badges */}
            <motion.div
              className="flex flex-wrap gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              {[
                { label: "POST /deploy", desc: "{ repourl }" },
                { label: "GET /status?id=", desc: "→ polling" },
                { label: "Preview URL", desc: "from ID" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs border"
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    borderColor: "rgba(255,255,255,0.07)",
                  }}
                >
                  <code
                    className="font-mono-custom text-cyan-300"
                    style={{ fontSize: "11px" }}
                  >
                    {item.label}
                  </code>
                  <span className="text-slate-600">{item.desc}</span>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right — deploy form panel */}
          <motion.div
            initial={{ opacity: 0, x: 24, filter: "blur(12px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.65, delay: 0.3, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="lg:sticky lg:top-8"
          >
            <div
              className="rounded-2xl border p-6 sm:p-7"
              style={{
                background: "rgba(8,17,31,0.88)",
                borderColor: "rgba(6,182,212,0.15)",
                backdropFilter: "blur(24px)",
                boxShadow: "0 0 60px rgba(6,182,212,0.08), 0 40px 80px rgba(0,0,0,0.5)",
              }}
            >
              <DeployForm />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─ Feature grid ────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="mb-8"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-slate-600 font-semibold mb-2" style={{ fontSize: "10px" }}>
            Infrastructure
          </p>
          <h2 className="text-2xl font-bold text-white">
            How ShipStack works
          </h2>
        </motion.div>

        <motion.div
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={staggerContainer}
        >
          {FEATURES.map((feat) => (
            <FeatureCard key={feat.title} {...feat} />
          ))}
        </motion.div>
      </section>

      {/* ─ Footer ──────────────────────────────────────────────── */}
      <footer
        className="relative z-10 border-t px-6 py-6 flex items-center justify-between max-w-7xl mx-auto"
        style={{ borderColor: "rgba(255,255,255,0.05)" }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: "rgba(6,182,212,0.15)" }}
          >
            <Zap size={10} className="text-cyan-400" />
          </div>
          <span className="text-xs text-slate-600">ShipStack</span>
        </div>
        <p className="text-xs text-slate-700">
          Deploy infrastructure • Strict API contract
        </p>
      </footer>
    </main>
  );
}
