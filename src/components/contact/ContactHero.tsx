"use client";

import { motion } from "framer-motion";

export default function ContactHero() {
  return (
    <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-24">
      {/* Left */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="relative h-[420px]"
      >
        <h1 className="text-5xl font-black leading-tight text-gray-900 mb-4">
            Contact
        </h1>
        <div className="p-4 border border-gray-200 rounded-lg shadow-2xl flex flex-col gap-6">
            <p className="text-lg font-semibold text-gray-900">
                <span>Phone: </span>
                <span className="text-purple-600">716-566-0673</span>
            </p>
            <p className="text-lg font-semibold text-gray-900">
                <span>Email: </span>
                <a href="mailto:getbloomdirect@gmail.com" className="text-purple-600">getbloomdirect@gmail.com</a>
            </p>
        </div>
      </motion.div>
    </div>
  );
}
