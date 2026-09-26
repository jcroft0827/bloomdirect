"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  { href: "/#websites", label: "BloomWebsites" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#network", label: "GetBloomDirect" },
  { href: "/#faq", label: "FAQ" },
  { href: "/vision", label: "Vision" },
];

export default function HomeHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-10 w-10" />
          <div className="leading-tight">
            <p className="text-lg font-black tracking-tight text-slate-950">
              GetBloomDirect
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-purple-600">
              Florist technology
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-slate-600 transition hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Link
            href="/login"
            className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
          >
            Build Free
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 md:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 py-5 md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-black text-slate-700"
              >
                Log In
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-black text-white"
              >
                Build Free
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
