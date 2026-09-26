import {
  Calculator,
  PackageCheck,
  RefreshCcw,
  Store,
} from "lucide-react";

const examples = [
  {
    icon: Calculator,
    question: "Was delivery taxable on this order?",
    answer:
      "Bloom keeps the original tax snapshot so refunds and order history do not depend on today's settings.",
  },
  {
    icon: RefreshCcw,
    question: "The customer only needs the delivery charge refunded.",
    answer:
      "Refund delivery separately and include only the tax that actually belonged to that charge.",
  },
  {
    icon: PackageCheck,
    question: "What recipe did they purchase?",
    answer:
      "The selected pricing-tier recipe can travel with the florist order while remaining private from the customer.",
  },
  {
    icon: Store,
    question: "Can I stop website orders without stopping everything else?",
    answer:
      "BloomWebsites has channel-specific controls so website availability can be managed separately from GetBloomDirect.",
  },
];

export default function HomeWhySwitch() {
  return (
    <section className="bg-slate-950 py-20 text-white sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-400">
              The difference is in the details
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Built around questions generic website builders were never designed to answer.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              A florist website is not just a product gallery. It is delivery
              logic, customer details, substitutions, pricing tiers, taxes,
              design instructions, and exceptions that happen after the order.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {examples.map((example) => {
              const Icon = example.icon;

              return (
                <article
                  key={example.question}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300">
                    <Icon size={19} />
                  </div>
                  <h3 className="mt-5 text-base font-black leading-6">
                    “{example.question}”
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-400">
                    {example.answer}
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
