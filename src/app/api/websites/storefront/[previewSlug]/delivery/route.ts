// src/app/api/websites/storefront/[previewSlug]/delivery/route.ts

import { NextResponse } from "next/server";

import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";

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

type RouteContext = {
  params: Promise<{
    previewSlug: string;
  }>;
};

type DeliveryAddressInput = {
  address1?: unknown;
  address2?: unknown;
  city?: unknown;
  state?: unknown;
  zip?: unknown;
};

type DeliveryValidationBody = {
  items?: unknown;
  address?: DeliveryAddressInput;
  requestedDate?: unknown;
};

type LeanWebsite = {
  _id: unknown;
  shop: unknown;

  previewSlug?: string;
  status?: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;

  orderPolicy?: {
    allowsSameDay?: boolean;
    sameDayCutoff?: string;
    minProductTotal?: number;

    noMoreOrdersTodayUntil?: Date | string | null;
    noMoreOrdersForDate?: Date | string | null;
  };
};

type LeanShop = {
  _id: unknown;

  isSuspended?: boolean;

  address?: {
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

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
  const match = /^(\d{2}):(\d{2})$/.exec(cutoff);

  if (!match) {
    return fallback;
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return fallback;
  }

  return cutoff;
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T12:00:00Z`);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.toISOString().slice(0, 10) === value;
}

function parseCartItems(
  value: unknown,
): BloomWebsiteCartValidationItemInput[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items: BloomWebsiteCartValidationItemInput[] = [];

  for (const rawItem of value) {
    if (typeof rawItem !== "object" || rawItem === null) {
      return null;
    }

    const item = rawItem as Record<string, unknown>;

    const productId = cleanString(item.productId);

    const tier = cleanString(item.tier);

    const quantity = Number(item.quantity);

    const addonIds = Array.isArray(item.addonIds)
      ? item.addonIds
          .filter((addonId): addonId is string => typeof addonId === "string")
          .map((addonId) => addonId.trim())
          .filter(Boolean)
      : [];

    if (tier !== "standard" && tier !== "deluxe" && tier !== "premium") {
      return null;
    }

    items.push({
      productId,

      tier,

      addonIds,

      quantity,
    });
  }

  return items;
}

function dollarsToCents(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return 0;
  }

  return Math.round(amount * 100);
}

function getShopCoordinates(shop: LeanShop) {
  const coordinates = shop.address?.geoLocation?.coordinates;

  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    return null;
  }

  const lng = Number(coordinates[0]);

  const lat = Number(coordinates[1]);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  /*
   * [0, 0] is the Shop model's default and does not
   * represent a usable florist location.
   */
  if (lat === 0 && lng === 0) {
    return null;
  }

  return {
    lat,
    lng,
  };
}

function getCartValidationStatus(error: BloomWebsiteCartValidationError) {
  switch (error.code) {
    case "WEBSITE_NOT_FOUND":
      return 404;

    case "EMPTY_CART":
    case "INVALID_CART_ITEM":
      return 400;

    case "PRODUCT_NOT_FOUND":
    case "PRODUCT_INACTIVE":
    case "PRODUCT_SOLD_OUT":
    case "PRODUCT_UNAVAILABLE":
    case "PRODUCT_INVENTORY_EXCEEDED":
    case "TIER_UNAVAILABLE":
    case "ADDON_NOT_FOUND":
    case "ADDON_NOT_ALLOWED":
    case "ADDON_INACTIVE":
    case "ADDON_SOLD_OUT":
    case "ADDON_UNAVAILABLE":
    case "ADDON_INVENTORY_EXCEEDED":
    case "ADDON_QUANTITY_EXCEEDED":
      return 409;

    default:
      return 400;
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { previewSlug } = await params;

    const normalizedPreviewSlug = previewSlug?.trim().toLowerCase();

    if (!normalizedPreviewSlug) {
      return NextResponse.json(
        {
          error: "Storefront could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    // ===============================
    // REQUEST BODY
    // ===============================

    const body = (await request.json()) as DeliveryValidationBody;

    const items = parseCartItems(body.items);

    if (!items) {
      return NextResponse.json(
        {
          error: "The cart could not be validated.",
        },
        {
          status: 400,
        },
      );
    }

    const requestedDate = cleanString(body.requestedDate);

    if (!requestedDate || !isValidDateOnly(requestedDate)) {
      return NextResponse.json(
        {
          error: "Please choose a valid delivery date.",
        },
        {
          status: 400,
        },
      );
    }

    const address1 = cleanString(body.address?.address1);

    const address2 = cleanString(body.address?.address2);

    const city = cleanString(body.address?.city);

    const state = cleanString(body.address?.state);

    const zip = cleanString(body.address?.zip);

    if (!address1 || !city || !state || !zip) {
      return NextResponse.json(
        {
          error: "Please enter the complete delivery address.",
        },
        {
          status: 400,
        },
      );
    }

    // ===============================
    // WEBSITE OWNERSHIP
    // ===============================

    await connectToDB();

    const rateLimit = await checkBloomWebsiteRateLimit({
      request,
      scope: "storefront-delivery",
      subject: normalizedPreviewSlug,
      limit: 30,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many delivery checks. Please wait a moment and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      );
    }

    const website = (await BloomWebsite.findOne({
      previewSlug: normalizedPreviewSlug,
    })
      .select(
        [
          "_id",
          "shop",
          "previewSlug",
          "status",
          "customDomain",
          "domainVerified",

          "orderPolicy.allowsSameDay",
          "orderPolicy.sameDayCutoff",
          "orderPolicy.minProductTotal",
          "orderPolicy.noMoreOrdersTodayUntil",
          "orderPolicy.noMoreOrdersForDate",
        ].join(" "),
      )
      .lean()) as unknown as LeanWebsite | null;

    if (!website) {
      return NextResponse.json(
        {
          error: "Storefront could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    const access = await authorizeBloomWebsiteStorefrontAccess(
      request,
      website,
    );

    if (!access.allowed) {
      return access.response;
    }

    // ===============================
    // SHOP DELIVERY CAPABILITY
    // ===============================

    const shop = (await Shop.findById(website.shop)
      .select(
        [
          "_id",
          "isSuspended",

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
      return NextResponse.json(
        {
          error: "The florist for this storefront could not be found.",
        },
        {
          status: 404,
        },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "This storefront is not currently accepting orders.",
        },
        {
          status: 403,
        },
      );
    }

    // ===============================
    // AUTHORITATIVE CART
    // ===============================

    /*
     * This is deliberately performed before delivery
     * calculations.
     *
     * Client prices, inventory and add-on eligibility
     * are not trusted.
     */
    const cart = await validateBloomWebsiteCart({
      previewSlug: normalizedPreviewSlug,

      items,

      requestedDate,
    });

    // ===============================
    // BLOOMWEBSITES MINIMUM
    // ===============================

    const minimumProductTotalCents = dollarsToCents(
      website.orderPolicy?.minProductTotal ?? 0,
    );

    /*
     * minProductTotal is a BloomWebsites channel policy.
     *
     * It is evaluated against the authoritative product
     * + add-on subtotal before delivery and tax.
     */
    if (cart.subtotalCents < minimumProductTotalCents) {
      const remainingCents = minimumProductTotalCents - cart.subtotalCents;

      return NextResponse.json(
        {
          eligible: false,

          reason: "MINIMUM_ORDER_NOT_MET",

          message:
            "Your order needs a little more before delivery can be selected.",

          minimumProductTotalCents,

          currentSubtotalCents: cart.subtotalCents,

          remainingCents,
        },
        {
          status: 409,
        },
      );
    }

    // ===============================
    // ADDRESS GEOCODING
    // ===============================

    const geocodedAddress = await geocodeAddress({
      address1,
      address2,
      city,
      state,
      zip,
    });

    if (geocodedAddress.country && geocodedAddress.country !== "US") {
      return NextResponse.json(
        {
          eligible: false,

          reason: "OUTSIDE_SUPPORTED_COUNTRY",

          message:
            "Sorry, this florist only delivers within the United States.",
        },
        {
          status: 409,
        },
      );
    }

    // ===============================
    // DISTANCE
    // ===============================

    let distanceMiles: number | undefined;

    if (shop.delivery?.method === "distance") {
      const shopCoordinates = getShopCoordinates(shop);

      if (!shopCoordinates) {
        console.error(
          "BloomWebsite delivery validation: florist is missing valid coordinates.",
          {
            websiteId: String(website._id),

            shopId: String(shop._id),
          },
        );

        return NextResponse.json(
          {
            error:
              "This florist's delivery area isn't configured correctly yet.",
          },
          {
            status: 409,
          },
        );
      }

      distanceMiles = calculateDistanceMiles(shopCoordinates, {
        lat: geocodedAddress.lat,

        lng: geocodedAddress.lng,
      });
    }

    // ===============================
    // DELIVERY EVALUATION
    // ===============================

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
        /*
         * These values come from BloomWebsite,
         * NOT Shop.delivery.
         */
        allowsSameDay: website.orderPolicy?.allowsSameDay ?? true,

        sameDayCutoff: normalizeCutoff(
          website.orderPolicy?.sameDayCutoff,
          "14:00",
        ),

        noMoreOrdersTodayUntil:
          website.orderPolicy?.noMoreOrdersTodayUntil ?? null,

        noMoreOrdersForDate: website.orderPolicy?.noMoreOrdersForDate ?? null,
      },

      destinationZip: geocodedAddress.zip || zip,

      distanceMiles,

      requestedDate,

      timezone: getSafeTimezone(shop.address?.timezone),
    });

    if (!deliveryEvaluation.eligible) {
      return NextResponse.json(
        {
          eligible: false,

          reason: deliveryEvaluation.reason,

          message: deliveryEvaluation.message,

          requestedDate: deliveryEvaluation.requestedDate,

          sameDay: deliveryEvaluation.sameDay,
        },
        {
          status: 409,
        },
      );
    }

    // ===============================
    // AUTHORITATIVE TOTALS
    // ===============================

    const deliveryFeeCents = dollarsToCents(deliveryEvaluation.deliveryFee);

    const totalBeforeTaxCents = cart.subtotalCents + deliveryFeeCents;

    // ===============================
    // SUCCESS
    // ===============================

    return NextResponse.json({
      eligible: true,

      address: {
        formattedAddress: geocodedAddress.formattedAddress,

        address1: geocodedAddress.address1,

        address2: geocodedAddress.address2,

        city: geocodedAddress.city,

        state: geocodedAddress.state,

        zip: geocodedAddress.zip,

        country: geocodedAddress.country,

        lat: geocodedAddress.lat,

        lng: geocodedAddress.lng,

        placeId: geocodedAddress.placeId,
      },

      delivery: {
        requestedDate,

        sameDay: deliveryEvaluation.sameDay,

        distanceMiles: deliveryEvaluation.distanceMiles,

        feeCents: deliveryFeeCents,
      },

      cart: {
        itemCount: cart.itemCount,

        productSubtotalCents: cart.productSubtotalCents,

        addonSubtotalCents: cart.addonSubtotalCents,

        subtotalCents: cart.subtotalCents,

        taxableSubtotalCents: cart.taxableSubtotalCents,

        containsLocalOnlyProducts: cart.containsLocalOnlyProducts,
      },

      policy: {
        minimumProductTotalCents,
      },

      totals: {
        subtotalCents: cart.subtotalCents,

        deliveryFeeCents,

        /*
         * Taxes intentionally come later.
         *
         * We are not presenting this value as the final
         * order total.
         */
        totalBeforeTaxCents,
      },
    });
  } catch (error) {
    if (error instanceof BloomWebsiteCartValidationError) {
      return NextResponse.json(
        {
          eligible: false,

          reason: error.code,

          message: error.message,

          productId: error.productId,

          addonId: error.addonId,
        },
        {
          status: getCartValidationStatus(error),
        },
      );
    }

    if (error instanceof Error) {
      /*
       * geocodeAddress intentionally produces
       * customer-safe messages for address failures.
       */
      if (
        error.message.includes("delivery address") ||
        error.message.includes("verify that delivery address")
      ) {
        return NextResponse.json(
          {
            eligible: false,

            reason: "ADDRESS_NOT_VERIFIED",

            message: error.message,
          },
          {
            status: 400,
          },
        );
      }
    }

    console.error("BloomWebsite delivery validation error:", error);

    return NextResponse.json(
      {
        error: "We couldn't check delivery right now. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}
