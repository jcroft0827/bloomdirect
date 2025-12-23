import Link from "next/link";

export default function HomeFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-black text-white">
              Get Bloom Direct
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              A florist-first network for sending orders directly — no wire
              services, no commissions, no nonsense.
            </p>
            <p className="mt-4 text-sm font-semibold text-green-400">
              Built by florists. Owned by florists.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="#how-it-works" className="hover:text-white">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="#features" className="hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-white">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/login" className="hover:text-white">
                  Log In
                </Link>
              </li>
              <li>
                <Link href="#faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Trust */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
              Why Florists Switch
            </h4>
            <ul className="space-y-3 text-sm text-gray-400">
              <li>✓ Keep 100% of every order</li>
              <li>✓ No wire service fees</li>
              <li>✓ Direct florist-to-florist network</li>
              <li>✓ Free to join</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-gray-800 pt-8 text-sm md:flex-row">
          <p className="text-gray-500">
            © {new Date().getFullYear()} Get Bloom Direct. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
