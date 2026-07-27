import ShopsClient from "./ShopsClient";

export default function AdminShopsPage() {
  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-400">
          Platform Accounts
        </p>

        <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Shops
        </h1>

        <p className="mt-3 max-w-3xl text-slate-400">
          Review florist accounts, plan status, verification, setup completion, visibility, registration dates, and recent account activity.
        </p>
      </header>

      <ShopsClient />
    </div>
  )
}