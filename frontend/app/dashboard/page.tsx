import { Suspense } from "react";

import { DashboardClient } from "@/components/DashboardClient";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#08111f,_#0a1730_45%,_#071019_100%)] px-6 py-12 text-slate-50">
      <div className="mx-auto max-w-5xl">
        <Suspense fallback={null}>
          <DashboardClient />
        </Suspense>
      </div>
    </main>
  );
}
