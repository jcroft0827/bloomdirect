import Link from "next/link";

export default function HomePricing() {
  return (
    <section id="pricing" className="bg-gray-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-black text-gray-900">
            Simple Pricing for{" "}
            <span className="text-purple-600">Independent Florists</span>
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Start with Bloom Free and upgrade to Bloom Pro when you're ready for
            unlimited sending, advanced tools, and deeper integrations.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Bloom Free */}
          <div className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  Bloom Free
                </h3>
                <p className="mt-2 text-gray-600">
                  For florists joining the network and sending occasional
                  fulfillment orders.
                </p>
              </div>

              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                Available Now
              </span>
            </div>

            <div className="mt-8">
              <p className="text-5xl font-black text-emerald-600">
                $0
                <span className="text-lg font-semibold text-gray-500">
                  /month
                </span>
              </p>
            </div>

            <ul className="mt-8 space-y-4 text-left text-gray-700">
              <li>✓ Send up to 15 orders per month</li>
              <li>✓ Receive unlimited orders</li>
              <li>✓ No per-order commissions</li>
              <li>✓ Basic public florist profile</li>
              <li>✓ Reviews and order messaging</li>
              <li>✓ Basic notifications</li>
              <li>✓ Basic verification and search visibility</li>
              <li>✓ Designer&apos;s Choice + 1 Featured Arrangement</li>
              <li>✓ Product notes for sending florists</li>
            </ul>

            <Link
              href="/register"
              className="mt-10 block rounded-2xl bg-emerald-600 px-6 py-4 text-center font-bold text-white hover:bg-emerald-700"
            >
              Join Free
            </Link>
          </div>

          {/* Bloom Pro */}
          <div className="relative rounded-3xl border-2 border-purple-200 bg-white p-8 shadow-2xl">
            <span className="absolute right-6 top-6 rounded-full bg-purple-100 px-4 py-2 text-sm font-bold text-purple-700">
              Coming Soon
            </span>

            <div className="pr-32">
              <h3 className="text-2xl font-black text-gray-900">Bloom Pro</h3>
              <p className="mt-2 text-gray-600">
                For florists who rely on GetBloomDirect every day and want more
                automation, visibility, and control.
              </p>
            </div>

            <div className="mt-8">
              <p className="text-5xl font-black text-purple-600">
                $49
                <span className="text-lg font-semibold text-gray-500">
                  /month
                </span>
              </p>
              <p className="mt-2 text-sm font-semibold text-gray-500">
                Or $490/year — save two months with annual billing.
              </p>
            </div>

            <ul className="mt-8 space-y-4 text-left text-gray-700">
              <li>✓ Unlimited order sending</li>
              <li>✓ Receive unlimited orders</li>
              <li>✓ Up to 10 fulfillment offerings</li>
              <li>✓ Up to 3 featured arrangements</li>
              <li>✓ Activate and deactivate offerings</li>
              <li>✓ POS API access</li>
              <li>✓ Advanced reporting</li>
              <li>✓ Bloom Pro badge</li>
              <li>✓ Priority support</li>
            </ul>

            <div className="mt-10 rounded-2xl bg-purple-50 px-6 py-4 text-center font-semibold text-purple-700">
              Bloom Pro is being finalized now.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}