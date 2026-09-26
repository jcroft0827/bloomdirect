// src/lib/bloom-websites/validateBloomWebsiteCheckoutPreflight.ts

import {
  BloomWebsiteCartValidationError,
  type BloomWebsiteCartValidationItemInput,
  validateBloomWebsiteCart,
} from "@/lib/bloom-websites/validateBloomWebsiteCart";
import { calculateDistanceMiles } from "@/lib/delivery/calculateDistanceMiles";
import { evaluateShopDelivery } from "@/lib/delivery/evaluateShopDelivery";
import { geocodeAddress } from "@/lib/geocoding/geocodeAddress";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

export type BloomWebsiteCheckoutPreflightInput = {
  previewSlug: string;
  items: BloomWebsiteCartValidationItemInput[];
  fulfillmentType: "delivery" | "pickup";
  requestedDate: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  recipient: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryAddress?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
  deliveryInstructions?: string;
  cardMessage?: string;
  cardSignature?: string;
};

type LeanWebsite = {
  _id: unknown;
  shop: unknown;
  previewSlug?: string;
  siteName?: string;
  status?: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;
  taxSettings?: {
    enabled?: boolean;
    defaultRatePercent?: number;
    deliveryTaxable?: boolean;
    deliveryRatePercent?: number | null;
    tipsEnabled?: boolean;
    suggestedTipPercentages?: number[];
    tipsTaxable?: boolean;
    tipRatePercent?: number | null;
    taxExemptCustomersEnabled?: boolean;
  };
  orderPolicy?: {
    allowsSameDay?: boolean;
    sameDayCutoff?: string;
    minProductTotal?: number;
    noMoreOrdersTodayUntil?: Date | string | null;
    noMoreOrdersForDate?: Date | string | null;
  };
  pickupPolicy?: {
    enabled?: boolean;
    allowsSameDay?: boolean;
    sameDayCutoff?: string;
    preparationMinutes?: number;
    instructions?: string;
    noMorePickupTodayUntil?: Date | string | null;
  };
};

type LeanShop = {
  _id: unknown;
  businessName?: string;
  isSuspended?: boolean;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    timezone?: string;
    geoLocation?: {
      type?: string;
      coordinates?: number[];
    };
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
    fallbackFee?: number;
    maxRadius?: number;
    blackoutDates?: Array<Date | string>;
  };
};

export class BloomWebsiteCheckoutPreflightError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    status = 400,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "BloomWebsiteCheckoutPreflightError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function dollarsToCents(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function getSafeTimezone(value: unknown) {
  const timezone = cleanString(value) || "America/New_York";

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format(new Date());
    return timezone;
  } catch {
    return "America/New_York";
  }
}

