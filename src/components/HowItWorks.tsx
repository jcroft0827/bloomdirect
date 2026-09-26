import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Globe2,
  PencilRuler,
} from "lucide-react";
import Link from "next/link";

const steps = [
  {
    number: "01",
    icon: PencilRuler,
    title: "Build it for free",
    description:
      "Create your products, branding, delivery rules, pickup settings, add-ons, recipes, tax rules, and storefront without paying a website subscription.",
  },
  {
    number: "02",
    icon: CreditCard,
    title: "Connect your business",
    description:
      "Connect customer payments, complete your launch settings, and prepare the public domain you want customers to use.",
  },
  {
    number: "03",
    icon: Globe2,
    title: "Pay when you launch",
    description:
      "Activate BloomWebsites Standard only when you are ready to publish. Choose $129/month or $1,349/year.",
  },
  {
    number: "04",
    icon: CheckCircle2,
    title: "Run orders from Bloom",
    description:
      "Manage incoming website orders, recipes, fulfillment, customer updates, refunds, and order history from your florist dashboard.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.78fr_1.22fr] lg:items-start">
          <div className="lg:sticky lg:top-8">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              No leap of faith required
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Build the whole website before deciding to pay for it.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-600">
              You should be able to see your own products, branding, checkout,
              delivery settings, and workflow before a subscription starts.
            </p>

            <Link
              href="/register"
              className="mt-7 inline-flex items-center gap-2 text-sm font-black text-purple-700 hover:text-purple-900"
            >
              Start building free
              <ArrowRight size={16} />
            </Link>
          </div>

          <ol className="space-y-4">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <li
                  key={step.number}
                  className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:grid-cols-[auto_1fr] sm:p-6"
                >
                  <div className="flex items-center gap-3 sm:block">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-purple-700 shadow-sm">
                      <Icon size={21} />
                    </div>
                    <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400 sm:mt-3 sm:block">
                      Step {step.number}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-xl font-black text-slate-950">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600 sm:text-base">
                      {step.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
