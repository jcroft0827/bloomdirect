"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function HomeHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="w-full border-b border-gray-200 bg-white relative z-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-10 pb-2">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <div className="relative w-32 h-28">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="210 165 360 340">
              <defs />
              <path
                id="shape1"
                transform="matrix(0.766612789146293 0 0 0.766612789146293 253.756497781878 227.798822243297)"
                fill="#7c33e6"
                strokeOpacity="0"
                stroke="#000000"
                strokeWidth="0"
                strokeLinecap="square"
                strokeLinejoin="bevel"
                d="M25.17 0.477219C34.573 -0.504781 51.862 0.349219 61.947 0.251219C76.094 0.113219 90.863 0.198219 105.05 0.262219C125.698 0.356219 135.904 13.3172 149.209 26.7712C157.066 34.5882 164.79 42.5372 172.379 50.6142C160.801 62.3252 148.9 73.7832 137.547 85.6742C129.168 77.3382 121.501 68.5982 112.68 60.6022C101.1 50.1052 91.302 50.2932 76.622 50.3512L49.481 50.4992C49.528 64.3302 48.567 82.4302 50.181 96.2832C50.748 98.3072 52.666 100.956 54.044 102.413C69.809 119.088 86.555 135.002 102.365 151.603C89.369 169.741 62.278 187.943 50.466 206.564C48.624 209.469 49.329 249.048 49.392 256.131C50.089 256.161 50.786 256.178 51.484 256.184C62.448 256.275 74.197 255.709 85.038 256.074C104.888 256.742 113.942 242.127 127.054 229.312L180.996 175.555C190.899 165.715 194.952 161.312 194.996 146.993C194.389 141.444 193.803 140.085 191.444 135.12C203.266 123.811 214.936 111.588 226.739 100.594C240.239 113.189 247.18 123.475 249.191 142.143C252.694 174.649 234.516 190.864 213.659 211.187L187.252 237.374L150.653 274.353C142.926 282.116 135.288 290.451 126.533 297.072C121.014 301.424 111.096 303.931 104.061 304.126C83.039 304.71 61.804 304.149 40.753 304.252C35.176 304.28 27.725 304.259 22.309 303.197C10.23 300.827 0.527017 289.217 0.223017 276.908C-0.0229828 256.167 0.249017 235.971 0.0970172 215.291C0.0660172 208.832 -0.229983 201.446 0.724017 195.128C1.59002 189.526 3.61902 184.167 6.68102 179.397C10.896 172.82 26.64 159.185 33.395 151.496C23.812 140.979 9.91502 130.73 3.45802 118.06C-0.484983 110.323 0.0360172 97.0692 0.0230172 88.4482L1.7235e-05 60.3442C-0.00198276 50.8972 0.171017 41.2192 0.0310172 31.7882C-0.213983 15.2682 8.47702 3.31422 25.17 0.477219Z"
              />
              <path
                id="shape2"
                transform="matrix(0.766612789146293 0 0 0.766612789146293 339.808515647021 228.085432158882)"
                fill="#19d197"
                strokeOpacity="0"
                stroke="#000000"
                strokeWidth="0"
                strokeLinecap="square"
                strokeLinejoin="bevel"
                d="M141.005 0.525825C141.524 0.468825 142.199 0.376825 142.725 0.374825C170.71 0.460825 199.371 -0.706175 227.275 0.692825C240.296 1.34583 249.884 17.8298 249.744 29.9058C249.779 55.3838 250.781 81.3128 249.325 106.718C248.318 124.297 228.405 139.57 216.712 152.017C221.983 157.36 227.286 162.672 232.62 167.951C245.647 180.847 249.775 187.477 249.85 206.152L249.812 253.429C249.799 268.583 252.469 284.913 240.814 296.233C229.424 307.295 210.096 304.364 195.329 304.318L154.551 304.381C127.255 304.262 122.546 298.641 103.452 279.759C94.6104 271.033 85.8144 262.262 77.0634 253.447C87.2584 242.787 101.21 229.145 111.932 219.158C118.506 226.746 128.079 234.764 135.127 242.247C148.936 256.91 155.523 256.612 174.21 256.439C182.903 256.353 191.596 256.326 200.289 256.358L200.422 227.549C200.455 218.159 202.12 208.542 196.066 200.921L146.735 151.945C151.16 148.169 159.429 139.405 163.715 135.035C171.978 126.571 180.322 118.187 188.747 109.884C192.258 106.365 197.522 101.617 199.375 96.9318C201.598 91.3098 200.395 56.2808 200.393 48.3318C187.108 47.4328 164.262 46.9608 151.157 49.7658C144.063 51.2838 131.417 64.9988 125.896 70.5108C116.498 79.8688 107.192 89.3178 97.9784 98.8578C86.3334 110.714 74.3794 122.321 62.6744 134.105C61.4184 135.369 57.6204 140.137 56.9344 141.704C52.2984 152.298 53.7034 158.936 57.4124 168.977C48.4024 178.382 32.2034 194.799 22.6104 203.172C10.1174 190.035 3.91136 182.298 0.741367 163.454C-1.67664 149.076 1.85936 129.829 10.7754 118.153C16.2924 110.928 26.5464 101.162 33.2594 94.4978L70.2294 57.7788L100.709 27.0658C114.005 13.6468 121.289 3.53683 141.005 0.525825Z"
              />
            </svg>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-14 md:flex">
          <Link
            href="#features"
            className="text-xl font-medium text-gray-800 transition hover:text-purple-600"
          >
            Features
          </Link>

          <Link
            href="#pricing"
            className="text-xl font-medium text-gray-800 transition hover:text-purple-600"
          >
            Pricing
          </Link>

          <Link
            href="/login"
            className="text-xl font-semibold text-purple-600 hover:text-purple-700"
          >
            Log in
          </Link>

          <Link
            href="/register"
            className="rounded-2xl bg-purple-600 px-10 py-4 text-xl font-bold text-white shadow-lg transition hover:bg-purple-700"
          >
            Get Started
          </Link>
        </nav>

        {/* Mobile Toggle */}
        {!open && (
          <button
            onClick={() => setOpen(true)}
            className="rounded-xl border border-gray-300 p-3 transition hover:bg-gray-100 md:hidden"
            aria-label="Open Menu"
          >
            <Menu className="h-8 w-8 text-gray-800" />
          </button>
        )}
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
              <Link
                onClick={() => setOpen(false)}
                href="#features"
                className="text-lg font-semibold"
              >
                Features
              </Link>
              <Link
                onClick={() => setOpen(false)}
                href="#pricing"
                className="text-lg font-semibold"
              >
                Pricing
              </Link>
              <Link
                onClick={() => setOpen(false)}
                href="/login"
                className="text-lg font-semibold text-purple-600"
              >
                Log in
              </Link>
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
