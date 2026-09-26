import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Globe2,
  PackageCheck,
  Truck,
} from "lucide-react";
import Link from "next/link";

const trustItems = [
  "Build and preview free",
  "$0 self-service setup",
  "$0 Bloom order fees",
];

export default function HomeHero() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="absolute inset-x-0 top-0 h-[520px] bg-gradient-to-b from-purple-50 via-white to-white" />

      <div className="relative mx-auto grid max-w-7xl gap-14 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-black text-purple-700">
            <Globe2 size={16} />
            BloomWebsites for independent florists
          </div>

          <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
            Your florist website should do more than{" "}
            <span className="text-purple-700">look pretty.</span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
            Build a real florist ecommerce storefront with online ordering,
            delivery and pickup, floral pricing tiers, payments, tax tools,
            order workflows, refunds, and customer notifications — all in one
            place.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/register"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-purple-700 px-7 py-3.5 text-base font-black text-white shadow-lg shadow-purple-200 transition hover:bg-purple-800"
            >
              Build My Website Free
              <ArrowRight size={18} />
            </Link>

            <Link
              href="/#pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-slate-300 bg-white px-7 py-3.5 text-base font-black text-slate-800 transition hover:bg-slate-50"
            >
              See Pricing
            </Link>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
            {trustItems.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 text-sm font-bold text-slate-600"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={13} strokeWidth={3} />
                </span>
                {item}
              </div>
            ))}
          </div>

          <p className="mt-7 text-sm leading-6 text-slate-500">
            Build as long as you want for free. Pay only when you are ready to
            launch your public storefront.
          </p>
        </div>

        <div className="relative">
          <div className="absolute -inset-8 rounded-full bg-purple-200/40 blur-3xl" />

          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/70">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.15em] text-purple-600">
                  Your storefront
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  Bloom & Petal Flower Shop
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-700">
                Live
              </span>
            </div>

            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-purple-50 p-5">
                <div className="flex h-28 items-center justify-center rounded-2xl bg-white text-5xl shadow-sm">
                  💐
                </div>
                <p className="mt-4 text-xs font-black uppercase tracking-wide text-purple-600">
                  Featured arrangement
                </p>
                <p className="mt-1 text-lg font-black text-slate-950">
                  Designer&apos;s Choice
                </p>
                <p className="mt-1 text-sm font-bold text-slate-500">
                  Standard · Deluxe · Premium
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    icon: Truck,
                    title: "Delivery & pickup",
                    text: "Zones, fees, same-day rules",
                  },
                  {
                    icon: CircleDollarSign,
                    title: "Payments & tax",
                    text: "Connected checkout and tax tools",
                  },
                  {
                    icon: PackageCheck,
                    title: "Order operations",
                    text: "Recipes, workflow, refunds",
                  },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                        <Icon size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {item.title}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-950 px-5 py-4 text-white">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    BloomWebsites Standard
                  </p>
                  <p className="mt-1 text-lg font-black">$129/month</p>
                </div>
                <p className="text-sm font-black text-emerald-400">
                  $0 Bloom order fees
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
