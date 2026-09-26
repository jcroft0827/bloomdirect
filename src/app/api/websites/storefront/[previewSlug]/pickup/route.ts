import { NextResponse } from "next/server";

import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import {
  BloomWebsiteCartValidationError,
  type BloomWebsiteCartValidationItemInput,
  validateBloomWebsiteCart,
} from "@/lib/bloom-websites/validateBloomWebsiteCart";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

type RouteContext = { params: Promise<{ previewSlug: string }> };

type LeanWebsite = {
  _id: unknown;
  shop: unknown;
  previewSlug?: string;
  status?: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;
  orderPolicy?: { minProductTotal?: number };
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
  };
  delivery?: { blackoutDates?: Array<Date | string> };
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
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return cutoff;
}

function normalizePreparationMinutes(value: unknown) {
  const minutes = Number(value);
  if (!Number.isFinite(minutes)) return 60;
  return Math.min(1440, Math.max(0, Math.round(minutes)));
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
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
    if (Number.isNaN(value.getTime())) return "";
    return getLocalParts(value, timezone).date;
  }
  const trimmed = value.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : getLocalParts(parsed, timezone).date;
}

function cutoffPassed(cutoff: string | undefined, now: Date, timezone: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec((cutoff || "").trim());
  if (!match) return false;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return false;
  const local = getLocalParts(now, timezone);
  return local.hour * 60 + local.minute >= hour * 60 + minute;
}

function parseCartItems(value: unknown): BloomWebsiteCartValidationItemInput[] | null {
  if (!Array.isArray(value)) return null;
  const items: BloomWebsiteCartValidationItemInput[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) return null;
    const item = raw as Record<string, unknown>;
    const tier = cleanString(item.tier);
    if (tier !== "standard" && tier !== "deluxe" && tier !== "premium") return null;
    items.push({
      productId: cleanString(item.productId),
      tier,
      quantity: Number(item.quantity),
      addonIds: Array.isArray(item.addonIds)
        ? item.addonIds.filter((id): id is string => typeof id === "string").map((id) => id.trim()).filter(Boolean)
        : [],
    });
  }
  return items;
}

function cartErrorStatus(error: BloomWebsiteCartValidationError) {
  if (error.code === "WEBSITE_NOT_FOUND") return 404;
  if (error.code === "EMPTY_CART" || error.code === "INVALID_CART_ITEM") return 400;
  return 409;
}

async function loadContext(request: Request, previewSlug: string) {
  await connectToDB();
  const rateLimit = await checkBloomWebsiteRateLimit({
    request,
    scope: "storefront-pickup",
    subject: previewSlug,
    limit: 60,
  });

  if (!rateLimit.allowed) {
    return {
      error: NextResponse.json(
        { error: "Too many pickup checks. Please wait a moment and try again." },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      ),
    };
  }

  const website = (await BloomWebsite.findOne({ previewSlug })
    .select("_id shop previewSlug status customDomain domainVerified orderPolicy.minProductTotal pickupPolicy")
    .lean()) as LeanWebsite | null;
  if (!website) return { error: NextResponse.json({ error: "Storefront could not be found." }, { status: 404 }) };
  const access = await authorizeBloomWebsiteStorefrontAccess(request, website);
  if (!access.allowed) return { error: access.response };
  const shop = (await Shop.findById(website.shop)
    .select("_id businessName isSuspended address.street address.city address.state address.zip address.country address.timezone delivery.blackoutDates")
    .lean()) as LeanShop | null;
  if (!shop) return { error: NextResponse.json({ error: "Shop could not be found." }, { status: 404 }) };
  if (shop.isSuspended) return { error: NextResponse.json({ error: "This shop is not currently accepting website orders." }, { status: 403 }) };
  return { website, shop };
}

