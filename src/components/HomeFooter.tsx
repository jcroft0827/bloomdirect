import Link from "next/link";

export default function HomeFooter() {
  const linkCSS = "transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-4">
          {/* Brand */}
          <div>
            <h3 className="text-2xl font-black text-white">GetBloomDirect</h3>
            <p className="mt-4 text-sm leading-relaxed text-gray-400">
              The fee-free florist-to-florist order network built for
              independent florists.
            </p>
            <p className="mt-4 text-sm font-semibold text-green-400">
              Send orders directly. Build trusted relationships. Keep more of
              every order.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="mb-4 text-sm font-bold uppercase tracking-wide text-white">
              Product
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/#how-it-works" className={linkCSS}>
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#features" className={linkCSS}>
                  Features
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className={linkCSS}>
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/api-docs/external/v1" className={linkCSS}>
                  POS API
                </Link>
              </li>
              <li>
                <Link href="/register" className={linkCSS}>
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
                <Link href="/vision" className={linkCSS}>
                  Vision
                </Link>
              </li>
              <li>
                <Link href="/contact" className={linkCSS}>
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkCSS}>
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkCSS}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/security" className={linkCSS}>
                  Security
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
              <li>✓ Send orders directly</li>
              <li>✓ Keep your customer relationships</li>
              <li>✓ No wire-service commissions</li>
              <li>✓ Start free with Bloom Free</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-16 flex items-center justify-center border-t border-gray-800 pt-8 text-sm">
          <p className="text-gray-500">
            © {new Date().getFullYear()} GetBloomDirect. Helping independent
            florists connect directly.
          </p>
        </div>
      </div>
    </footer>
  );
}
