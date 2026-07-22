// /lib/shops/getShopReadiness.ts

type ShopReadinessInput = {
  businessName?: string | null;
  email?: string | null;

  isPublic?: boolean;
  isSuspended?: boolean;

  verification?: {
    emailVerified?: boolean;
  } | null;

  setupProgress?: {
    businessInfo?: boolean;
    paymentMethods?: boolean;
    deliverySettings?: boolean;
    financialSettings?: boolean;
  } | null;

  contact?: {
    phone?: string | null;
  } | null;

  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;

  paymentMethods?: {
    venmoHandle?: string | null;
    cashAppTag?: string | null;
    zellePhoneOrEmail?: string | null;
    paypalEmail?: string | null;
    defaultPaymentMethod?: string | null;
  } | null;

  delivery?: {
    method?: "zip" | "distance" | null;
    zipZones?: Array<{
      name?: string | null;
      zip?: string | null;
      fee?: number | null;
    }>;
    distanceZones?: Array<{
      min?: number | null;
      max?: number | null;
      fee?: number | null;
    }>;
    fallbackFee?: number | null;
    maxRadius?: number | null;
  } | null;

  financials?: {
    taxPercentage?: number | null;
    deliveryTaxed?: boolean;
    feeTaxed?: boolean;
    feeType?: "%" | "flat" | null;
    feeValue?: number | null;
  } | null;
};

export type ShopReadiness = {
  requirements: {
    accountCreated: boolean;
    emailVerified: boolean;
    businessInfoComplete: boolean;
    paymentConfigured: boolean;
    deliveryConfigured: boolean;
    financialsConfigured: boolean;
  };

  capabilities: {
    canAccessDashboard: boolean;
    canAppearInSearch: boolean;
    canSendOrders: boolean;
    canReceiveOrders: boolean;
    canAcceptOrders: boolean;
  };

  incompleteRequirements: Array<
    | "emailVerification"
    | "businessInformation"
    | "paymentMethods"
    | "deliverySettings"
    | "financialSettings"
  >;

  completedCount: number;
  totalCount: number;
  completionPercentage: number;
};

function hasText(value?: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasConfiguredPaymentMethod(
  paymentMethods?: ShopReadinessInput["paymentMethods"],
): boolean {
  if (!paymentMethods) return false;

  return [
    paymentMethods.venmoHandle,
    paymentMethods.cashAppTag,
    paymentMethods.zellePhoneOrEmail,
    paymentMethods.paypalEmail,
  ].some(hasText);
}

function hasConfiguredDelivery(
  delivery?: ShopReadinessInput["delivery"],
): boolean {
  if (!delivery) return false;

  if (delivery.method === "zip") {
    return (
      Array.isArray(delivery.zipZones) &&
      delivery.zipZones.some((zone) => hasText(zone.zip))
    );
  }

  if (delivery.method === "distance") {
    const hasDistanceZone =
      Array.isArray(delivery.distanceZones) &&
      delivery.distanceZones.some(
        (zone) =>
          typeof zone.max === "number" &&
          Number.isFinite(zone.max) &&
          zone.max > 0,
      );

    const hasMaximumRadius =
      typeof delivery.maxRadius === "number" &&
      Number.isFinite(delivery.maxRadius) &&
      delivery.maxRadius > 0;

    return hasDistanceZone || hasMaximumRadius;
  }

  return false;
}

export function getShopReadiness(shop: ShopReadinessInput): ShopReadiness {
  const accountCreated = hasText(shop.businessName) && hasText(shop.email);

  const emailVerified = shop.verification?.emailVerified === true;

  const businessInfoComplete =
    hasText(shop.contact?.phone) &&
    hasText(shop.address?.street) &&
    hasText(shop.address?.city) &&
    hasText(shop.address?.state) &&
    hasText(shop.address?.zip);

  /*
   * We check both the saved setup flag and the actual payment data.
   *
   * Existing shops may already contain valid payment information even if an
   * older workflow failed to save the setup flag correctly.
   */
  const paymentConfigured = hasConfiguredPaymentMethod(shop.paymentMethods);

  /*
   * Delivery readiness must be based on real delivery coverage.
   *
   * Merely opening and saving the delivery form should not make a shop
   * searchable if it still has no ZIP zones, distance zones, or radius.
   */
  const deliveryConfigured = hasConfiguredDelivery(shop.delivery);

  /*
   * Financial settings need an explicit setup flag because a 0% tax rate and
   * a $0 fee are both valid configurations and are also the schema defaults.
   */
  const financialsConfigured = shop.setupProgress?.financialSettings === true;

  const accountIsActive = shop.isSuspended !== true;

  const canAccessDashboard = accountCreated && accountIsActive;

  const canAppearInSearch =
    accountIsActive &&
    emailVerified &&
    businessInfoComplete &&
    deliveryConfigured &&
    shop.isPublic === true;

  const canSendOrders =
    accountIsActive &&
    emailVerified &&
    businessInfoComplete &&
    financialsConfigured;

  const canReceiveOrders =
    accountIsActive &&
    emailVerified &&
    businessInfoComplete &&
    deliveryConfigured &&
    paymentConfigured &&
    shop.isPublic === true;

  const canAcceptOrders = accountIsActive && emailVerified && paymentConfigured;

  const incompleteRequirements: ShopReadiness["incompleteRequirements"] = [];

  if (!emailVerified) {
    incompleteRequirements.push("emailVerification");
  }

  if (!businessInfoComplete) {
    incompleteRequirements.push("businessInformation");
  }

  if (!paymentConfigured) {
    incompleteRequirements.push("paymentMethods");
  }

  if (!deliveryConfigured) {
    incompleteRequirements.push("deliverySettings");
  }

  if (!financialsConfigured) {
    incompleteRequirements.push("financialSettings");
  }

  const requirementValues = [
    accountCreated,
    emailVerified,
    businessInfoComplete,
    paymentConfigured,
    deliveryConfigured,
    financialsConfigured,
  ];

  const completedCount = requirementValues.filter(Boolean).length;
  const totalCount = requirementValues.length;

  return {
    requirements: {
      accountCreated,
      emailVerified,
      businessInfoComplete,
      paymentConfigured,
      deliveryConfigured,
      financialsConfigured,
    },

    capabilities: {
      canAccessDashboard,
      canAppearInSearch,
      canSendOrders,
      canReceiveOrders,
      canAcceptOrders,
    },

    incompleteRequirements,

    completedCount,
    totalCount,

    completionPercentage: Math.round((completedCount / totalCount) * 100),
  };
}
