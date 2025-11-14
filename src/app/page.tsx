// src/app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 py-16 sm:py-24 text-center">
        <h1 className="text-5xl sm:text-7xl font-bold text-green-700 mb-6">
          Florists Helping Florists
        </h1>
        <p className="text-xl sm:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
          Send orders to trusted shops. Keep <strong className="text-green-600">$20–$27 profit</strong> instantly.
          No wire fees. Ever.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link
            href="/login"
            className="bg-green-600 hover:bg-green-700 text-white font-bold text-xl px-8 py-4 rounded-lg shadow-lg transition transform hover:scale-105"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="bg-white hover:bg-gray-100 text-green-700 font-bold text-xl px-8 py-4 rounded-lg shadow-lg border-2 border-green-600 transition transform hover:scale-105"
          >
            Join Free
          </Link>
        </div>

        <p className="text-lg text-gray-600">
          Already used by <strong>florists in 12 states</strong> to skip FTD.
        </p>
      </div>

      {/* Trust Bar */}
      <div className="bg-green-700 text-white py-8">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <p className="text-2xl font-bold">
            “I made $87 in 3 days. FTD gave me $12.” — Sarah, Ohio
          </p>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-8">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-6xl mb-4">$25</div>
          <h3 className="text-xl font-bold mb-2">You Keep</h3>
          <p className="text-gray-600">Per forwarded order. Instantly.</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-6xl mb-4">45s</div>
          <h3 className="text-xl font-bold mb-2">Send Time</h3>
          <p className="text-gray-600">From call to done.</p>
        </div>
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-6xl mb-4">0%</div>
          <h3 className="text-xl font-bold mb-2">Wire Fees</h3>
          <p className="text-gray-600">Never again.</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-100 py-8 text-center text-gray-600">
        <p>© 2025 BloomDirect. Built by florists, for florists.</p>
      </footer>
    </div>
  );
}