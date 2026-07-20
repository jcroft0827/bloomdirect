"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { CheckIcon, StarIcon } from "@heroicons/react/24/solid";
import { useRouter, useSearchParams } from "next/navigation";

type BillingPeriod = "monthly" | "annual";

interface UpgradeClientProps {
  initialShop: {
    isPro: boolean;
    proSince: string | null;
    stripeStatus: string | null;
    stripePlanId: string | null;
    cancelAtPeriodEnd: boolean;
  };
}

const PRO_FEATURES = [
  "Unlimited order sending",
  "Up to 10 fulfillment offerings",
  "Favorite Florists",
  "Priority florist search placement",
  "Bloom Pro badge",
  "Advanced reporting and sales-tax summaries",
  "POS API integration",
  "Priority support",
  "Enhanced order reminders",
];

export default function UpgradeClient({ initialShop }: UpgradeClientProps) {
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const [portalLoading, setPortalLoading] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkout = searchParams.get("checkout");

    if (checkout === "success") {
      toast.success("Welcome to Bloom Pro! Your subscription is now active.");

      router.replace("/dashboard/upgrade");
    }

    if (checkout === "canceled") {
      toast("Checkout canceled. No changes were made to your plan.");

      router.replace("/dashboard/upgrade");
    }
  }, [searchParams, router]);

  const startCheckout = async () => {
    try {
      setCheckoutLoading(true);

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          billingPeriod,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      if (!data.url) {
        throw new Error("Checkout did not return a destination.");
      }

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Checkout error:", error);

      toast.error(error.message || "Unable to start Bloom Pro checkout.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const openBillingPortal = async () => {
    try {
      setPortalLoading(true);

      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const contentType = res.headers.get("content-type") || "";

      const data = contentType.includes("application/json")
        ? await res.json()
        : null;

      if (!res.ok) {
        throw new Error(data?.error || "Unable to open billing management.");
      }

      if (!data?.url) {
        throw new Error("Billing portal did not return a destination.");
      }

      window.location.href = data.url;
    } catch (error: any) {
      console.error("Billing portal error:", error);

      toast.error(error.message || "Unable to open billing management.");
    } finally {
      setPortalLoading(false);
    }
  };

  if (initialShop.isPro) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-amber-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-amber-400 to-yellow-500 px-8 py-10 text-center text-white">
              <StarIcon className="mx-auto h-14 w-14" />

              <h1 className="mt-4 text-4xl font-black">You’re on Bloom Pro</h1>

              <p className="mt-2 text-lg text-amber-50">
                Your shop has access to the complete Bloom Pro feature set.
              </p>
            </div>

            <div className="p-8 md:p-10">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Subscription Status
                  </p>

                  <p className="mt-2 text-2xl font-black capitalize text-slate-900">
                    {initialShop.stripeStatus || "Active"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    Pro Since
                  </p>

                  <p className="mt-2 text-2xl font-black text-slate-900">
                    {initialShop.proSince
                      ? new Date(initialShop.proSince).toLocaleDateString()
                      : "Current"}
                  </p>
                </div>
              </div>

              {initialShop.cancelAtPeriodEnd && (
                <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                  Your Bloom Pro subscription is scheduled to cancel at the end
                  of the current billing period.
                </div>
              )}

              <button
                type="button"
                onClick={openBillingPortal}
                disabled={portalLoading}
                className="mt-8 w-full rounded-xl bg-purple-600 px-6 py-3 font-bold text-white transition hover:bg-purple-700 disabled:opacity-50"
              >
                {portalLoading ? "Opening Billing..." : "Manage Billing"}
              </button>

              <Link
                href="/dashboard"
                className="mt-4 block text-center font-semibold text-slate-500 hover:text-purple-600"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const price = billingPeriod === "monthly" ? "$49" : "$450";

  const priceSuffix = billingPeriod === "monthly" ? "per month" : "per year";

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-purple-600">
            Bloom Pro
          </p>

          <h1 className="mt-2 text-4xl font-black text-slate-900 md:text-5xl">
            Remove Limits. Grow Your Network.
          </h1>

          <p className="mx-auto mt-4 max-w-3xl text-lg text-slate-600">
            Bloom Pro gives your shop unlimited sending, advanced reporting,
            expanded fulfillment tools, and deeper GetBloomDirect integration.
          </p>
        </div>

        <div className="mx-auto mt-8 flex w-fit rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={[
              "rounded-lg px-5 py-2 font-bold transition-colors",
              billingPeriod === "monthly"
                ? "bg-purple-600 text-white"
                : "text-slate-600 hover:bg-purple-50",
            ].join(" ")}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => setBillingPeriod("annual")}
            className={[
              "rounded-lg px-5 py-2 font-bold transition-colors",
              billingPeriod === "annual"
                ? "bg-purple-600 text-white"
                : "text-slate-600 hover:bg-purple-50",
            ].join(" ")}
          >
            Annual
          </button>
        </div>

        <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.3fr]">
            <div className="bg-gradient-to-br from-purple-600 to-pink-600 p-8 text-white md:p-10">
              <StarIcon className="h-12 w-12 text-yellow-300" />

              <h2 className="mt-5 text-3xl font-black">Bloom Pro</h2>

              <div className="mt-5">
                <span className="text-5xl font-black">{price}</span>

                <span className="ml-2 text-purple-100">{priceSuffix}</span>
              </div>

              {billingPeriod === "annual" && (
                <p className="mt-2 font-semibold text-yellow-200">
                  Save $138 compared with monthly billing.
                </p>
              )}

              <button
                type="button"
                onClick={startCheckout}
                disabled={checkoutLoading}
                className="mt-8 w-full rounded-xl bg-white px-6 py-3 font-black text-purple-700 transition hover:scale-[1.02] disabled:opacity-50"
              >
                {checkoutLoading
                  ? "Opening Checkout..."
                  : `Choose ${
                      billingPeriod === "monthly" ? "Monthly" : "Annual"
                    } Plan`}
              </button>

              <p className="mt-3 text-center text-sm text-purple-100">
                Cancel anytime through your billing portal.
              </p>
            </div>

            <div className="p-8 md:p-10">
              <h3 className="text-2xl font-black text-slate-900">
                Everything included
              </h3>

              <div className="mt-6 space-y-4">
                {PRO_FEATURES.map((feature) => (
                  <div key={feature} className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-full bg-emerald-100 p-1">
                      <CheckIcon className="h-4 w-4 text-emerald-700" />
                    </div>

                    <p className="font-medium text-slate-700">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard"
          className="mt-8 block text-center font-semibold text-slate-500 hover:text-purple-600"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
