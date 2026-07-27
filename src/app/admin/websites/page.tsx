import WebsitesClient from "./WebsitesClient";

export default function AdminWebsitesPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
          Trust & Verification
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Website Verification
        </h1>

        <p className="mt-3 max-w-3xl text-slate-400">
          Review websites that could not be verified automatically and decide whether the associated florist should receive website verification.
        </p>
      </header>

      <WebsitesClient />
    </div>
  )
}