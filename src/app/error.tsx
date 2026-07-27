"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & {
    digest?: string;
  };
  reset: () => void;
};

export default function ErrorPage({
  error,
  reset,
}: ErrorPageProps) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-6 py-20">
      <section className="mx-auto max-w-xl text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-red-100 text-red-700">
          <AlertTriangle className="h-10 w-10" />
        </div>

        <p className="mt-8 text-sm font-black uppercase tracking-[0.22em] text-red-600">
          Something went wrong
        </p>

        <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950">
          We could not load this page.
        </h1>

        <p className="mt-6 text-lg leading-8 text-gray-600">
          Please try again. If the problem continues, contact GetBloomDirect
          support.
        </p>

        <button
          type="button"
          onClick={reset}
          className="mt-10 inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700"
        >
          <RefreshCw className="h-5 w-5" />
          Try Again
        </button>
      </section>
    </main>
  );
}