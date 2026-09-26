// src/app/dashboard/websites/launch/page.tsx

import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Globe2,
  Package2,
  Palette,
  Rocket,
  Truck,
} from "lucide-react";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getBloomWebsiteLaunchReadiness } from "@/lib/bloom-websites/getBloomWebsiteLaunchReadiness";
import BloomWebsiteLaunchActions from "@/components/websites/BloomWebsiteLaunchActions";
import BloomWebsiteBillingCard from "@/components/websites/BloomWebsiteBillingCard";
import {
  bloomWebsiteSubscriptionHasAccess,
} from "@/lib/bloom-websites/billing/plans";
import {
  isBloomWebsiteSubscription,
  syncBloomWebsiteSubscription,
} from "@/lib/bloom-websites/billing/syncBloomWebsiteSubscription";
import { stripe } from "@/lib/stripe/stripe";
import BloomWebsite from "@/models/BloomWebsite";

type LaunchPageProps = {
  searchParams: Promise<{
    website?: string;
    billing?: string;
    session_id?: string;
  }>;
};

type BloomWebsiteLean = {
  _id: {
    toString(): string;
  };
  shop: {
    toString(): string;
  };
  previewSlug: string;
  siteName: string;
  status: "preview" | "live" | "paused";
  customDomain?: string;
  pauseReason?: "manual" | "billing" | "system" | null;
  billing?: {
    customerId?: string;
    subscriptionId?: string;
    status?: string;
    priceId?: string;
    billingPeriod?: "monthly" | "annual" | null;
    cancelAtPeriodEnd?: boolean;
  };
};

const launchSteps = [
  {
    key: "website" as const,
    title: "Website",
    description:
      "Confirm your business details, branding, homepage content, and contact information.",
    icon: Palette,
    href: "/dashboard/websites",
  },
  {
    key: "products" as const,
    title: "Products",
    description:
      "Add the real flower products and categories customers will be able to purchase.",
    icon: Package2,
    href: "/dashboard/websites/products",
  },
  {
    key: "fulfillment" as const,
    title: "Delivery & Pickup",
    description:
      "Configure at least one customer fulfillment method before taking live orders.",
    icon: Truck,
    href: "/dashboard/settings",
  },
  {
    key: "payments" as const,
    title: "Payments",
    description:
      "Connect the merchant account that will receive customer payments directly.",
    icon: CircleDollarSign,
    href: "/dashboard/settings#website-payments",
  },
  {
    key: "domain" as const,
    title: "Domain",
    description:
      "Connect the domain customers will use for your public BloomWebsite.",
    icon: Globe2,
    href: "/dashboard/websites/domain",
  },
  {
    key: "billing" as const,
    title: "Activate BloomWebsites",
    description:
      "Build for free. Choose monthly or annual billing only when you are ready to publish.",
    icon: CreditCard,
    href: "#website-billing",
  },
];

