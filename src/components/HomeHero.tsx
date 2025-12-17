"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function HomeHero() {
  return (
    <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 py-24 md:grid-cols-2">
      {/* Left Copy */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h1 className="text-5xl font-black leading-tight text-gray-900">
          Send Flowers <span className="text-purple-600">Directly</span>
          <br />
          No Wire Services. Ever.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-gray-600">
          Connect with trusted florists, send orders instantly, and keep 100% of
          your profits. Built by florists - for florists.
        </p>

        <div className="mt-10 flex gap-4">
          <Link
            href="/register"
            className="rounded-2xl border-2 border-purple-600 bg-purple-600 px-8 py-4 inline-block font-bold text-white shadow-lg mr-4 hover:bg-purple-700"
          >
            Get Started
          </Link>
          <Link
            href='#how-it-works'
            className="rounded-2xl border-2 border-purple-600 px-8 py-4 text-lg font-bold text-purple-600 hover:bg-purple-50"
          >
            How It Works
          </Link>
        </div>
      </motion.div>

      {/* Right Image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative h-[420px]"
      >
        {/* Network Lines */}
        <motion.div
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-green-400"
        >
            
            {/* Shop Nodes */}
            {["top-8 left-10", "top-24 right-12", "bottom-20 left-16", "bottom-8 right-20"].map(
                (pos, i) => (
                    <motion.div
                        key={i}
                        className={`absolute ${pos} flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-xl`}
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                    >
                        🌸
                    </motion.div>    
                )
            )}

            {/* Moving Delivery */}
            <motion.div
                className="absolute left-1/2 top-1/2 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-3xl bg-purple-600 text-3xl text-white shadow-2xl"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 5, repeat: Infinity }}
            >
                🚚
            </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}