function pickupLocation(shop: LeanShop) {
  const address1 = cleanString(shop.address?.street);
  const city = cleanString(shop.address?.city);
  const state = cleanString(shop.address?.state);
  const zip = cleanString(shop.address?.zip);
  const country = cleanString(shop.address?.country) || "US";
  return {
    businessName: cleanString(shop.businessName),
    address1,
    city,
    state,
    zip,
    country,
    formattedAddress: [address1, [city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" "),
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  const { previewSlug } = await params;
  const normalized = previewSlug?.trim().toLowerCase();
  if (!normalized) return NextResponse.json({ error: "Storefront could not be found." }, { status: 404 });
  const context = await loadContext(request, normalized);
  if ("error" in context) return context.error;
  const { website, shop } = context;
  return NextResponse.json({
    enabled: website.pickupPolicy?.enabled === true,
    policy: {
      allowsSameDay: website.pickupPolicy?.allowsSameDay !== false,
      preparationMinutes: normalizePreparationMinutes(
        website.pickupPolicy?.preparationMinutes,
      ),
      instructions: cleanString(website.pickupPolicy?.instructions),
    },
    location: pickupLocation(shop),
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { previewSlug } = await params;
    const normalized = previewSlug?.trim().toLowerCase();
    if (!normalized) return NextResponse.json({ error: "Storefront could not be found." }, { status: 404 });
    const context = await loadContext(request, normalized);
    if ("error" in context) return context.error;
    const { website, shop } = context;
    if (website.pickupPolicy?.enabled !== true) {
      return NextResponse.json({ eligible: false, reason: "PICKUP_DISABLED", message: "Pickup is not currently available." }, { status: 409 });
    }

    const location = pickupLocation(shop);
    if (!location.address1 || !location.city || !location.state || !location.zip) {
      console.error("BloomWebsite pickup validation: florist pickup address is incomplete.", {
        websiteId: String(website._id),
        shopId: String(shop._id),
      });
      return NextResponse.json(
        {
          eligible: false,
          reason: "PICKUP_LOCATION_UNAVAILABLE",
          message: "Pickup is temporarily unavailable because the florist's pickup location is incomplete.",
        },
        { status: 409 },
      );
    }

    const body = (await request.json()) as { items?: unknown; requestedDate?: unknown };
    const requestedDate = cleanString(body.requestedDate);
    if (!isValidDateOnly(requestedDate)) {
      return NextResponse.json({ eligible: false, reason: "INVALID_DATE", message: "Please choose a valid pickup date." }, { status: 400 });
    }
    const items = parseCartItems(body.items);
    if (!items) return NextResponse.json({ eligible: false, reason: "INVALID_CART", message: "Your cart could not be validated." }, { status: 400 });

    const timezone = getSafeTimezone(shop.address?.timezone);
    const now = new Date();
    const today = getLocalParts(now, timezone).date;
    if (requestedDate < today) {
      return NextResponse.json({ eligible: false, reason: "DATE_IN_PAST", message: "Please choose today or a future pickup date." }, { status: 409 });
    }
    const sameDay = requestedDate === today;
    const blackout = (shop.delivery?.blackoutDates || []).some((date) => normalizeDateOnly(date, timezone) === requestedDate);
    if (blackout) {
      return NextResponse.json({ eligible: false, reason: "DATE_BLACKED_OUT", message: "The florist is unavailable on that date. Please choose another pickup date." }, { status: 409 });
    }
    if (sameDay && website.pickupPolicy?.allowsSameDay === false) {
      return NextResponse.json({ eligible: false, reason: "SAME_DAY_NOT_ALLOWED", message: "Same-day pickup is not available. Please choose a future date." }, { status: 409 });
    }
    if (sameDay && cutoffPassed(
      normalizeCutoff(website.pickupPolicy?.sameDayCutoff, "16:00"),
      now,
      timezone,
    )) {
      return NextResponse.json({ eligible: false, reason: "SAME_DAY_CUTOFF_PASSED", message: "Today's pickup cutoff has passed. Please choose a future date." }, { status: 409 });
    }
    const pausedUntil = website.pickupPolicy?.noMorePickupTodayUntil ? new Date(website.pickupPolicy.noMorePickupTodayUntil) : null;
    if (sameDay && pausedUntil && !Number.isNaN(pausedUntil.getTime()) && pausedUntil.getTime() > now.getTime()) {
      return NextResponse.json({ eligible: false, reason: "SAME_DAY_TEMPORARILY_CLOSED", message: "Pickup orders are closed for today. Please choose a future date." }, { status: 409 });
    }

    const cart = await validateBloomWebsiteCart({ previewSlug: normalized, items, requestedDate });
    const minimumProductTotalCents = Math.round(Math.max(0, Number(website.orderPolicy?.minProductTotal) || 0) * 100);
    if (cart.subtotalCents < minimumProductTotalCents) {
      return NextResponse.json({ eligible: false, reason: "MINIMUM_NOT_MET", message: `A minimum product total of $${(minimumProductTotalCents / 100).toFixed(2)} is required.` }, { status: 409 });
    }

    const preparationMinutes = normalizePreparationMinutes(
      website.pickupPolicy?.preparationMinutes,
    );
    return NextResponse.json({
      eligible: true,
      pickup: { requestedDate, sameDay, preparationMinutes, instructions: cleanString(website.pickupPolicy?.instructions) },
      location,
      cart: {
        itemCount: cart.itemCount,
        productSubtotalCents: cart.productSubtotalCents,
        addonSubtotalCents: cart.addonSubtotalCents,
        subtotalCents: cart.subtotalCents,
        taxableSubtotalCents: cart.taxableSubtotalCents,
      },
      totals: { subtotalCents: cart.subtotalCents, deliveryFeeCents: 0, totalBeforeTaxCents: cart.subtotalCents },
    });
  } catch (error) {
    if (error instanceof BloomWebsiteCartValidationError) {
      return NextResponse.json({ eligible: false, reason: error.code, message: error.message }, { status: cartErrorStatus(error) });
    }
    console.error("BloomWebsite pickup validation failed:", error);
    return NextResponse.json({ error: "Pickup could not be validated right now." }, { status: 500 });
  }
}
