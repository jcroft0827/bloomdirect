// app/api/websites/settings/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

function isValidTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isValidDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function dateOnlyToStableDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  /*
   * Store date-only policy values at UTC noon.
   * This avoids an accidental previous-day shift
   * for North American florist timezones.
   *
   * Delivery evaluation still treats this as a
   * calendar-date policy, not a moment in time.
   */
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

function getEndOfTodayInTimezone(timezone: string) {
  /*
   * Find today's YYYY-MM-DD in the florist timezone.
   */
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  const year = Number(values.year);

  const month = Number(values.month);

  const day = Number(values.day);

  /*
   * noMoreOrdersTodayUntil only needs to remain
   * in the future through the florist's local day.
   *
   * Use a generous UTC boundary so it cannot
   * expire early for a US/Canadian florist.
   * The existing delivery evaluator is responsible
   * for interpreting the policy by florist timezone.
   */
  return new Date(Date.UTC(year, month - 1, day + 1, 12, 0, 0));
}

function isValidLocalDate(value: unknown) {
  if (value === "") {
    return true;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function isValidOptionalTime(value: unknown) {
  return value === "" || isValidTime(value);
}

function parseTaxRatePercent(
  value: unknown,
  allowNull = false,
): number | null | "invalid" {
  if ((value === null || value === "") && allowNull) return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "invalid";
  return Math.round(rate * 1000) / 1000;
}


export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    await connectToDB();

    type SettingsShopLean = {
      _id: unknown;
      address?: {
        timezone?: string;
      };
    };

    const shop = await Shop.findById(session.user.id)
      .select("_id address.timezone")
      .lean<SettingsShopLean>();

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

    const website = await BloomWebsite.findOne({
      shop: shop._id,
    });

    if (!website) {
      return NextResponse.json(
        {
          error: "BloomWebsite not found.",
        },
        {
          status: 404,
        },
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.section !== "string" ||
      !body.data ||
      typeof body.data !== "object"
    ) {
      return NextResponse.json(
        {
          error: "Invalid settings request.",
        },
        {
          status: 400,
        },
      );
    }

    const data = body.data as Record<string, unknown>;

    /*
     * Normal order-policy fields.
     */
    if (body.section === "orderPolicy") {
      if ("allowsSameDay" in data) {
        if (typeof data.allowsSameDay !== "boolean") {
          return NextResponse.json(
            {
              error: "Invalid same-day setting.",
            },
            {
              status: 400,
            },
          );
        }

        website.orderPolicy.allowsSameDay = data.allowsSameDay;
      }

      if ("sameDayCutoff" in data) {
        if (!isValidTime(data.sameDayCutoff)) {
          return NextResponse.json(
            {
              error: "Invalid same-day cutoff.",
            },
            {
              status: 400,
            },
          );
        }

        website.orderPolicy.sameDayCutoff = data.sameDayCutoff;
      }

      if ("minProductTotal" in data) {
        const minimum = Number(data.minProductTotal);

        if (!Number.isFinite(minimum) || minimum < 0) {
          return NextResponse.json(
            {
              error: "Invalid minimum product total.",
            },
            {
              status: 400,
            },
          );
        }

        website.orderPolicy.minProductTotal = Math.round(minimum * 100) / 100;
      }

      if ("fulfillmentWorkflow" in data) {
        if (
          data.fulfillmentWorkflow !== "simple" &&
          data.fulfillmentWorkflow !== "detailed"
        ) {
          return NextResponse.json(
            { error: "Invalid fulfillment workflow." },
            { status: 400 },
          );
        }

        website.orderPolicy.fulfillmentWorkflow = data.fulfillmentWorkflow;
      }

      if ("sendDeliveryConfirmation" in data) {
        if (typeof data.sendDeliveryConfirmation !== "boolean") {
          return NextResponse.json(
            { error: "Invalid delivery confirmation setting." },
            { status: 400 },
          );
        }

        website.orderPolicy.sendDeliveryConfirmation =
          data.sendDeliveryConfirmation;
      }

      /*
       * Operational action:
       * stop/resume website orders today.
       */
      if ("pauseOrdersToday" in data) {
        if (typeof data.pauseOrdersToday !== "boolean") {
          return NextResponse.json(
            {
              error: "Invalid order pause setting.",
            },
            {
              status: 400,
            },
          );
        }

        if (data.pauseOrdersToday) {
          const timezone = shop.address?.timezone || "America/New_York";

          website.orderPolicy.noMoreOrdersTodayUntil =
            getEndOfTodayInTimezone(timezone);
        } else {
          website.orderPolicy.noMoreOrdersTodayUntil = null;
        }
      }

      /*
       * Website-only blocked delivery date.
       */
      if ("blockedDate" in data) {
        if (data.blockedDate === null || data.blockedDate === "") {
          website.orderPolicy.noMoreOrdersForDate = null;
        } else {
          if (!isValidDateOnly(data.blockedDate)) {
            return NextResponse.json(
              {
                error: "Invalid blocked delivery date.",
              },
              {
                status: 400,
              },
            );
          }

          website.orderPolicy.noMoreOrdersForDate = dateOnlyToStableDate(
            data.blockedDate,
          );
        }
      }
    } else if (body.section === "pickupPolicy") {
      /*
       * Normal pickup-policy fields.
       */
      if ("enabled" in data) {
        if (typeof data.enabled !== "boolean") {
          return NextResponse.json(
            {
              error: "Invalid pickup enabled setting.",
            },
            {
              status: 400,
            },
          );
        }

        website.pickupPolicy.enabled = data.enabled;
      }

      if ("allowsSameDay" in data) {
        if (typeof data.allowsSameDay !== "boolean") {
          return NextResponse.json(
            {
              error: "Invalid same-day pickup setting.",
            },
            {
              status: 400,
            },
          );
        }

        website.pickupPolicy.allowsSameDay = data.allowsSameDay;
      }

      if ("sameDayCutoff" in data) {
        if (!isValidTime(data.sameDayCutoff)) {
          return NextResponse.json(
            {
              error: "Invalid same-day pickup cutoff.",
            },
            {
              status: 400,
            },
          );
        }

        website.pickupPolicy.sameDayCutoff = data.sameDayCutoff;
      }

      if ("preparationMinutes" in data) {
        const preparationMinutes = Number(data.preparationMinutes);

        if (
          !Number.isFinite(preparationMinutes) ||
          preparationMinutes < 0 ||
          preparationMinutes > 1440
        ) {
          return NextResponse.json(
            {
              error:
                "Pickup preparation time must be between 0 and 1,440 minutes.",
            },
            {
              status: 400,
            },
          );
        }

        website.pickupPolicy.preparationMinutes =
          Math.round(preparationMinutes);
      }

      if ("instructions" in data) {
        if (
          typeof data.instructions !== "string" ||
          data.instructions.trim().length > 500
        ) {
          return NextResponse.json(
            {
              error: "Pickup instructions must be 500 characters or fewer.",
            },
            {
              status: 400,
            },
          );
        }

        website.pickupPolicy.instructions = data.instructions.trim();
      }

      /*
       * Operational action:
       * stop/resume pickup orders for today.
       *
       * This is intentionally scoped to pickupPolicy
       * so another settings section cannot mutate it.
       */
      if ("pausePickupToday" in data) {
        if (typeof data.pausePickupToday !== "boolean") {
          return NextResponse.json(
            {
              error: "Invalid pickup pause setting.",
            },
            {
              status: 400,
            },
          );
        }

        if (data.pausePickupToday) {
          const timezone = shop.address?.timezone || "America/New_York";

          website.pickupPolicy.noMorePickupTodayUntil =
            getEndOfTodayInTimezone(timezone);
        } else {
          website.pickupPolicy.noMorePickupTodayUntil = null;
        }
      }
    } else if (body.section === "paymentSettings") {
      /*
       * Stripe is the only launch-ready BloomWebsites payment provider.
       * Keep Fiserv unavailable server-side as well as in the UI so a
       * crafted request cannot save an unusable production configuration.
       */
      const provider = data.provider === "stripe" ? "stripe" : null;

      if (
        typeof data.enabled !== "boolean" ||
        !provider
      ) {
        return NextResponse.json(
          { error: "Invalid BloomWebsite payment settings." },
          { status: 400 },
        );
      }

      website.paymentSettings.enabled = data.enabled;
      website.paymentSettings.provider = provider;
    } else if (body.section === "taxSettings") {
      const defaultRate = parseTaxRatePercent(data.defaultRatePercent);
      const deliveryRate = parseTaxRatePercent(data.deliveryRatePercent, true);
      const tipRate = parseTaxRatePercent(data.tipRatePercent, true);

      if (
        typeof data.enabled !== "boolean" ||
        defaultRate === "invalid" ||
        defaultRate === null ||
        typeof data.deliveryTaxable !== "boolean" ||
        deliveryRate === "invalid" ||
        typeof data.tipsEnabled !== "boolean" ||
        typeof data.tipsTaxable !== "boolean" ||
        tipRate === "invalid" ||
        typeof data.taxExemptCustomersEnabled !== "boolean"
      ) {
        return NextResponse.json(
          { error: "Invalid BloomWebsite tax settings." },
          { status: 400 },
        );
      }

      const suggestedTipPercentages = Array.isArray(
        data.suggestedTipPercentages,
      )
        ? [...new Set(data.suggestedTipPercentages.map(Number))]
            .filter(
              (value) =>
                Number.isFinite(value) &&
                value >= 0 &&
                value <= 100,
            )
            .slice(0, 5)
        : [];

      if (data.tipsEnabled && suggestedTipPercentages.length === 0) {
        return NextResponse.json(
          { error: "Add at least one valid suggested tip percentage." },
          { status: 400 },
        );
      }

      website.taxSettings.enabled = data.enabled;
      website.taxSettings.defaultRatePercent = defaultRate;
      website.taxSettings.deliveryTaxable = data.deliveryTaxable;
      website.taxSettings.deliveryRatePercent = deliveryRate;
      website.taxSettings.tipsEnabled = data.tipsEnabled;
      website.taxSettings.suggestedTipPercentages =
        suggestedTipPercentages.length > 0
          ? suggestedTipPercentages
          : [10, 15, 20];
      website.taxSettings.tipsTaxable = data.tipsTaxable;
      website.taxSettings.tipRatePercent = tipRate;
      website.taxSettings.taxExemptCustomersEnabled =
        data.taxExemptCustomersEnabled;
    } else if (body.section === "announcement") {
      const enabled = data.enabled;

      const message = data.message;

      const scheduleEnabled = data.scheduleEnabled;

      const startsAtDate = data.startsAtDate;

      const startsAtTime = data.startsAtTime;

      const endsAtDate = data.endsAtDate;

      const endsAtTime = data.endsAtTime;

      if (typeof enabled !== "boolean") {
        return NextResponse.json(
          {
            error: "Invalid announcement enabled setting.",
          },
          {
            status: 400,
          },
        );
      }

      if (typeof message !== "string" || message.trim().length > 220) {
        return NextResponse.json(
          {
            error: "Announcement message must be 220 characters or fewer.",
          },
          {
            status: 400,
          },
        );
      }

      if (enabled && !message.trim()) {
        return NextResponse.json(
          {
            error: "Enter an announcement message before enabling the bar.",
          },
          {
            status: 400,
          },
        );
      }

      if (typeof scheduleEnabled !== "boolean") {
        return NextResponse.json(
          {
            error: "Invalid announcement schedule setting.",
          },
          {
            status: 400,
          },
        );
      }

      if (
        !isValidLocalDate(startsAtDate) ||
        !isValidLocalDate(endsAtDate) ||
        !isValidOptionalTime(startsAtTime) ||
        !isValidOptionalTime(endsAtTime)
      ) {
        return NextResponse.json(
          {
            error: "Invalid announcement schedule.",
          },
          {
            status: 400,
          },
        );
      }

      if (scheduleEnabled) {
        const hasStartDate = Boolean(startsAtDate);

        const hasStartTime = Boolean(startsAtTime);

        const hasEndDate = Boolean(endsAtDate);

        const hasEndTime = Boolean(endsAtTime);

        if (hasStartDate !== hasStartTime) {
          return NextResponse.json(
            {
              error: "Choose both a start date and start time.",
            },
            {
              status: 400,
            },
          );
        }

        if (hasEndDate !== hasEndTime) {
          return NextResponse.json(
            {
              error: "Choose both an end date and end time.",
            },
            {
              status: 400,
            },
          );
        }

        if (!hasStartDate && !hasEndDate) {
          return NextResponse.json(
            {
              error:
                "Add a start time, an end time, or both for the announcement schedule.",
            },
            {
              status: 400,
            },
          );
        }

        if (hasStartDate && hasEndDate) {
          const start = `${startsAtDate}T${startsAtTime}`;

          const end = `${endsAtDate}T${endsAtTime}`;

          if (end <= start) {
            return NextResponse.json(
              {
                error: "Announcement end time must be after its start time.",
              },
              {
                status: 400,
              },
            );
          }
        }
      }

      website.announcement.enabled = enabled;

      website.announcement.message = message.trim();

      website.announcement.scheduleEnabled = scheduleEnabled;

      website.announcement.startsAtDate = scheduleEnabled
        ? String(startsAtDate || "")
        : "";

      website.announcement.startsAtTime = scheduleEnabled
        ? String(startsAtTime || "")
        : "";

      website.announcement.endsAtDate = scheduleEnabled
        ? String(endsAtDate || "")
        : "";

      website.announcement.endsAtTime = scheduleEnabled
        ? String(endsAtTime || "")
        : "";
    } else if (body.section === "contactDisplay") {
      const showPhone = data.showPhone;

      const showAddress = data.showAddress;

      const showSocialLinks = data.showSocialLinks;

      if (
        typeof showPhone !== "boolean" ||
        typeof showAddress !== "boolean" ||
        typeof showSocialLinks !== "boolean"
      ) {
        return NextResponse.json(
          {
            error: "Invalid contact and display settings.",
          },
          {
            status: 400,
          },
        );
      }

      website.settings.showPhone = showPhone;

      website.settings.showAddress = showAddress;

      website.settings.showSocialLinks = showSocialLinks;
    } else {
      return NextResponse.json(
        {
          error: "Unsupported settings section.",
        },
        {
          status: 400,
        },
      );
    }

    await website.save();

    return NextResponse.json({
      website: website.toObject(),
    });
  } catch (error) {
    console.error("BloomWebsite settings update failed:", error);

    return NextResponse.json(
      {
        error: "Unable to update BloomWebsite settings.",
      },
      {
        status: 500,
      },
    );
  }
}
