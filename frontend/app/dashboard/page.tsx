import { Suspense } from "react";
import { DashboardClient } from "@/components/DashboardClient";
import { Zap } from "lucide-react";

export default function DashboardPage() {
  return (
    <main
      className="relative min-h-screen grid-bg"
      style={{ background: "#04070d" }}
    >
      {/* Atmospheric glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(6,182,212,0.09) 0%, transparent 60%)",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
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
        <p className="text-xs text-slate-600 hidden sm:block">Deployment Dashboard</p>
      </nav>

      {/* Content */}
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
        <Suspense fallback={null}>
          <DashboardClient />
        </Suspense>
      </div>
    </main>
  );
}
