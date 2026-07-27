import HomeFooter from "@/components/HomeFooter";
import HomeHeader from "@/components/HomeHeader";
import { ArrowLeft, Flower2, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <HomeHeader />

      <main className="flex flex-1 items-center justify-center px-6 py-20">
        <section className="mx-auto max-w-2xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-purple-100 text-purple-700">
            <Flower2 className="h-10 w-10" />
          </div>

          <p className="mt-8 text-sm font-black uppercase tracking-[0.22em] text-purple-600">
            Error 404
          </p>

          <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
            This page could not be found.
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
            The page may have moved, the address may be incorrect, or the
            content may no longer be available.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700"
            >
              <Home className="h-5 w-5" />
              Return Home
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-300 bg-white px-6 py-3 font-bold text-gray-800 transition hover:border-purple-300 hover:text-purple-700"
            >
              <ArrowLeft className="h-5 w-5" />
              Contact GetBloomDirect
            </Link>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}