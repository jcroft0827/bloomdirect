import {
  BadgeDollarSign,
  BellRing,
  CalendarClock,
  CreditCard,
  FileText,
  Globe2,
  PackageOpen,
  ReceiptText,
  RefreshCcw,
  Search,
  ShoppingBag,
  Truck,
} from "lucide-react";

const features = [
  {
    icon: ShoppingBag,
    title: "Florist-first storefront",
    description:
      "Sell arrangements with Standard, Deluxe, and Premium pricing tiers, galleries, add-ons, occasions, and product SEO.",
  },
  {
    icon: Truck,
    title: "Delivery & pickup",
    description:
      "Configure delivery zones, fees, local pickup, same-day eligibility, cutoff times, blackout dates, and fulfillment rules.",
  },
  {
    icon: CreditCard,
    title: "Connected customer payments",
    description:
      "Accept customer card payments through a connected Stripe account without Bloom holding your flower-shop revenue.",
  },
  {
    icon: ReceiptText,
    title: "Tax tools that understand the order",
    description:
      "Handle taxable and non-taxable products, add-ons, delivery, tips, exemptions, and per-item tax overrides.",
  },
  {
    icon: RefreshCcw,
    title: "Real refund controls",
    description:
      "Refund specific products, quantities, add-ons, delivery, tips, tax, or a custom amount while preserving the original order snapshot.",
  },
  {
    icon: FileText,
    title: "Private design recipes",
    description:
      "Save recipe ingredients and designer instructions by pricing tier. Recipes stay private to the florist and follow the order.",
  },
  {
    icon: PackageOpen,
    title: "Order operations",
    description:
      "Use simple or detailed fulfillment workflows, order history, status tracking, and florist-facing operational details.",
  },
  {
    icon: BellRing,
    title: "Customer & florist notifications",
    description:
      "Send order confirmations, florist notifications, delivery confirmations, refund confirmations, and status updates.",
  },
  {
    icon: Globe2,
    title: "Your own domain",
    description:
      "Launch the storefront on a verified custom domain while keeping a private preview available before publication.",
  },
  {
    icon: CalendarClock,
    title: "Same-day controls",
    description:
      "Show customers whether same-day delivery is still available based on the florist's own settings and cutoff.",
  },
  {
    icon: Search,
    title: "Built-in SEO foundation",
    description:
      "Manage product SEO and public storefront metadata with a structure designed for real local florist websites.",
  },
  {
    icon: BadgeDollarSign,
    title: "$0 Bloom order fees",
    description:
      "BloomWebsites uses a flat subscription. Bloom does not take a percentage or per-order fee from your website sales.",
  },
];

export default function HomeFeatures() {
  return (
    <section id="websites" className="bg-slate-50 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-700">
            Built for flower shops
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
            More than an HTML website. A storefront that understands florist work.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            BloomWebsites is built around the things florists actually deal
            with every day — delivery, substitutions, pricing tiers, tax,
            card messages, recipes, refunds, and fulfillment.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <article
                key={feature.title}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
                  <Icon size={21} />
                </div>

                <h3 className="mt-5 text-lg font-black text-slate-950">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
