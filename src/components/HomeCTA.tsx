import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

export default function HomeCTA() {
  return (
    <section className="bg-white px-5 pb-20 sm:px-6 sm:pb-24 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-purple-950 via-purple-800 to-purple-700 px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <div className="max-w-3xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-200">
            Start without committing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
            Build the florist website you wish you already had.
          </h2>
          <p className="mt-4 text-base leading-7 text-purple-100">
            Create the storefront, load your products, configure delivery, and
            preview the whole experience before the $129/month subscription
            begins.
          </p>

          <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-purple-100">
            {[
              "$0 setup",
              "$0 Bloom order fees",
              "Manage billing through Stripe",
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Check size={15} />
                {item}
              </span>
            ))}
          </div>
        </div>

        <Link
          href="/register"
          className="mt-8 inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-7 py-3 text-sm font-black text-purple-800 transition hover:bg-purple-50 lg:mt-0"
        >
          Build Free
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}
