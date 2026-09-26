import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteMerchantConnection from "@/models/BloomWebsiteMerchantConnection";
import Shop from "@/models/Shop";
import { BloomMerchantReadinessError } from "./getBloomWebsiteMerchantReadiness";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new BloomMerchantReadinessError(
      "STRIPE_NOT_CONFIGURED",
      "Stripe is not configured on Bloom.",
      503,
    );
  }

  const StripeSdk = (await import("stripe")).default;
  return new StripeSdk(secretKey);
}

function mapStripeConnectionStatus(account: any) {
  if (
    account?.charges_enabled === true &&
    account?.payouts_enabled === true &&
    account?.details_submitted === true
  ) {
    return "active" as const;
  }

  if (account?.details_submitted === true) {
    return "restricted" as const;
  }

  return "pending" as const;
}

export function resolveBloomStripeReturnOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const requestHost = requestUrl.hostname.toLowerCase();

  if (
    requestHost === "localhost" ||
    requestHost === "127.0.0.1" ||
    requestHost === "::1"
  ) {
    return requestUrl.origin;
  }

  const configured =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL ||
    "";

  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the authenticated request origin.
    }
  }

  return requestUrl.origin;
}

export async function syncBloomWebsiteStripeConnection({
  websiteId,
  shopId,
}: {
  websiteId: string;
  shopId: string;
}) {
  await connectToDB();

  const connection = await BloomWebsiteMerchantConnection.findOne({
    website: websiteId,
    shop: shopId,
    provider: "stripe",
  });

  if (!connection?.providerAccountId) {
    return null;
  }

  const stripe = await getStripe();

  try {
    const account = await stripe.accounts.retrieve(
      connection.providerAccountId,
    );

    connection.status = mapStripeConnectionStatus(account);
    connection.providerMerchantId = account.id;
    connection.providerAccountId = account.id;
    connection.chargesEnabled = account.charges_enabled === true;
    connection.payoutsEnabled = account.payouts_enabled === true;
    connection.detailsSubmitted = account.details_submitted === true;
    connection.lastSyncedAt = new Date();
    connection.lastError = {
      code: "",
      message: "",
      occurredAt: null,
    } as any;

    await connection.save();
    return connection;
  } catch (error: any) {
    connection.status = "error";
    connection.lastSyncedAt = new Date();
    connection.lastError = {
      code:
        typeof error?.code === "string"
          ? error.code.slice(0, 120)
          : "STRIPE_ACCOUNT_SYNC_FAILED",
      message:
        typeof error?.message === "string"
          ? error.message.slice(0, 1000)
          : "Stripe account status could not be refreshed.",
      occurredAt: new Date(),
    } as any;

    await connection.save().catch(() => null);
    throw error;
  }
}

export async function createBloomWebsiteStripeOnboardingLink({
  websiteId,
  shopId,
  origin,
}: {
  websiteId: string;
  shopId: string;
  origin: string;
}) {
  await connectToDB();

  const [website, shop] = await Promise.all([
    BloomWebsite.findOne({
      _id: websiteId,
      shop: shopId,
    })
      .select("_id shop siteName previewSlug customDomain paymentSettings")
      .lean<any>(),

    Shop.findById(shopId)
      .select("businessName email address")
      .lean<any>(),
  ]);

  if (!website || !shop) {
    throw new BloomMerchantReadinessError(
      "WEBSITE_NOT_FOUND",
      "BloomWebsite could not be found.",
      404,
    );
  }

  if (website.paymentSettings?.provider !== "stripe") {
    throw new BloomMerchantReadinessError(
      "STRIPE_NOT_SELECTED",
      "Save Stripe as the selected website payment processor before connecting it.",
      409,
    );
  }

  const stripe = await getStripe();

  let connection = await BloomWebsiteMerchantConnection.findOne({
    website: website._id,
    shop: shopId,
    provider: "stripe",
  });

  if (!connection) {
    connection = await BloomWebsiteMerchantConnection.create({
      website: website._id,
      shop: shopId,
      provider: "stripe",
      status: "pending",
    });
  }

  if (!connection.providerAccountId) {
    const country = clean(shop.address?.country).toUpperCase() || "US";
    const publicUrl = website.customDomain
      ? `https://${clean(website.customDomain).toLowerCase()}`
      : `${origin}/websites/preview/${encodeURIComponent(
          website.previewSlug,
        )}`;

    const account = await stripe.accounts.create(
      {
        country,
        email: clean(shop.email) || undefined,
        business_profile: {
          name:
            clean(website.siteName) ||
            clean(shop.businessName) ||
            undefined,
          url: publicUrl,
          product_description:
            "Online flower and gift orders fulfilled by an independent florist.",
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        controller: {
          fees: {
            payer: "account",
          },
          losses: {
            payments: "stripe",
          },
          requirement_collection: "stripe",
          stripe_dashboard: {
            type: "full",
          },
        },
        metadata: {
          bloomWebsiteId: String(website._id),
          bloomShopId: String(shopId),
        },
      } as any,
      {
        idempotencyKey: `bloom-stripe-account:${website._id}`,
      },
    );

    connection.providerAccountId = account.id;
    connection.providerMerchantId = account.id;
    connection.status = mapStripeConnectionStatus(account);
    connection.chargesEnabled = account.charges_enabled === true;
    connection.payoutsEnabled = account.payouts_enabled === true;
    connection.detailsSubmitted = account.details_submitted === true;
    connection.lastSyncedAt = new Date();
    await connection.save();
  } else {
    await syncBloomWebsiteStripeConnection({
      websiteId: String(website._id),
      shopId,
    });

    connection = await BloomWebsiteMerchantConnection.findOne({
      website: website._id,
      shop: shopId,
      provider: "stripe",
    });

    if (!connection) {
      throw new BloomMerchantReadinessError(
        "STRIPE_CONNECTION_MISSING",
        "Stripe connection could not be restored.",
        409,
      );
    }
  }

  const accountLink = await stripe.accountLinks.create({
    account: connection.providerAccountId,
    refresh_url:
      `${origin}/api/websites/payments/stripe/connect/refresh`,
    return_url:
      `${origin}/api/websites/payments/stripe/connect/return`,
    type: "account_onboarding",
  });

  return {
    url: accountLink.url,
    accountId: connection.providerAccountId,
  };
}

export async function syncBloomWebsiteStripeConnectionByAccountId(
  providerAccountId: string,
) {
  await connectToDB();

  const connection = await BloomWebsiteMerchantConnection.findOne({
    provider: "stripe",
    providerAccountId,
  }).lean<any>();

  if (!connection) {
    return null;
  }

  return syncBloomWebsiteStripeConnection({
    websiteId: String(connection.website),
    shopId: String(connection.shop),
  });
}