export default async function WebsiteLaunchPage({
  searchParams,
}: LaunchPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const {
    website: websiteId,
    billing: billingResult,
    session_id: checkoutSessionId,
  } = await searchParams;

  if (!websiteId) {
    redirect("/dashboard/websites");
  }

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    _id: websiteId,
    shop: session.user.id,
  })
    .select(
      "_id shop previewSlug siteName status pauseReason customDomain billing",
    )
    .lean()) as BloomWebsiteLean | null;

  if (!website) {
    redirect("/dashboard/websites");
  }

  /*
   * Stripe webhooks remain authoritative, but synchronizing the completed
   * Checkout Session here removes the race where a florist returns from Stripe
   * before the subscription webhook has reached Bloom.
   */
  if (
    billingResult === "success" &&
    checkoutSessionId
  ) {
    try {
      const checkoutSession =
        await stripe.checkout.sessions.retrieve(
          checkoutSessionId,
        );

      const metadata = checkoutSession.metadata || {};
      const subscriptionId =
        typeof checkoutSession.subscription === "string"
          ? checkoutSession.subscription
          : checkoutSession.subscription?.id || "";

      if (
        metadata.product === "bloomwebsites" &&
        metadata.websiteId === website._id.toString() &&
        metadata.shopId === session.user.id &&
        subscriptionId
      ) {
        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId,
          );

        if (isBloomWebsiteSubscription(subscription)) {
          await syncBloomWebsiteSubscription(subscription);
        }
      }
    } catch (error) {
      console.error(
        "Unable to synchronize BloomWebsites checkout return:",
        error,
      );
    }

    redirect(
      `/dashboard/websites/launch?website=${encodeURIComponent(
        website._id.toString(),
      )}&billing=activated`,
    );
  }


  /*
   * Keep Bloom's local billing snapshot synchronized with Stripe whenever the
   * Launch page is opened.
   *
   * Florists can change monthly/annual billing directly inside Stripe's normal
   * Customer Portal using "Update plan". That flow returns to Bloom without a
   * special query parameter, and locally the subscription.updated webhook may
   * arrive slightly later (or may not be forwarded while developing locally).
   *
   * Stripe is therefore re-read here before rendering launch/billing state.
   * The webhook remains the background source of truth everywhere else.
   */
  if (website.billing?.subscriptionId) {
    try {
      const subscription =
        await stripe.subscriptions.retrieve(
          website.billing.subscriptionId,
        );

      if (isBloomWebsiteSubscription(subscription)) {
        await syncBloomWebsiteSubscription(subscription);
      }
    } catch (error) {
      console.error(
        "Unable to refresh BloomWebsites subscription on Launch page:",
        error,
      );
    }
  }

  const refreshedWebsite = (await BloomWebsite.findOne({
    _id: website._id,
    shop: session.user.id,
  })
    .select(
      "_id shop previewSlug siteName status pauseReason customDomain billing",
    )
    .lean()) as BloomWebsiteLean | null;

  if (!refreshedWebsite) {
    redirect("/dashboard/websites");
  }

  const readiness = await getBloomWebsiteLaunchReadiness({
    websiteId: refreshedWebsite._id.toString(),
    shopId: session.user.id,
  });

  if (!readiness) {
    redirect("/dashboard/websites");
  }

  const resolvedLaunchSteps = launchSteps.map((step) => ({
    ...step,
    ...readiness.steps[step.key],
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link
          href="/dashboard/websites"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to Websites
        </Link>

        <div className="mt-5">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
            BloomWebsites Launch
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            {refreshedWebsite.status === "live"
              ? `Manage ${refreshedWebsite.siteName}.`
              : refreshedWebsite.status === "paused"
                ? `Get ${refreshedWebsite.siteName} ready to resume.`
                : `Get ${refreshedWebsite.siteName} ready to go live.`}
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
            {refreshedWebsite.status === "live"
              ? "Your storefront is live. You can review launch readiness or pause the public website at any time."
              : refreshedWebsite.status === "paused"
                ? "Your storefront is currently paused. Bloom will re-check every launch requirement before allowing it to resume."
                : "Complete each launch step below. You can build and preview your website as much as you want before publishing it."}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm">
        <div className="bg-gradient-to-br from-purple-950 via-purple-800 to-purple-700 p-7 text-white sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
            <Rocket size={28} />
          </div>

          <h2 className="mt-6 text-2xl font-black sm:text-3xl">
            Launch Checklist
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-purple-100 sm:text-base">
            We&apos;ll guide you through the pieces your storefront needs before
            customers can place real orders.
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {resolvedLaunchSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <div
                key={step.title}
                className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7"
              >
                <div className="flex gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      step.ready
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {step.ready ? (
                      <CheckCircle2 size={24} />
                    ) : (
                      <Icon size={24} />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                        Step {index + 1}
                      </span>

                      {step.ready ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
                          Ready
                        </span>
                      ) : step.available ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
                          Needs attention
                        </span>
                      ) : (
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-500">
                          Coming next
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 text-lg font-black text-gray-950">
                      {step.title}
                    </h3>

                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                      {step.description}
                    </p>

                    <p
                      className={`mt-2 max-w-2xl text-sm font-semibold leading-6 ${
                        step.ready
                          ? "text-emerald-700"
                          : step.available
                            ? "text-amber-700"
                            : "text-gray-500"
                      }`}
                    >
                      {step.detail}
                    </p>
                  </div>
                </div>

                {step.available ? (
                  <Link
                    href={step.href}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
                  >
                    {step.ready ? "Review" : "Set up"}
                    <ArrowRight size={17} />
                  </Link>
                ) : (
                  <div className="inline-flex cursor-not-allowed items-center justify-center rounded-xl bg-gray-100 px-4 py-3 text-sm font-bold text-gray-400">
                    Coming next
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {billingResult === "activated" && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
          BloomWebsites Standard is active. If every other launch step is ready,
          you can publish your website now.
        </div>
      )}

      {billingResult === "canceled" && (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm font-bold text-gray-700">
          Billing checkout was canceled. Your preview and all website work are
          still saved.
        </div>
      )}

      <BloomWebsiteBillingCard
        websiteId={refreshedWebsite._id.toString()}
        billing={{
          status: refreshedWebsite.billing?.status || "",
          billingPeriod:
            refreshedWebsite.billing?.billingPeriod || null,
          cancelAtPeriodEnd: Boolean(
            refreshedWebsite.billing?.cancelAtPeriodEnd,
          ),
          hasAccess: bloomWebsiteSubscriptionHasAccess(
            refreshedWebsite.billing?.status,
          ),
        }}
      />

      <section
        className={`rounded-3xl border p-6 sm:p-8 ${
          refreshedWebsite.status === "live"
            ? "border-emerald-200 bg-emerald-50"
            : refreshedWebsite.status === "paused"
              ? "border-amber-200 bg-amber-50"
              : readiness.readyToPublish
                ? "border-emerald-200 bg-emerald-50"
                : "border-amber-200 bg-amber-50"
        }`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                refreshedWebsite.status === "live" || readiness.readyToPublish
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {refreshedWebsite.status === "live" || readiness.readyToPublish ? (
                <CheckCircle2 size={24} />
              ) : (
                <Rocket size={24} />
              )}
            </div>

            <div>
              <p className="font-black text-gray-950">
                {refreshedWebsite.status === "live"
                  ? "This BloomWebsite is live."
                  : refreshedWebsite.status === "paused"
                    ? readiness.readyToPublish
                      ? "This BloomWebsite is ready to resume."
                      : "This BloomWebsite is paused and no longer meets every launch requirement."
                    : readiness.readyToPublish
                      ? "This BloomWebsite is ready to publish."
                      : "This BloomWebsite is not ready to publish yet."}
              </p>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                Launch readiness is calculated from the saved website,
                products, fulfillment settings, payment connection, and
                verified domain. Publishing and resuming always re-run these
                checks on the server.
              </p>
            </div>
          </div>

          <BloomWebsiteLaunchActions
            websiteId={refreshedWebsite._id.toString()}
            status={refreshedWebsite.status}
            readyToPublish={readiness.readyToPublish}
            customDomain={refreshedWebsite.customDomain || ""}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-gray-200 bg-gray-50 p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-gray-950">
              Keep building your preview.
            </p>

            <p className="mt-1 text-sm leading-6 text-gray-600">
              Nothing on this checklist will make your website public until
              you&apos;re ready to launch.
            </p>
          </div>

          <Link
            href={`/websites/preview/${refreshedWebsite.previewSlug}`}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-700 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-800"
          >
            Preview Website
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>
    </div>
  );
}