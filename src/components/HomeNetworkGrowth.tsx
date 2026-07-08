import { CheckCircle, Flower2, MessageSquare, Star, Users } from "lucide-react";

const highlights = [
  {
    icon: Users,
    title: "Independent Florists",
    description: "Built for real flower shops looking for better fulfillment options.",
  },
  {
    icon: Flower2,
    title: "Direct Fulfillment",
    description: "Send and receive florist-to-florist orders without wire-service commissions.",
  },
  {
    icon: MessageSquare,
    title: "Real Communication",
    description: "Keep order details, notes, and florist communication in one place.",
  },
  {
    icon: Star,
    title: "Reviews & Trust",
    description: "Build stronger relationships through reviews and verified florist activity.",
  },
];

export default function HomeNetworkGrowth() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
            <CheckCircle className="h-7 w-7" />
          </div>

          <h2 className="text-4xl font-black text-gray-900">
            A Network Built for{" "}
            <span className="text-emerald-600">Real Florist Relationships</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            GetBloomDirect is helping independent florists move away from
            commission-heavy wire services and build direct fulfillment
            relationships with shops they trust.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {highlights.map((item, i) => (
            <div
              key={i}
              className="rounded-3xl border border-gray-100 bg-gray-50 p-8 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                <item.icon className="h-7 w-7" />
              </div>

              <h3 className="mt-6 text-xl font-bold text-gray-900">
                {item.title}
              </h3>

              <p className="mt-3 text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}