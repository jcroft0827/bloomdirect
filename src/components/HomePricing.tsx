import Link from "next/link";

export default function HomePricing() {
  return (
    <section id="pricing" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-4xl font-black text-gray-900">
          Free to Join.{" "}
          <span className="text-purple-600">Pay Only When You Scale.</span>
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">
          Join the florist network for free. Upgrade to Pro when you want
          unlimited sending, priority support, and advanced tools.
        </p>

        {/* Free plan callout */}
        <div className="mx-auto mt-10 max-w-2xl rounded-2xl bg-emerald-50 px-6 py-4 text-emerald-800">
          <strong>Free Plan:</strong> Send & receive orders, no per-order fees,
          no commissions.
        </div>

        {/* Pro plan */}
        <div className="mx-auto mt-12 max-w-md rounded-3xl bg-white p-10 shadow-2xl">
          <span className="inline-block rounded-full bg-purple-100 px-4 py-1 text-sm font-semibold text-purple-700">
            Most Popular
          </span>
          <h3 className="text-2xl font-bold text-gray-900">Florist Pro</h3>

          <p className="mt-4 text-5xl font-black text-purple-600">
            $39
            <span className="text-xl font-semibold text-gray-500">/mo</span>
          </p>

          <p className="mt-2 text-sm text-gray-500">
            Less than one wire service fee
          </p>

          <ul className="mt-8 space-y-4 text-left text-gray-700">
            <li>✓ Unlimited order sending</li>
            <li>✓ Priority network placement</li>
            <li>✓ Keep 100% of every order</li>
            <li>✓ Future POS integrations</li>
          </ul>

          <Link
            href="/register"
            className="mt-10 block rounded-2xl bg-purple-600 px-6 py-4 font-bold text-white hover:bg-purple-700"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </section>
  );
}
