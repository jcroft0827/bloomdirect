import {
  ArrowRight,
  BadgeCheck,
  MessageSquareText,
  Send,
  Users,
} from "lucide-react";
import Link from "next/link";

const points = [
  {
    icon: Send,
    title: "Send directly",
    description:
      "Create florist-to-florist fulfillment orders without routing them through a traditional wire service.",
  },
  {
    icon: Users,
    title: "Build florist relationships",
    description:
      "Search participating shops, save favorites, review activity, and build a network you actually know.",
  },
  {
    icon: MessageSquareText,
    title: "Keep communication together",
    description:
      "Use order notes, messages, and status information to keep florist-to-florist work organized.",
  },
  {
    icon: BadgeCheck,
    title: "No Bloom commission",
    description:
      "GetBloomDirect does not take a percentage from the florist-to-florist order itself.",
  },
];

export default function HomeNetworkGrowth() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              The other side of Bloom
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Your local website and your florist network can live under one account.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              BloomWebsites is the ecommerce focus. GetBloomDirect remains the
              free florist-to-florist network for shops that need help
              fulfilling orders outside their own delivery area.
            </p>

            <Link
              href="/register"
              className="mt-7 inline-flex items-center gap-2 text-sm font-black text-emerald-800"
            >
              Create a free florist account
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {points.map((point) => {
              const Icon = point.icon;

              return (
                <article
                  key={point.title}
                  className="rounded-3xl border border-slate-200 bg-white p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Icon size={19} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-slate-950">
                    {point.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {point.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
