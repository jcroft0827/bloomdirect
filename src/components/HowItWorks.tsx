import { Truck, Store, Send, Star } from "lucide-react";

const steps = [
  {
    icon: Store,
    title: "Customer Orders Flowers",
    description:
      "A customer orders flowers from your shop for delivery outside your local area.",
  },
  {
    icon: Send,
    title: "Choose a Trusted Florist",
    description:
      "Search GetBloomDirect, select a verified florist, choose a fulfillment offering, and send the order directly.",
  },
  {
    icon: Truck,
    title: "Local Delivery",
    description:
      "The fulfilling florist designs and delivers the arrangement while keeping communication simple.",
  },
  {
    icon: Star,
    title: "Build Your Network",
    description:
      "Leave reviews, strengthen trusted florist relationships, and grow your fulfillment network without wire-service fees."
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-black text-gray-900">
          How GetBloomDirect <span className="text-emerald-600">Works</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-600">
          Everything you need to send florist-to-florist orders—without paying wire-service commissions.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-2">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-3xl bg-white p-8 text-center shadow-xl flex flex-col justify-center"
            >
              <div className="flex justify-center text-purple-600">
                <step.icon className="h-8 w-8" />
              </div>

              <h3 className="mt-6 text-2xl font-bold text-gray-900">
                {step.title}
              </h3>

              <p className="mt-3 text-gray-600">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
