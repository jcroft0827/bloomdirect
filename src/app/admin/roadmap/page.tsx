import {
  ArrowRight,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { hasRoadmapAccess, lockRoadmap, unlockRoadmap } from "./actions";
import RoadmapTimeline from "./RoadmapTimeline";

type AdminRoadmapPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

export default async function AdminRoadmapPage({
  searchParams,
}: AdminRoadmapPageProps) {
  const unlocked = await hasRoadmapAccess();

  if (!unlocked) {
    const params = await searchParams;
    const invalidPassword = params?.error === "invalid-password";

    return (
      <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl items-center justify-center py-12">
        <section className="w-full overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-2xl shadow-black/20">
          <div className="border-b border-white/10 bg-gradient-to-br from-violet-500/15 via-slate-900 to-slate-900 px-6 py-8 sm:px-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/15 text-violet-300">
              <LockKeyhole className="h-7 w-7" />
            </div>

            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.22em] text-violet-300">
              Private leadership document
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Admin Roadmap
            </h1>

            <p className="mt-4 max-w-xl leading-7 text-slate-300">
              The ten-year GetBloomDirect and Bloom platform vision is protected
              separately from normal admin access.
            </p>
          </div>

          <div className="px-6 py-8 sm:px-10">
            <form action={unlockRoadmap} className="space-y-5">
              <div>
                <label
                  htmlFor="roadmap-password"
                  className="mb-2 block text-sm font-semibold text-slate-200"
                >
                  Roadmap password
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
                  <input
                    id="roadmap-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    autoFocus
                    className="w-full rounded-2xl border border-white/10 bg-slate-950 py-3.5 pl-12 pr-4 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10"
                    placeholder="Enter your private password"
                  />
                </div>

                {invalidPassword && (
                  <p className="mt-3 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    That password is incorrect. Please try again.
                  </p>
                )}
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-3.5 font-semibold text-white transition hover:bg-violet-400 focus:outline-none focus:ring-4 focus:ring-violet-500/20"
              >
                Open Roadmap
                <ArrowRight className="h-5 w-5" />
              </button>
            </form>

            <div className="mt-7 flex gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              <p className="text-sm leading-6 text-slate-400">
                The password is verified on the server and is never sent to the
                browser as a public environment variable. Access expires after
                eight hours or when you lock the roadmap.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-16">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900 px-6 py-8 sm:px-10 lg:px-12 lg:py-12">
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-fuchsia-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">
                <Sparkles className="h-3.5 w-3.5" />
                Living roadmap
              </span>
              <span className="text-sm text-slate-500">
                August 2025 — August 2035
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              The Bloom 10-Year Vision
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
              From a fee-free florist-to-florist network to a complete operating
              platform built around independent florists—and ultimately Bloom POS.
            </p>
          </div>

          <form action={lockRoadmap}>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
            >
              <EyeOff className="h-4 w-4" />
              Lock Roadmap
            </button>
          </form>
        </div>
      </header>

      <RoadmapTimeline />
    </div>
  );
}
