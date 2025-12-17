"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function HomeHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
      <div className="flex w-full items-center justify-between">
        <div className="text-xl font-black text-purple-600">
          Get Bloom Direct
        </div>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="#features"
            className="text-gray-600 hover:text-purple-600"
          >
            Features
          </Link>
          <Link href="#pricing" className="text-gray-600 hover:text-purple-600">
            Pricing
          </Link>
          <Link href="/login" className="font-semibold text-purple-600">
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-purple-600 px-6 py-3 font-bold text-white shadow-lg hover:bg-purple-700"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
            onClick={() => setOpen(true)}
            className="md:hidden rounded-xl border p-2"
            aria-label="Open Menu"
        >
            <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {open && (
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-x-0 z-10 top-full bg-white shadow-xl md:hidden"
            >
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <div className="text-lg font-black text-purple-600">Menu</div>
                    <button
                        onClick={() => setOpen(false)}
                        aria-label="Close Menu"
                        className="rounded-xl border p-2"
                    >
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <nav className="flex flex-col gap-6 px-6 py-8">
                    <Link onClick={() => setOpen(false)} href="#features" className="text-lg font-semibold">Features</Link>
                    <Link onClick={() => setOpen(false)} href="#pricing" className="text-lg font-semibold">Pricing</Link>
                    <Link onClick={() => setOpen(false)} href="/login" className="text-lg font-semibold text-purple-600">Log in</Link>
                    <Link
                        onClick={() => setOpen(false)}
                        href="/register"
                        className="mt-4 rounded-2xl bg-purple-600 px-6 py-4 text-center text-lg font-bold text-white"
                    >
                        Get Started
                    </Link>
                </nav>
            </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
