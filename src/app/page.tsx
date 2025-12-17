// src/app/page.tsx
import HomeHeader from "@/components/HomeHeader";
import HomeHero from "@/components/HomeHero";
import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="relative overflow-hidden bg-white">
        <HomeHeader />
        <HomeHero />
      </section>

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
