import {
  DollarSign,
  Zap,
  ShieldCheck,
  Users,
  MapPin,
  BarChart3,
} from "lucide-react";

const features = [
  {
    icon: DollarSign,
    title: "Keep 100% of Your Money",
    description:
      "No wire fees, no commissions, no hidden cuts. Florists keep what they earn.",
  },
  {
    icon: Zap,
    title: "Instant Order Sending",
    description:
      "Send orders to nearby florists in seconds - no phone calls required.",
  },
  {
    icon: Users,
    title: "Trusted Florist Network",
    description:
      "Work only with verified florists who care about quality and service.",
  },
  {
    icon: MapPin,
    title: "Local Delivery Coverage",
    description: "Find florists exactly where you need them, city by city.",
  },
  {
    icon: ShieldCheck,
    title: "No Wire Service Control",
    description: "You own your relationships and your customers - always.",
  },
  {
    icon: BarChart3,
    title: "Built for Growth",
    description:
      "Modern tools designed to help independent florists scale together.",
  },
];

export default function HomeFeatures() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-black text-gray-900">
          Features Built for <span className="text-emerald-600">Florists</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-600">
          Everything you need to send, receive, and deliver orders - without
          wire services.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-100 bg-gray-50 p-8 transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                <feature.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-xl font-bold text-gray-900">
                {feature.title}
              </h3>

              <p className="mt-3 text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
