"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flower2,
  Send,
  X,
} from "lucide-react";

type DashboardWelcomeProps = {
  businessName?: string;
  readinessPercentage: number;
  readinessCompleted: number;
  readinessTotal: number;
  onDismiss: () => void;
};

export default function DashboardWelcome({
  businessName,
  readinessPercentage,
  readinessCompleted,
  readinessTotal,
  onDismiss,
}: DashboardWelcomeProps) {
  const safePercentage = Math.min(
    100,
    Math.max(0, readinessPercentage),
  );

  const shopName = businessName?.trim();

  return (
    <section className="relative mb-12 overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-xl">
      <div className="bg-gradient-to-br from-purple-700 via-purple-600 to-indigo-700 px-6 py-8 text-white md:px-10 md:py-10">
        <button
          type="button"
          onClick={onDismiss}
          className="absolute right-4 top-4 rounded-full p-2 text-purple-100 transition hover:bg-white/15 hover:text-white"
          aria-label="Hide welcome guide"
          title="Hide welcome guide"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
              <Flower2 className="h-7 w-7" />
            </span>

            <p className="text-sm font-black uppercase tracking-[0.18em] text-purple-200">
              Welcome to the network
            </p>
          </div>

          <h2 className="mt-5 text-3xl font-black tracking-tight md:text-4xl">
            Welcome to GetBloomDirect
            {shopName ? `, ${shopName}` : ""}!
          </h2>

          <p className="mt-4 text-xl font-bold text-white">
            Independent florists deserve a better way to work together.
          </p>

          <p className="mt-3 max-w-2xl text-base leading-7 text-purple-100">
            We&apos;re excited to have you join the network. Review your shop
            readiness, learn how the platform works, and create your first
            florist-to-florist order.
          </p>
        </div>
      </div>

      <div className="p-6 md:p-8">
        <div className="mb-6 rounded-2xl border border-purple-100 bg-purple-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-wider text-purple-700">
                Shop readiness
              </p>

              <p className="mt-1 text-lg font-bold text-slate-900">
                {readinessCompleted} of {readinessTotal} setup requirements
                complete
              </p>
            </div>

            <p className="text-3xl font-black text-purple-700">
              {safePercentage}%
            </p>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-purple-100">
            <div
              className="h-full rounded-full bg-purple-600 transition-all duration-500"
              style={{ width: `${safePercentage}%` }}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Link
            href="/dashboard#shop-readiness"
            className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CheckCircle2 className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              Review Shop Readiness
            </h3>

            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              See which setup requirements are complete and what still needs
              your attention.
            </p>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-purple-700">
              Review readiness
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/dashboard/getting-started"
            className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <BookOpen className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              Getting Started
            </h3>

            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              Learn how each area of GetBloomDirect works through practical
              guides and future video walkthroughs.
            </p>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-purple-700">
              Open learning center
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>

          <Link
            href="/dashboard/new-order"
            className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-purple-300 hover:bg-purple-50 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-purple-100"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
              <Send className="h-6 w-6" />
            </span>

            <h3 className="mt-4 text-lg font-black text-slate-900">
              Create Your First Order
            </h3>

            <p className="mt-2 flex-1 text-sm leading-6 text-slate-600">
              Experience the network by creating a florist-to-florist order
              when you&apos;re ready.
            </p>

            <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-purple-700">
              Create order
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </Link>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">
            You can reopen guides anytime from{" "}
            <span className="font-bold text-slate-700">
              Getting Started
            </span>
            .
          </p>

          <button
            type="button"
            onClick={onDismiss}
            className="self-start text-sm font-bold text-slate-500 transition hover:text-slate-800 sm:self-auto"
          >
            Don&apos;t show this welcome again
          </button>
        </div>
      </div>
    </section>
  );
}