function normalizeCutoff(value: unknown, fallback: string) {
  const cutoff = cleanString(value);
  const match = /^(\d{1,2}):(\d{2})$/.exec(cutoff);

  if (!match) {
    return fallback;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00Z`);

  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function getLocalParts(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value || "";

  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    hour: Number(part("hour")),
    minute: Number(part("minute")),
  };
}

function normalizeDateOnly(value: Date | string, timezone: string) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return "";
    }

    return getLocalParts(value, timezone).date;
  }

  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const parsed = new Date(trimmed);

  return Number.isNaN(parsed.getTime())
    ? ""
    : getLocalParts(parsed, timezone).date;
}

function cutoffPassed(cutoff: string, now: Date, timezone: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(cutoff);

  if (!match) {
    return true;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const local = getLocalParts(now, timezone);

  return local.hour * 60 + local.minute >= hour * 60 + minute;
}

function getShopCoordinates(shop: LeanShop) {
  const coordinates = shop.address?.geoLocation?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (lat === 0 && lng === 0)
  ) {
    return null;
  }

  return { lat, lng };
}

function cartErrorStatus(error: BloomWebsiteCartValidationError) {
  if (
    error.code === "WEBSITE_NOT_FOUND"
  ) {
    return 404;
  }

  if (
    error.code === "EMPTY_CART" ||
    error.code === "INVALID_CART_ITEM"
  ) {
    return 400;
  }

  return 409;
}

function validateContactFields(input: BloomWebsiteCheckoutPreflightInput) {
  const customer = input.customer;
  const recipient = input.recipient;

  if (
    !cleanString(customer.firstName) ||
    !cleanString(customer.lastName) ||
    !cleanString(customer.email)
  ) {
    throw new BloomWebsiteCheckoutPreflightError(
      "CUSTOMER_INCOMPLETE",
      "Please complete your name and email address.",
      400,
    );
  }

  if (
    cleanString(customer.firstName).length > 120 ||
    cleanString(customer.lastName).length > 120 ||
    cleanString(customer.email).length > 320 ||
    cleanString(customer.phone).length > 50
  ) {
    throw new BloomWebsiteCheckoutPreflightError(
      "CUSTOMER_INVALID",
      "Your contact information contains a value that is too long.",
      400,
    );
  }

  const email = cleanString(customer.email);

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new BloomWebsiteCheckoutPreflightError(
      "CUSTOMER_EMAIL_INVALID",
      "Please enter a valid email address.",
      400,
    );
  }

  if (input.fulfillmentType === "delivery") {
    if (
      !cleanString(recipient.firstName) ||
      !cleanString(recipient.lastName)
    ) {
      throw new BloomWebsiteCheckoutPreflightError(
        "RECIPIENT_INCOMPLETE",
        "Please enter the delivery recipient's first and last name.",
        400,
      );
    }

    if (!cleanString(recipient.phone)) {
      throw new BloomWebsiteCheckoutPreflightError(
        "RECIPIENT_PHONE_REQUIRED",
        "Please enter a phone number for the delivery recipient.",
        400,
      );
    }
  }

  if (
    cleanString(recipient.firstName).length > 120 ||
    cleanString(recipient.lastName).length > 120 ||
    cleanString(recipient.phone).length > 50
  ) {
    throw new BloomWebsiteCheckoutPreflightError(
      "RECIPIENT_INVALID",
      "The recipient information contains a value that is too long.",
      400,
    );
  }

  if (cleanString(input.cardMessage).length > 300) {
    throw new BloomWebsiteCheckoutPreflightError(
      "CARD_MESSAGE_TOO_LONG",
      "Card messages cannot exceed 300 characters.",
      400,
    );
  }

  if (cleanString(input.cardSignature).length > 80) {
    throw new BloomWebsiteCheckoutPreflightError(
      "CARD_SIGNATURE_TOO_LONG",
      "Card signatures cannot exceed 80 characters.",
      400,
    );
  }

  if (cleanString(input.deliveryInstructions).length > 1000) {
    throw new BloomWebsiteCheckoutPreflightError(
      "DELIVERY_INSTRUCTIONS_TOO_LONG",
      "Delivery instructions cannot exceed 1,000 characters.",
      400,
    );
  }
}

export async function validateBloomWebsiteCheckoutPreflight(
  input: BloomWebsiteCheckoutPreflightInput,
) {
  const previewSlug = cleanString(input.previewSlug).toLowerCase();

  if (!previewSlug) {
    throw new BloomWebsiteCheckoutPreflightError(
      "STOREFRONT_NOT_FOUND",
      "Storefront could not be found.",
      404,
    );
  }

  if (!isValidDateOnly(input.requestedDate)) {
    throw new BloomWebsiteCheckoutPreflightError(
      "INVALID_DATE",
      "Please choose a valid fulfillment date.",
      400,
    );
  }

  validateContactFields(input);

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    previewSlug,
  })
    .select(
      [
        "_id",
        "shop",
        "previewSlug",
        "siteName",
        "status",
        "customDomain",
        "domainVerified",
        "taxSettings",
        "orderPolicy",
        "pickupPolicy",
      ].join(" "),
    )
    .lean()) as unknown as LeanWebsite | null;

  if (!website) {
    throw new BloomWebsiteCheckoutPreflightError(
      "STOREFRONT_NOT_FOUND",
      "Storefront could not be found.",
      404,
    );
  }

  const shop = (await Shop.findById(website.shop)
    .select(
      [
        "_id",
        "businessName",
        "isSuspended",
        "address.street",
        "address.city",
        "address.state",
        "address.zip",
        "address.country",
        "address.timezone",
        "address.geoLocation",
        "delivery.method",
        "delivery.zipZones",
        "delivery.distanceZones",
        "delivery.fallbackFee",
        "delivery.maxRadius",
        "delivery.blackoutDates",
      ].join(" "),
    )
    .lean()) as unknown as LeanShop | null;

  if (!shop) {
    throw new BloomWebsiteCheckoutPreflightError(
      "SHOP_NOT_FOUND",
      "The florist for this storefront could not be found.",
      404,
    );
  }

  if (shop.isSuspended) {
    throw new BloomWebsiteCheckoutPreflightError(
      "SHOP_UNAVAILABLE",
      "This storefront is not currently accepting orders.",
      403,
    );
  }

  const cart = await validateBloomWebsiteCart({
    previewSlug,
    items: input.items,
    requestedDate: input.requestedDate,
  }).catch((error) => {
    if (error instanceof BloomWebsiteCartValidationError) {
      throw new BloomWebsiteCheckoutPreflightError(
        error.code,
        error.message,
        cartErrorStatus(error),
        {
          productId: error.productId,
          addonId: error.addonId,
        },
      );
    }

    throw error;
  });

  const minimumProductTotalCents = dollarsToCents(
    website.orderPolicy?.minProductTotal ?? 0,
  );

  if (cart.subtotalCents < minimumProductTotalCents) {
    throw new BloomWebsiteCheckoutPreflightError(
      "MINIMUM_ORDER_NOT_MET",
      "Your order needs a little more before checkout can continue.",
      409,
      {
        minimumProductTotalCents,
        currentSubtotalCents: cart.subtotalCents,
        remainingCents: minimumProductTotalCents - cart.subtotalCents,
      },
    );
  }

  const timezone = getSafeTimezone(shop.address?.timezone);
  const now = new Date();
  const today = getLocalParts(now, timezone).date;

  if (input.requestedDate < today) {
    throw new BloomWebsiteCheckoutPreflightError(
      "DATE_IN_PAST",
      "Please choose today or a future fulfillment date.",
      409,
    );
  }

  if (input.fulfillmentType === "pickup") {
    if (website.pickupPolicy?.enabled !== true) {
      throw new BloomWebsiteCheckoutPreflightError(
        "PICKUP_DISABLED",
        "Pickup is not currently available.",
        409,
      );
    }

    const blackout = (shop.delivery?.blackoutDates || []).some(
      (date) => normalizeDateOnly(date, timezone) === input.requestedDate,
    );

    if (blackout) {
      throw new BloomWebsiteCheckoutPreflightError(
        "DATE_BLACKED_OUT",
        "The florist is unavailable on that date.",
        409,
      );
    }

    const sameDay = input.requestedDate === today;

    if (sameDay && website.pickupPolicy?.allowsSameDay === false) {
      throw new BloomWebsiteCheckoutPreflightError(
        "SAME_DAY_NOT_ALLOWED",
        "Same-day pickup is not available.",
        409,
      );
    }

    const cutoff = normalizeCutoff(
      website.pickupPolicy?.sameDayCutoff,
      "16:00",
    );

    if (sameDay && cutoffPassed(cutoff, now, timezone)) {
      throw new BloomWebsiteCheckoutPreflightError(
        "SAME_DAY_CUTOFF_PASSED",
        "Today's pickup cutoff has passed.",
        409,
      );
    }

    const pausedUntil = website.pickupPolicy?.noMorePickupTodayUntil
      ? new Date(website.pickupPolicy.noMorePickupTodayUntil)
      : null;

    if (
      sameDay &&
      pausedUntil &&
      !Number.isNaN(pausedUntil.getTime()) &&
      pausedUntil.getTime() > now.getTime()
    ) {
      throw new BloomWebsiteCheckoutPreflightError(
        "SAME_DAY_TEMPORARILY_CLOSED",
        "Pickup orders are closed for today.",
        409,
      );
    }

    const pickupAddress = {
      address1: cleanString(shop.address?.street),
      address2: "",
      city: cleanString(shop.address?.city),
      state: cleanString(shop.address?.state),
      postalCode: cleanString(shop.address?.zip),
      country: cleanString(shop.address?.country) || "US",
      formattedAddress: [
        cleanString(shop.address?.street),
        [cleanString(shop.address?.city), cleanString(shop.address?.state)]
          .filter(Boolean)
          .join(", "),
        cleanString(shop.address?.zip),
      ]
        .filter(Boolean)
        .join(" "),
    };

    if (
      !pickupAddress.address1 ||
      !pickupAddress.city ||
      !pickupAddress.state ||
      !pickupAddress.postalCode
    ) {
      throw new BloomWebsiteCheckoutPreflightError(
        "PICKUP_LOCATION_UNAVAILABLE",
        "Pickup is temporarily unavailable because the florist's pickup location is incomplete.",
        409,
      );
    }

    return {
      website,
      shop,
      cart,
      timezone,
      fulfillment: {
        type: "pickup" as const,
        requestedDate: input.requestedDate,
        sameDay,
        feeCents: 0,
        pickupLocation: {
          businessName:
            cleanString(shop.businessName) ||
            cleanString(website.siteName),
          address: pickupAddress,
          instructions: cleanString(website.pickupPolicy?.instructions),
          preparationMinutes: Math.max(
            0,
            Math.min(
              1440,
              Math.round(
                Number(website.pickupPolicy?.preparationMinutes) || 60,
              ),
            ),
          ),
        },
      },
      totals: {
        productSubtotalCents: cart.productSubtotalCents,
        addonSubtotalCents: cart.addonSubtotalCents,
        subtotalCents: cart.subtotalCents,
        fulfillmentFeeCents: 0,
        taxableProductAndAddonSubtotalCents: cart.taxableSubtotalCents,
        totalBeforeTaxCents: cart.subtotalCents,
      },
    };
  }

  if (input.fulfillmentType !== "delivery") {
    throw new BloomWebsiteCheckoutPreflightError(
      "INVALID_FULFILLMENT_TYPE",
      "Please choose delivery or pickup.",
      400,
    );
  }

  const address1 = cleanString(input.deliveryAddress?.address1);
  const address2 = cleanString(input.deliveryAddress?.address2);
  const city = cleanString(input.deliveryAddress?.city);
  const state = cleanString(input.deliveryAddress?.state);
  const zip = cleanString(input.deliveryAddress?.zip);

  if (!address1 || !city || !state || !zip) {
    throw new BloomWebsiteCheckoutPreflightError(
      "DELIVERY_ADDRESS_INCOMPLETE",
      "Please enter the complete delivery address.",
      400,
    );
  }

  const geocodedAddress = await geocodeAddress({
    address1,
    address2,
    city,
    state,
    zip,
  });

  if (geocodedAddress.country && geocodedAddress.country !== "US") {
    throw new BloomWebsiteCheckoutPreflightError(
      "OUTSIDE_SUPPORTED_COUNTRY",
      "Sorry, this florist only delivers within the United States.",
      409,
    );
  }

  let distanceMiles: number | undefined;

  if (shop.delivery?.method === "distance") {
    const shopCoordinates = getShopCoordinates(shop);

    if (!shopCoordinates) {
      throw new BloomWebsiteCheckoutPreflightError(
        "DELIVERY_CONFIGURATION_INVALID",
        "This florist's delivery area isn't configured correctly yet.",
        409,
      );
    }

    distanceMiles = calculateDistanceMiles(shopCoordinates, {
      lat: geocodedAddress.lat,
      lng: geocodedAddress.lng,
    });
  }

  const deliveryEvaluation = evaluateShopDelivery({
    delivery: {
      method: shop.delivery?.method ?? "zip",
      zipZones: shop.delivery?.zipZones ?? [],
      distanceZones: shop.delivery?.distanceZones ?? [],
      fallbackFee: shop.delivery?.fallbackFee ?? 0,
      maxRadius: shop.delivery?.maxRadius,
      blackoutDates: shop.delivery?.blackoutDates ?? [],
    },
    policy: {
      allowsSameDay: website.orderPolicy?.allowsSameDay ?? true,
      sameDayCutoff: normalizeCutoff(
        website.orderPolicy?.sameDayCutoff,
        "14:00",
      ),
      noMoreOrdersTodayUntil:
        website.orderPolicy?.noMoreOrdersTodayUntil ?? null,
      noMoreOrdersForDate:
        website.orderPolicy?.noMoreOrdersForDate ?? null,
    },
    destinationZip: geocodedAddress.zip || zip,
    distanceMiles,
    requestedDate: input.requestedDate,
    timezone,
  });

  if (!deliveryEvaluation.eligible) {
    throw new BloomWebsiteCheckoutPreflightError(
      deliveryEvaluation.reason || "DELIVERY_NOT_AVAILABLE",
      deliveryEvaluation.message || "Delivery is not available for this order.",
      409,
      {
        requestedDate: deliveryEvaluation.requestedDate,
        sameDay: deliveryEvaluation.sameDay,
      },
    );
  }

  const feeCents = dollarsToCents(deliveryEvaluation.deliveryFee);

  return {
    website,
    shop,
    cart,
    timezone,
    fulfillment: {
      type: "delivery" as const,
      requestedDate: input.requestedDate,
      sameDay: deliveryEvaluation.sameDay,
      distanceMiles: deliveryEvaluation.distanceMiles,
      feeCents,
      deliveryAddress: {
        address1: geocodedAddress.address1,
        address2: geocodedAddress.address2,
        city: geocodedAddress.city,
        state: geocodedAddress.state,
        postalCode: geocodedAddress.zip,
        country: geocodedAddress.country || "US",
        formattedAddress: geocodedAddress.formattedAddress,
        placeId: geocodedAddress.placeId,
        lat: geocodedAddress.lat,
        lng: geocodedAddress.lng,
      },
    },
    totals: {
      productSubtotalCents: cart.productSubtotalCents,
      addonSubtotalCents: cart.addonSubtotalCents,
      subtotalCents: cart.subtotalCents,
      fulfillmentFeeCents: feeCents,
      taxableProductAndAddonSubtotalCents: cart.taxableSubtotalCents,
      totalBeforeTaxCents: cart.subtotalCents + feeCents,
    },
  };
}
