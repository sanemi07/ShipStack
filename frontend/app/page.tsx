import { DeployForm } from "@/components/DeployForm";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#15325f,_#08111f_45%,_#04070d_100%)] px-6 py-12 text-slate-50">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-8">
            <p className="inline-flex rounded-full border border-sky-400/30 bg-sky-400/10 px-4 py-1 text-sm font-medium text-sky-200">
              Deploy static frontends against the existing ShipStack backend
            </p>
            <div className="space-y-4">
              <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-6xl">
                Submit a repo, watch the build, and open the deployed site.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
                This UI follows the backend contract exactly: it sends
                <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-sm text-sky-100">
                  repourl
                </span>
                to
                <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-sm text-sky-100">
                  POST /deploy
                </span>
                , polls
                <span className="mx-1 rounded bg-white/10 px-2 py-1 font-mono text-sm text-sky-100">
                  GET /status?id=&lt;id&gt;
                </span>
                , and constructs the preview URL from the deployment ID.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-400">API contract</p>
                <p className="mt-2 text-lg font-semibold text-white">Strict</p>
                <p className="mt-2 text-sm text-slate-300">
                  No invented endpoints, no renamed fields, no hidden assumptions.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-400">Status mapping</p>
                <p className="mt-2 text-lg font-semibold text-white">Normalized</p>
                <p className="mt-2 text-sm text-slate-300">
                  Raw backend states are translated into frontend states for a better UX.
                </p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
                <p className="text-sm text-slate-400">Preview link</p>
                <p className="mt-2 text-lg font-semibold text-white">Derived</p>
                <p className="mt-2 text-sm text-slate-300">
                  Built from the deployment ID and the configured request service URL.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur-xl sm:p-8">
            <DeployForm />
          </section>
        </div>
      </div>
    </main>
  );
}
