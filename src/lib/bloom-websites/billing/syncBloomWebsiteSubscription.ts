import Stripe from "stripe";

import BloomWebsite from "@/models/BloomWebsite";

import {
  billingPeriodFromBloomWebsitePriceId,
  bloomWebsiteSubscriptionHasAccess,
} from "./plans";

function stripeId(
  value:
    | string
    | { id: string }
    | null
    | undefined,
) {
  if (!value) return "";
  return typeof value === "string" ? value : value.id;
}

export function isBloomWebsiteSubscription(
  subscription: Stripe.Subscription,
) {
  const explicitProduct = subscription.metadata?.product;

  if (explicitProduct === "bloomwebsites") {
    return true;
  }

  const priceId =
    subscription.items.data[0]?.price?.id || "";

  return billingPeriodFromBloomWebsitePriceId(priceId) !== null;
}

export async function syncBloomWebsiteSubscription(
  subscription: Stripe.Subscription,
) {
  const priceId =
    subscription.items.data[0]?.price?.id || "";

  /*
   * The active Stripe Price is the authoritative billing period.
   *
   * Checkout writes the original billing period into subscription metadata,
   * but Stripe Customer Portal does not rewrite that metadata when the
   * customer later switches Monthly <-> Annual. Preferring metadata here would
   * therefore leave Bloom permanently showing the original plan even though
   * Stripe has already changed the subscription Price.
   *
   * Keep metadata only as a legacy fallback for subscriptions whose Price ID
   * cannot be mapped.
   */
  const billingPeriod =
    billingPeriodFromBloomWebsitePriceId(priceId) ||
    (subscription.metadata?.billingPeriod === "annual" ||
    subscription.metadata?.billingPeriod === "monthly"
      ? subscription.metadata.billingPeriod
      : null);

  const websiteId =
    subscription.metadata?.websiteId || "";

  const shopId =
    subscription.metadata?.shopId || "";

  let website = websiteId
    ? await BloomWebsite.findOne({
        _id: websiteId,
        ...(shopId ? { shop: shopId } : {}),
      })
    : null;

  if (!website) {
    website = await BloomWebsite.findOne({
      "billing.subscriptionId": subscription.id,
    });
  }

  if (!website) {
    console.error(
      "No BloomWebsite matched Stripe subscription:",
      {
        subscriptionId: subscription.id,
        websiteId,
        shopId,
      },
    );

    return null;
  }

  const customerId = stripeId(subscription.customer);
  const hasAccess = bloomWebsiteSubscriptionHasAccess(
    subscription.status,
  );
  const now = new Date();

  website.billing.customerId = customerId;
  website.billing.subscriptionId = subscription.id;
  website.billing.status = subscription.status;
  website.billing.priceId = priceId;
  website.billing.billingPeriod = billingPeriod;
  website.billing.cancelAtPeriodEnd =
    subscription.cancel_at_period_end;
  website.billing.lastSyncedAt = now;

  if (hasAccess && !website.billing.startedAt) {
    website.billing.startedAt = now;
  }

  if (
    subscription.status === "canceled" ||
    subscription.status === "incomplete_expired"
  ) {
    website.billing.endedAt = now;
  } else if (hasAccess) {
    website.billing.endedAt = null;
  }

  /*
   * A storefront may remain live during Stripe's normal payment recovery
   * window (`past_due`). Hard entitlement loss pauses it.
   *
   * We intentionally never auto-resume after payment recovery. Resuming
   * re-runs domain, payments, inventory/product, fulfillment, and billing
   * readiness server-side.
   */
  if (!hasAccess && website.status === "live") {
    website.status = "paused";
    website.pauseReason = "billing";
  }

  await website.save();

  return website;
}
