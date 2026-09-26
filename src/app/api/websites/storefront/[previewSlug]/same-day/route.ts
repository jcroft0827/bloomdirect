import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    previewSlug: string;
  }>;
};

type LeanBloomWebsite = {
  _id: unknown;

  shop: unknown;
  status?: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;

  orderPolicy?: {
    allowsSameDay?: boolean;

    sameDayCutoff?: string;

    noMoreOrdersTodayUntil?: Date | string | null;

    noMoreOrdersForDate?: Date | string | null;
  };
};

type LeanShop = {
  _id: unknown;

  isSuspended?: boolean;

  address?: {
    timezone?: string;
  };

  delivery?: {
    blackoutDates?: Array<Date | string>;
  };
};

type LocalDateTimeParts = {
  date: string;

  hour: number;
  minute: number;
  second: number;
};

function normalizeDateOnly(
  value: Date | string | null | undefined,
  timezone: string,
) {
  if (!value) {
    return null;
  }

  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;

  const month = parts.find((part) => part.type === "month")?.value;

  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

function getLocalDateTimeParts(
  date: Date,
  timezone: string,
): LocalDateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",

    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",

    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const year = getPart("year");

  const month = getPart("month");

  const day = getPart("day");

  const hour = Number(getPart("hour"));

  const minute = Number(getPart("minute"));

  const second = Number(getPart("second"));

  return {
    date: `${year}-${month}-${day}`,

    hour: Number.isFinite(hour) ? hour : 0,

    minute: Number.isFinite(minute) ? minute : 0,

    second: Number.isFinite(second) ? second : 0,
  };
}

function parseCutoff(value: string | undefined) {
  if (!value) {
    return null;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());

  if (!match) {
    return null;
  }

  const hour = Number(match[1]);

  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return null;
  }

  return {
    hour,
    minute,
  };
}

function formatCutoffLabel(hour: number, minute: number) {
  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  const displayMinute = String(minute).padStart(2, "0");

  return `${displayHour}:${displayMinute} ${suffix}`;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { previewSlug } = await context.params;
    const normalizedPreviewSlug = previewSlug?.trim().toLowerCase();

    if (!normalizedPreviewSlug) {
      return NextResponse.json(
        { error: "Storefront could not be found." },
        { status: 404 },
      );
    }

    await connectToDB();

    const rateLimit = await checkBloomWebsiteRateLimit({
      request,
      scope: "storefront-same-day",
      subject: normalizedPreviewSlug,
      limit: 120,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many availability checks. Please wait a moment and try again." },
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

    const website = await BloomWebsite.findOne({
      previewSlug: normalizedPreviewSlug,
    })
      .select({
        _id: 1,
        shop: 1,
        status: 1,
        customDomain: 1,
        domainVerified: 1,

        "orderPolicy.allowsSameDay": 1,

        "orderPolicy.sameDayCutoff": 1,

        "orderPolicy.noMoreOrdersTodayUntil": 1,

        "orderPolicy.noMoreOrdersForDate": 1,
      })
      .lean<LeanBloomWebsite>();

    if (!website) {
      return NextResponse.json(
        {
          error: "Website not found.",
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

    const shop = await Shop.findById(website.shop)
      .select({
        _id: 1,

        isSuspended: 1,

        "address.timezone": 1,

        "delivery.blackoutDates": 1,
      })
      .lean<LeanShop>();

    if (!shop) {
      return NextResponse.json(
        {
          error: "Shop not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "This shop is not currently accepting website orders.",
        },
        {
          status: 403,
        },
      );
    }

    const timezone = shop.address?.timezone || "America/New_York";

    const now = new Date();

    const localNow = getLocalDateTimeParts(now, timezone);

    const today = localNow.date;

    const allowsSameDay = website.orderPolicy?.allowsSameDay !== false;

    const cutoff = parseCutoff(website.orderPolicy?.sameDayCutoff);

    const cutoffLabel = cutoff
      ? formatCutoffLabel(cutoff.hour, cutoff.minute)
      : null;

    /*
     * Same-day is disabled for this channel.
     *
     * We intentionally don't show a negative storefront
     * banner in this case. The customer can simply choose
     * a future delivery date.
     */
    if (!allowsSameDay) {
      return NextResponse.json({
        available: false,

        reason: "SAME_DAY_NOT_ALLOWED",

        showMessage: false,

        timezone,

        cutoffLabel,

        remainingSeconds: 0,
      });
    }

    /*
     * Shared physical shop blackout dates apply to every
     * channel because the florist is actually closed.
     */
    const blackoutDates = shop.delivery?.blackoutDates ?? [];

    const isBlackoutDate = blackoutDates.some(
      (value) => normalizeDateOnly(value, timezone) === today,
    );

    if (isBlackoutDate) {
      return NextResponse.json({
        available: false,

        reason: "DATE_BLACKED_OUT",

        showMessage: true,

        message: "Same-day delivery is unavailable today.",

        timezone,

        cutoffLabel,

        remainingSeconds: 0,
      });
    }

    /*
     * BloomWebsites-specific blocked delivery date.
     */
    const blockedDate = normalizeDateOnly(
      website.orderPolicy?.noMoreOrdersForDate,
      timezone,
    );

    if (blockedDate && blockedDate === today) {
      return NextResponse.json({
        available: false,

        reason: "DATE_CLOSED",

        showMessage: true,

        message: "Same-day delivery is unavailable today.",

        timezone,

        cutoffLabel,

        remainingSeconds: 0,
      });
    }

    /*
     * BloomWebsites-specific temporary stop-orders state.
     */
    const stopUntilValue = website.orderPolicy?.noMoreOrdersTodayUntil;

    if (stopUntilValue) {
      const stopUntil = new Date(stopUntilValue);

      if (!Number.isNaN(stopUntil.getTime()) && now < stopUntil) {
        return NextResponse.json({
          available: false,

          reason: "SAME_DAY_TEMPORARILY_CLOSED",

          showMessage: true,

          message: "Same-day delivery is unavailable for the rest of today.",

          timezone,

          cutoffLabel,

          remainingSeconds: 0,
        });
      }
    }

    /*
     * If same-day is enabled but the cutoff is malformed or
     * missing, fail closed instead of advertising availability
     * we cannot safely enforce.
     */
    if (!cutoff) {
      return NextResponse.json({
        available: false,

        reason: "INVALID_CUTOFF",

        showMessage: false,

        timezone,

        cutoffLabel: null,

        remainingSeconds: 0,
      });
    }

    const currentSecondOfDay =
      localNow.hour * 60 * 60 + localNow.minute * 60 + localNow.second;

    const cutoffSecondOfDay = cutoff.hour * 60 * 60 + cutoff.minute * 60;

    const remainingSeconds = Math.max(
      0,
      cutoffSecondOfDay - currentSecondOfDay,
    );

    if (remainingSeconds <= 0) {
      return NextResponse.json({
        available: false,

        reason: "SAME_DAY_CUTOFF_PASSED",

        showMessage: true,

        message:
          "Same-day ordering has closed for today. Please choose a future delivery date.",

        timezone,

        cutoffLabel,

        remainingSeconds: 0,
      });
    }

    return NextResponse.json({
      available: true,

      reason: null,

      showMessage: true,

      message: "Same-day delivery is available.",

      timezone,

      cutoffLabel,

      remainingSeconds,
    });
  } catch (error) {
    console.error("BloomWebsite same-day status error:", error);

    return NextResponse.json(
      {
        error: "Unable to check same-day delivery availability.",
      },
      {
        status: 500,
      },
    );
  }
}
