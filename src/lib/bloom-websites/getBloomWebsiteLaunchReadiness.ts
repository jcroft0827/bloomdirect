import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";
import Shop from "@/models/Shop";
import {
  getBloomWebsiteMerchantReadiness,
} from "@/lib/bloom-websites/payments/getBloomWebsiteMerchantReadiness";
import {
  syncBloomWebsiteStripeConnection,
} from "@/lib/bloom-websites/payments/stripeConnect";
import {
  bloomWebsiteSubscriptionHasAccess,
} from "@/lib/bloom-websites/billing/plans";

export type BloomWebsiteLaunchStepKey =
  | "website"
  | "products"
  | "fulfillment"
  | "payments"
  | "domain"
  | "billing";

export type BloomWebsiteLaunchStep = {
  key: BloomWebsiteLaunchStepKey;
  ready: boolean;
  available: boolean;
  detail: string;
};

export type BloomWebsiteLaunchReadiness = {
  readyToPublish: boolean;
  steps: Record<BloomWebsiteLaunchStepKey, BloomWebsiteLaunchStep>;
};

type WebsiteLean = {
  _id: unknown;
  siteName?: string;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
  };
  pickupPolicy?: {
    enabled?: boolean;
  };
  customDomain?: string;
  domainVerified?: boolean;
  domainRoutingReady?: boolean;
  paymentSettings?: {
    enabled?: boolean;
    provider?: "stripe" | "fiserv";
  };
  billing?: {
    status?: string;
    cancelAtPeriodEnd?: boolean;
  };
};

