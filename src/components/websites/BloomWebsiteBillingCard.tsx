"use client";

import {
  Check,
  CreditCard,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import toast from "react-hot-toast";

type BillingPeriod = "monthly" | "annual";

type BillingState = {
  status: string;
  billingPeriod: BillingPeriod | null;
  cancelAtPeriodEnd: boolean;
  hasAccess: boolean;
};

export default function BloomWebsiteBillingCard({
  websiteId,
  billing,
}: {
  websiteId: string;
  billing: BillingState;
}) {
  const [billingPeriod, setBillingPeriod] =
    useState<BillingPeriod>("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  async function startCheckout() {
    try {
      setCheckoutLoading(true);

      const response = await fetch(
        "/api/websites/billing/checkout",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            websiteId,
            billingPeriod,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to start BloomWebsites checkout.",
        );
      }

      if (!data?.url) {
        throw new Error(
          "Stripe checkout did not return a destination.",
        );
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to start BloomWebsites checkout.",
      );
    } finally {
      setCheckoutLoading(false);
    }
  }

  async function openPortal() {
    try {
      setPortalLoading(true);

      const response = await fetch(
        "/api/websites/billing/portal",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            websiteId,
          }),
        },
      );

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.error || "Unable to open billing.",
        );
      }

      if (!data?.url) {
        throw new Error(
          "Stripe billing did not return a destination.",
        );
      }

      window.location.href = data.url;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to open billing.",
      );
    } finally {
      setPortalLoading(false);
    }
  }


  if (billing.hasAccess) {
    return (
      <section
        id="website-billing"
        className="overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-sm"
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Check size={24} />
            </div>

            <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-emerald-700">
                BloomWebsites Standard
              </p>
              <h2 className="mt-1 text-2xl font-black text-gray-950">
                Your website subscription is active.
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-600">
                {billing.billingPeriod === "annual"
                  ? "$1,349/year"
                  : "$129/month"}{" "}
                · $0 Bloom order fees.
              </p>

              {billing.status === "past_due" && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                  Stripe is recovering a billing payment. Your
                  storefront remains entitled during the recovery
                  window.
                </p>
              )}

              {billing.cancelAtPeriodEnd && (
                <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800">
                  This subscription is scheduled to cancel at the end
                  of the current paid billing period.
                </p>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={openPortal}
            disabled={portalLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
          >
            {portalLoading ? (
              <Loader2 size={17} className="animate-spin" />
            ) : (
              <CreditCard size={17} />
            )}
            Manage Billing
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      id="website-billing"
      className="overflow-hidden rounded-3xl border border-purple-200 bg-white shadow-sm"
    >
      <div className="bg-gradient-to-br from-purple-950 via-purple-800 to-purple-700 p-6 text-white sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
          <Sparkles size={24} />
        </div>

        <p className="mt-5 text-xs font-black uppercase tracking-[0.16em] text-purple-200">
          Build for free. Pay when you launch.
        </p>

        <h2 className="mt-2 text-2xl font-black sm:text-3xl">
          BloomWebsites Standard
        </h2>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-purple-100">
          Keep building and previewing for free. A subscription is only
          required when you are ready to make the website public and
          accept live orders.
        </p>
      </div>

      <div className="p-6 sm:p-8">
        <div className="mx-auto flex w-fit rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setBillingPeriod("monthly")}
            className={`rounded-lg px-5 py-2 text-sm font-black transition ${
              billingPeriod === "monthly"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Monthly
          </button>

          <button
            type="button"
            onClick={() => setBillingPeriod("annual")}
            className={`rounded-lg px-5 py-2 text-sm font-black transition ${
              billingPeriod === "annual"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Annual
          </button>
        </div>

        <div className="mt-6 text-center">
          {billingPeriod === "monthly" ? (
            <>
              <p className="text-5xl font-black tracking-tight text-gray-950">
                $129
              </p>
              <p className="mt-1 font-bold text-gray-500">
                per month
              </p>
            </>
          ) : (
            <>
              <p className="text-5xl font-black tracking-tight text-gray-950">
                $1,349
              </p>
              <p className="mt-1 font-bold text-gray-500">
                per year
              </p>
              <p className="mt-2 text-sm font-black text-emerald-700">
                Save $199 compared with monthly billing.
              </p>
            </>
          )}
        </div>

        <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-2">
          {[
            "Full florist ecommerce storefront",
            "$0 Bloom order fees",
            "Custom domain",
            "Stripe customer payments",
            "Delivery & pickup",
            "Products, add-ons & pricing tiers",
            "Floral recipes & order workflow",
            "Component-aware refunds",
          ].map((feature) => (
            <div
              key={feature}
              className="flex items-start gap-2 text-sm font-bold text-gray-700"
            >
              <Check
                size={17}
                className="mt-0.5 shrink-0 text-emerald-600"
              />
              {feature}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={startCheckout}
          disabled={checkoutLoading}
          className="mx-auto mt-8 flex min-h-12 w-full max-w-md items-center justify-center gap-2 rounded-xl bg-purple-700 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-800 disabled:opacity-50"
        >
          {checkoutLoading && (
            <Loader2 size={17} className="animate-spin" />
          )}
          {checkoutLoading
            ? "Opening Secure Checkout..."
            : billingPeriod === "annual"
              ? "Activate for $1,349/year"
              : "Activate for $129/month"}
        </button>

        <p className="mt-3 text-center text-xs leading-5 text-gray-500">
          $0 setup fee · $0 Bloom order fee · Payment processor fees
          still apply to customer card payments.
        </p>
      </div>
    </section>
  );
}
