import {
  ArrowRight,
  Check,
  Network,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

const websiteFeatures = [
  "Build and preview before paying",
  "Custom-domain storefront",
  "Online ordering with delivery & pickup",
  "Standard / Deluxe / Premium product tiers",
  "Stripe customer payments",
  "Tax, tips & exemption controls",
  "Order workflow, recipes & notifications",
  "Component-aware refunds",
  "$0 self-service setup",
  "$0 Bloom order fees",
];

export default function HomePricing() {
  return (
    <section id="pricing" className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-700">
            Straightforward pricing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            Build free. Launch when it is worth paying for.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            No setup fee and no Bloom percentage taken from website orders.
            Payment processor fees still apply to customer card payments.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[2rem] border-2 border-purple-200 bg-white shadow-2xl shadow-purple-100">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="bg-gradient-to-br from-purple-950 via-purple-800 to-purple-700 p-7 text-white sm:p-9">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-purple-100">
                <Sparkles size={14} />
                BloomWebsites Standard
              </div>

              <div className="mt-7">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-black tracking-tight">
                    $129
                  </span>
                  <span className="pb-1 text-base font-bold text-purple-200">
                    /month
                  </span>
                </div>

                <p className="mt-4 text-sm leading-6 text-purple-100">
                  Or <strong className="text-white">$1,349/year</strong> — save
                  $199 compared with monthly billing.
                </p>
              </div>

              <div className="mt-7 space-y-2 rounded-2xl bg-white/10 p-4">
                <p className="font-black">$0 setup</p>
                <p className="font-black">$0 Bloom order fees</p>
                <p className="text-sm text-purple-100">
                  Build and preview free until you are ready to publish.
                </p>
              </div>

              <Link
                href="/register"
                className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-purple-800 transition hover:bg-purple-50"
              >
                Build My Website Free
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="p-7 sm:p-9">
              <h3 className="text-xl font-black text-slate-950">
                Everything in the launch plan
              </h3>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {websiteFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-start gap-2.5 text-sm font-bold leading-6 text-slate-700"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    {feature}
                  </div>
                ))}
              </div>

              <p className="mt-7 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                One complete launch plan. No setup packages, order-fee tiers,
                or percentage-based Bloom pricing to decode.
              </p>
            </div>
          </div>
        </div>

        <div id="network" className="mt-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Network size={23} />
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Need to fulfill outside your area? GetBloomDirect starts free.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
              The florist-to-florist network helps independent shops send and
              receive fulfillment orders directly without Bloom taking a
              per-order commission.
            </p>
          </div>

          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-2">
            <article className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-7">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">
                Bloom Free
              </p>
              <p className="mt-3 text-4xl font-black text-slate-950">
                $0
                <span className="text-base font-bold text-slate-500">
                  /month
                </span>
              </p>
              <ul className="mt-6 space-y-3 text-sm font-bold text-slate-700">
                <li>✓ Send up to 15 network orders per month</li>
                <li>✓ Receive unlimited network orders</li>
                <li>✓ No Bloom per-order commission</li>
                <li>✓ Public florist profile, reviews & messaging</li>
                <li>✓ Designer&apos;s Choice + 1 Featured offering</li>
              </ul>
              <Link
                href="/register"
                className="mt-7 inline-flex items-center gap-2 text-sm font-black text-emerald-800"
              >
                Join the network free
                <ArrowRight size={15} />
              </Link>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-slate-50 p-7">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-purple-700">
                Bloom Pro
              </p>
              <p className="mt-3 text-4xl font-black text-slate-950">
                $49
                <span className="text-base font-bold text-slate-500">
                  /month
                </span>
              </p>
              <p className="mt-2 text-sm font-bold text-slate-500">
                Or $450/year.
              </p>
              <ul className="mt-6 space-y-3 text-sm font-bold text-slate-700">
                <li>✓ Unlimited network order sending</li>
                <li>✓ Expanded fulfillment offerings</li>
                <li>✓ Reporting & Favorite Florists</li>
                <li>✓ Priority search placement</li>
                <li>✓ POS API access</li>
              </ul>
              <Link
                href="/register?plan=pro"
                className="mt-7 inline-flex items-center gap-2 text-sm font-black text-purple-700"
              >
                Explore Bloom Pro
                <ArrowRight size={15} />
              </Link>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
