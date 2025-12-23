import { Truck, Store, Send } from "lucide-react";

const steps = [
  {
    icon: Store,
    title: "Receive an Order",
    description:
      "A customer places an order with your shop like normal — no wire service involved.",
  },
  {
    icon: Send,
    title: "Send to a Florist",
    description:
      "Instantly forward the order to a trusted florist in the delivery area.",
  },
  {
    icon: Truck,
    title: "Delivered, Fee-Free",
    description:
      "The order is delivered locally and both florists keep 100% of the value.",
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <h2 className="text-center text-4xl font-black text-gray-900">
          How It <span className="text-emerald-600">Works</span>
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-lg text-gray-600">
          A modern, florist-first alternative to wire services.
        </p>

        <div className="mt-16 grid grid-cols-1 gap-12 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={i}
              className="rounded-3xl bg-white p-8 text-center shadow-xl "
            >
              <div>
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
