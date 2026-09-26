export type BloomWebsiteBillingPeriod = "monthly" | "annual";

export const BLOOM_WEBSITE_MONTHLY_PRICE_CENTS = 12_900;
export const BLOOM_WEBSITE_ANNUAL_PRICE_CENTS = 134_900;

export const BLOOM_WEBSITE_ANNUAL_SAVINGS_CENTS =
  BLOOM_WEBSITE_MONTHLY_PRICE_CENTS * 12 -
  BLOOM_WEBSITE_ANNUAL_PRICE_CENTS;

export function bloomWebsitePriceId(
  billingPeriod: BloomWebsiteBillingPeriod,
) {
  return billingPeriod === "annual"
    ? process.env.BLOOMWEBSITES_STRIPE_ANNUAL_PRICE_ID || ""
    : process.env.BLOOMWEBSITES_STRIPE_MONTHLY_PRICE_ID || "";
}

export function billingPeriodFromBloomWebsitePriceId(
  priceId: string | null | undefined,
): BloomWebsiteBillingPeriod | null {
  if (!priceId) return null;

  if (
    process.env.BLOOMWEBSITES_STRIPE_MONTHLY_PRICE_ID &&
    priceId === process.env.BLOOMWEBSITES_STRIPE_MONTHLY_PRICE_ID
  ) {
    return "monthly";
  }

  if (
    process.env.BLOOMWEBSITES_STRIPE_ANNUAL_PRICE_ID &&
    priceId === process.env.BLOOMWEBSITES_STRIPE_ANNUAL_PRICE_ID
  ) {
    return "annual";
  }

  return null;
}

export function bloomWebsiteSubscriptionHasAccess(
  status: string | null | undefined,
) {
  return (
    status === "active" ||
    status === "trialing" ||
    status === "past_due"
  );
}