type ShopLean = {
  businessName?: string;
  contact?: {
    phone?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  delivery?: {
    method?: "zip" | "distance";
    zipZones?: Array<{
      name?: string;
      zip?: string;
      fee?: number;
    }>;
    distanceZones?: Array<{
      min?: number;
      max?: number;
      fee?: number;
    }>;
    maxRadius?: number;
  };
};

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasCompleteBusinessIdentity(shop: ShopLean | null) {
  if (!shop) {
    return false;
  }

  return Boolean(
    hasText(shop.businessName) &&
      hasText(shop.contact?.phone) &&
      hasText(shop.address?.street) &&
      hasText(shop.address?.city) &&
      hasText(shop.address?.state) &&
      /^\d{5}(?:-\d{4})?$/.test(shop.address?.zip?.trim() || ""),
  );
}

function hasWebsiteIdentity(website: WebsiteLean | null) {
  if (!website) {
    return false;
  }

  return Boolean(
    hasText(website.siteName) &&
      hasText(website.branding?.primaryColor) &&
      hasText(website.branding?.accentColor),
  );
}

function hasValidDeliveryArea(shop: ShopLean | null) {
  if (!shop?.delivery) {
    return false;
  }

  if (shop.delivery.method === "zip") {
    return Boolean(
      shop.delivery.zipZones?.some(
        (zone) =>
          hasText(zone.name) &&
          /^\d{5}$/.test(zone.zip?.trim() || "") &&
          Number.isFinite(zone.fee) &&
          Number(zone.fee) >= 0,
      ),
    );
  }

  if (shop.delivery.method === "distance") {
    const maxRadius = Number(shop.delivery.maxRadius);

    return Boolean(
      Number.isFinite(maxRadius) &&
        maxRadius > 0 &&
        shop.delivery.distanceZones?.some((zone) => {
          const min = Number(zone.min);
          const max = Number(zone.max);
          const fee = Number(zone.fee);

          return (
            Number.isFinite(min) &&
            Number.isFinite(max) &&
            Number.isFinite(fee) &&
            min >= 0 &&
            max > min &&
            fee >= 0
          );
        }),
    );
  }

  return false;
}

export async function getBloomWebsiteLaunchReadiness({
  websiteId,
  shopId,
}: {
  websiteId: string;
  shopId: string;
}): Promise<BloomWebsiteLaunchReadiness | null> {
  const [website, shop] = await Promise.all([
    BloomWebsite.findOne({
      _id: websiteId,
      shop: shopId,
    })
      .select(
        "_id siteName branding.primaryColor branding.accentColor pickupPolicy.enabled customDomain domainVerified domainRoutingReady paymentSettings billing",
      )
      .lean<WebsiteLean | null>(),

    Shop.findById(shopId)
      .select(
        "businessName contact.phone address.street address.city address.state address.zip delivery.method delivery.zipZones delivery.distanceZones delivery.maxRadius",
      )
      .lean<ShopLean | null>(),
  ]);

  if (!website || !shop) {
    return null;
  }

  const purchasableProductCount = await BloomWebsiteProduct.countDocuments({
    website: website._id,
    shop: shopId,
    isActive: true,
    soldOut: { $ne: true },
    pricingTiers: {
      $elemMatch: {
        enabled: true,
        price: { $gt: 0 },
      },
    },
  });

  const businessReady = hasCompleteBusinessIdentity(shop);
  const websiteIdentityReady = hasWebsiteIdentity(website);
  const websiteReady = businessReady && websiteIdentityReady;

  const productsReady = purchasableProductCount > 0;

  const deliveryReady = hasValidDeliveryArea(shop);
  const pickupReady = website.pickupPolicy?.enabled === true;
  const fulfillmentReady = deliveryReady || pickupReady;

  const domainReady = Boolean(
    hasText(website.customDomain) &&
      website.domainVerified &&
      website.domainRoutingReady,
  );

  const selectedPaymentProvider =
    website.paymentSettings?.provider === "fiserv"
      ? "fiserv"
      : "stripe";

  if (
    selectedPaymentProvider === "stripe" &&
    website.paymentSettings?.enabled === true
  ) {
    await syncBloomWebsiteStripeConnection({
      websiteId,
      shopId,
    }).catch(() => null);
  }

  const merchantReadiness = await getBloomWebsiteMerchantReadiness({
    websiteId,
    provider: selectedPaymentProvider,
  });

  const paymentsReady = merchantReadiness.ready;
  const paymentsAvailable = selectedPaymentProvider === "stripe";

  const billingReady = bloomWebsiteSubscriptionHasAccess(
    website.billing?.status,
  );

  const steps: BloomWebsiteLaunchReadiness["steps"] = {
    website: {
      key: "website",
      ready: websiteReady,
      available: true,
      detail: websiteReady
        ? "Business identity, contact information, and storefront branding are ready."
        : !businessReady
          ? "Complete the shop name, phone number, and physical address used by the storefront."
          : "Complete the BloomWebsite identity and brand colors.",
    },

    products: {
      key: "products",
      ready: productsReady,
      available: true,
      detail: productsReady
        ? `${purchasableProductCount} active product${
            purchasableProductCount === 1 ? "" : "s"
          } can currently be purchased.`
        : "Add at least one active, in-stock product with an enabled price greater than $0.",
    },

    fulfillment: {
      key: "fulfillment",
      ready: fulfillmentReady,
      available: true,
      detail: fulfillmentReady
        ? deliveryReady && pickupReady
          ? "Delivery and customer pickup are configured."
          : deliveryReady
            ? "A valid customer delivery area is configured."
            : "Customer pickup is enabled."
        : "Configure at least one valid fulfillment method: delivery or pickup.",
    },

    payments: {
      key: "payments",
      ready: paymentsReady,
      available: paymentsAvailable,
      detail: paymentsReady
        ? "Stripe is connected and ready to accept customer payments and payouts."
        : selectedPaymentProvider === "fiserv"
          ? "Fiserv storefront processing is not activated yet. Select Stripe for the V1 launch path."
          : website.paymentSettings?.enabled !== true
            ? "Enable website payments and connect Stripe before publishing."
            : merchantReadiness.connection
              ? "Finish Stripe onboarding so charges, payouts, and account verification are all active."
              : "Connect Stripe before publishing the BloomWebsite.",
    },

    domain: {
      key: "domain",
      ready: domainReady,
      available: true,
      detail: domainReady
        ? "Domain ownership and production routing are verified."
        : website.domainVerified
          ? "Domain ownership is verified; production routing still needs to be confirmed."
          : hasText(website.customDomain)
            ? "The custom domain is saved but ownership verification is incomplete."
            : "Connect and verify the public domain customers will use.",
    },

    billing: {
      key: "billing",
      ready: billingReady,
      available: true,
      detail: billingReady
        ? website.billing?.status === "past_due"
          ? "BloomWebsites is active while Stripe completes payment recovery."
          : website.billing?.cancelAtPeriodEnd
            ? "BloomWebsites remains active through the current paid billing period."
            : "BloomWebsites Standard is active and ready for public launch."
        : "Build and preview for free. Activate BloomWebsites Standard when you are ready to publish.",
    },
  };

  return {
    readyToPublish: Object.values(steps).every((step) => step.ready),
    steps,
  };
}
