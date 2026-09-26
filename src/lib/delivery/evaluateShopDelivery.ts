import { normalizeZip } from "@/lib/delivery/normalizeZip";

export type DeliveryMethod = "zip" | "distance";

export type DeliveryZipZone = {
  zip?: string;
  fee?: number;
};

export type DeliveryDistanceZone = {
  min?: number;
  max?: number;
  fee?: number;
};

/**
 * Physical delivery capability.
 *
 * These rules describe WHERE the florist can physically deliver
 * and what that delivery costs.
 *
 * They are intentionally independent of whether the order comes
 * from GetBloomDirect, BloomWebsites, or another future BloomSuite
 * sales channel.
 */
export type ShopDeliveryConfiguration = {
  method?: DeliveryMethod;

  zipZones?: DeliveryZipZone[];
  distanceZones?: DeliveryDistanceZone[];

  fallbackFee?: number;
  maxRadius?: number;

  /**
   * Dates where the florist is genuinely unavailable for delivery
   * regardless of sales channel.
   *
   * Channel-specific closures should NOT go here.
   */
  blackoutDates?: Array<string | Date>;
};

/**
 * Channel-specific order acceptance policy.
 *
 * GBD and BloomWebsites should each provide their own policy.
 *
 * Example:
 *
 * GBD:
 *   allowsSameDay: false
 *
 * BloomWebsites:
 *   allowsSameDay: true
 *   sameDayCutoff: "13:00"
 */
export type DeliveryOrderChannelPolicy = {
  allowsSameDay?: boolean;

  /**
   * HH:mm in the florist's local timezone.
   */
  sameDayCutoff?: string;

  /**
   * Temporarily stop accepting same-day orders through THIS channel
   * until the given timestamp.
   */
  noMoreOrdersTodayUntil?: string | Date | null;

  /**
   * Stop accepting orders through THIS channel for one delivery date.
   */
  noMoreOrdersForDate?: string | Date | null;
};

export type EvaluateShopDeliveryInput = {
  delivery: ShopDeliveryConfiguration;

  /**
   * Policy belonging specifically to the sales channel making
   * this evaluation.
   */
  policy: DeliveryOrderChannelPolicy;

  destinationZip: string;

  /**
   * Required for distance-based delivery.
   */
  distanceMiles?: number;

  /**
   * YYYY-MM-DD in the florist's local timezone.
   */
  requestedDate?: string;

  /**
   * Florist IANA timezone.
   *
   * Example:
   * America/New_York
   */
  timezone?: string;

  /**
   * Primarily useful for deterministic testing.
   */
  now?: Date;
};

export type DeliveryIneligibilityReason =
  | "INVALID_DESTINATION_ZIP"
  | "OUTSIDE_DELIVERY_AREA"
  | "DISTANCE_REQUIRED"
  | "DATE_BLACKED_OUT"
  | "DATE_CLOSED"
  | "SAME_DAY_NOT_ALLOWED"
  | "SAME_DAY_CUTOFF_PASSED"
  | "SAME_DAY_TEMPORARILY_CLOSED"
  | "DATE_IN_PAST";

export type ShopDeliveryEvaluation =
  | {
      eligible: true;

      deliveryFee: number;

      distanceMiles: number | null;

      requestedDate: string | null;

      sameDay: boolean;
    }
  | {
      eligible: false;

      reason: DeliveryIneligibilityReason;

      message: string;

      distanceMiles: number | null;

      requestedDate: string | null;

      sameDay: boolean;
    };

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getLocalDateParts(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,

    year: "numeric",
    month: "2-digit",
    day: "2-digit",

    hour: "2-digit",
    minute: "2-digit",

    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(date);

  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "";

  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),

    hour: Number(getPart("hour")),
    minute: Number(getPart("minute")),
  };
}

function getLocalDateString(date: Date, timezone: string) {
  const parts = getLocalDateParts(date, timezone);

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function normalizeDateOnly(
  value: string | Date | null | undefined,
  timezone: string,
): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return getLocalDateString(value, timezone);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return getLocalDateString(parsed, timezone);
}

function cutoffHasPassed(
  cutoff: string | undefined,
  now: Date,
  timezone: string,
) {
  if (!cutoff) {
    return false;
  }

  const match = /^(\d{1,2}):(\d{2})$/.exec(cutoff.trim());

  if (!match) {
    return false;
  }

  const cutoffHour = Number(match[1]);
  const cutoffMinute = Number(match[2]);

  if (
    !Number.isInteger(cutoffHour) ||
    !Number.isInteger(cutoffMinute) ||
    cutoffHour < 0 ||
    cutoffHour > 23 ||
    cutoffMinute < 0 ||
    cutoffMinute > 59
  ) {
    return false;
  }

  const localNow = getLocalDateParts(now, timezone);

  const currentMinutes = localNow.hour * 60 + localNow.minute;

  const cutoffMinutes = cutoffHour * 60 + cutoffMinute;

  return currentMinutes >= cutoffMinutes;
}

function evaluateZipDelivery(
  delivery: ShopDeliveryConfiguration,
  destinationZip: string,
) {
  const zones = delivery.zipZones || [];

  const zone = zones.find((item) => normalizeZip(item.zip) === destinationZip);

  if (!zone) {
    return {
      eligible: false as const,
    };
  }

  const configuredFee = Number(zone.fee);

  if (Number.isFinite(configuredFee) && configuredFee >= 0) {
    return {
      eligible: true as const,

      deliveryFee: roundCurrency(configuredFee),
    };
  }

  /**
   * fallbackFee may resolve a missing fee for a ZIP that is
   * already part of the configured service area.
   *
   * It must never create serviceability by itself.
   */
  const fallbackFee = Number(delivery.fallbackFee);

  return {
    eligible: true as const,

    deliveryFee:
      Number.isFinite(fallbackFee) && fallbackFee >= 0
        ? roundCurrency(fallbackFee)
        : 0,
  };
}

function evaluateDistanceDelivery(
  delivery: ShopDeliveryConfiguration,
  distanceMiles: number | undefined,
) {
  if (
    typeof distanceMiles !== "number" ||
    !Number.isFinite(distanceMiles) ||
    distanceMiles < 0
  ) {
    return {
      eligible: false as const,

      reason: "DISTANCE_REQUIRED" as const,
    };
  }

  const maxRadius = Number(delivery.maxRadius);

  /**
   * maxRadius is the hard physical service boundary.
   */
  if (
    Number.isFinite(maxRadius) &&
    maxRadius > 0 &&
    distanceMiles > maxRadius
  ) {
    return {
      eligible: false as const,

      reason: "OUTSIDE_DELIVERY_AREA" as const,
    };
  }

  const zones = delivery.distanceZones || [];

  const matchingZone = zones.find((zone) => {
    const min = Number(zone.min);
    const max = Number(zone.max);

    if (!Number.isFinite(min) || !Number.isFinite(max)) {
      return false;
    }

    return distanceMiles >= min && distanceMiles <= max;
  });

  if (matchingZone) {
    const configuredFee = Number(matchingZone.fee);

    if (Number.isFinite(configuredFee) && configuredFee >= 0) {
      return {
        eligible: true as const,

        deliveryFee: roundCurrency(configuredFee),
      };
    }
  }

  /**
   * fallbackFee can resolve a pricing gap INSIDE the
   * established service radius.
   *
   * It does not expand that radius.
   */
  const fallbackFee = Number(delivery.fallbackFee);

  if (
    Number.isFinite(fallbackFee) &&
    fallbackFee >= 0 &&
    Number.isFinite(maxRadius) &&
    maxRadius > 0 &&
    distanceMiles <= maxRadius
  ) {
    return {
      eligible: true as const,

      deliveryFee: roundCurrency(fallbackFee),
    };
  }

  return {
    eligible: false as const,

    reason: "OUTSIDE_DELIVERY_AREA" as const,
  };
}

export function evaluateShopDelivery(
  input: EvaluateShopDeliveryInput,
): ShopDeliveryEvaluation {
  const timezone = input.timezone || "America/New_York";

  const now = input.now || new Date();

  const destinationZip = normalizeZip(input.destinationZip);

  const requestedDate = input.requestedDate?.trim() || null;

  const today = getLocalDateString(now, timezone);

  const sameDay = requestedDate !== null && requestedDate === today;

  if (requestedDate && requestedDate < today) {
    return {
      eligible: false,

      reason: "DATE_IN_PAST",

      message: "Please choose a delivery date that hasn't already passed.",

      distanceMiles:
        typeof input.distanceMiles === "number" ? input.distanceMiles : null,

      requestedDate,

      sameDay: false,
    };
  }

  const baseFailure = (
    reason: DeliveryIneligibilityReason,
    message: string,
  ): ShopDeliveryEvaluation => ({
    eligible: false,

    reason,
    message,

    distanceMiles:
      typeof input.distanceMiles === "number" ? input.distanceMiles : null,

    requestedDate,

    sameDay,
  });

  if (!destinationZip) {
    return baseFailure(
      "INVALID_DESTINATION_ZIP",
      "Please enter a valid delivery ZIP code.",
    );
  }

  /*
   * --------------------------------------------------
   * PHYSICAL DATE AVAILABILITY
   * --------------------------------------------------
   *
   * blackoutDates belong to the florist's physical
   * delivery capability.
   *
   * If the florist is genuinely closed, every channel
   * should respect the closure.
   */
  if (requestedDate) {
    const blackoutDates = (input.delivery.blackoutDates || [])
      .map((date) => normalizeDateOnly(date, timezone))
      .filter((date): date is string => Boolean(date));

    if (blackoutDates.includes(requestedDate)) {
      return baseFailure(
        "DATE_BLACKED_OUT",
        "Sorry, this florist isn't available for delivery on that date.",
      );
    }
  }

  /*
   * --------------------------------------------------
   * CHANNEL-SPECIFIC ORDER POLICY
   * --------------------------------------------------
   *
   * These rules belong to whichever channel is asking:
   *
   * - GetBloomDirect
   * - BloomWebsites
   * - future BloomSuite channels
   */
  if (requestedDate) {
    const closedDate = normalizeDateOnly(
      input.policy.noMoreOrdersForDate,
      timezone,
    );

    if (closedDate === requestedDate) {
      return baseFailure(
        "DATE_CLOSED",
        "Sorry, this florist is no longer accepting orders for that delivery date.",
      );
    }

    if (sameDay) {
      if (input.policy.allowsSameDay !== true) {
        return baseFailure(
          "SAME_DAY_NOT_ALLOWED",
          "Same-day delivery isn't available for orders placed through this storefront.",
        );
      }

      if (cutoffHasPassed(input.policy.sameDayCutoff, now, timezone)) {
        return baseFailure(
          "SAME_DAY_CUTOFF_PASSED",
          "Same-day ordering has closed for today. Please choose another delivery date.",
        );
      }

      const temporaryClosure = input.policy.noMoreOrdersTodayUntil
        ? new Date(input.policy.noMoreOrdersTodayUntil)
        : null;

      if (
        temporaryClosure &&
        !Number.isNaN(temporaryClosure.getTime()) &&
        temporaryClosure.getTime() > now.getTime()
      ) {
        return baseFailure(
          "SAME_DAY_TEMPORARILY_CLOSED",
          "Same-day ordering is temporarily unavailable. Please choose another delivery date.",
        );
      }
    }
  }

  /*
   * --------------------------------------------------
   * PHYSICAL SERVICE AREA + DELIVERY PRICE
   * --------------------------------------------------
   */
  if (input.delivery.method === "distance") {
    const distanceEvaluation = evaluateDistanceDelivery(
      input.delivery,
      input.distanceMiles,
    );

    if (!distanceEvaluation.eligible) {
      if (distanceEvaluation.reason === "DISTANCE_REQUIRED") {
        return baseFailure(
          "DISTANCE_REQUIRED",
          "We couldn't verify this delivery address. Please check the address and try again.",
        );
      }

      return baseFailure(
        "OUTSIDE_DELIVERY_AREA",
        "Sorry, this florist doesn't currently deliver to that address.",
      );
    }

    return {
      eligible: true,

      deliveryFee: distanceEvaluation.deliveryFee,

      distanceMiles:
        typeof input.distanceMiles === "number" ? input.distanceMiles : null,

      requestedDate,

      sameDay,
    };
  }

  const zipEvaluation = evaluateZipDelivery(input.delivery, destinationZip);

  if (!zipEvaluation.eligible) {
    return baseFailure(
      "OUTSIDE_DELIVERY_AREA",
      "Sorry, this florist doesn't currently deliver to that address.",
    );
  }

  return {
    eligible: true,

    deliveryFee: zipEvaluation.deliveryFee,

    distanceMiles:
      typeof input.distanceMiles === "number" ? input.distanceMiles : null,

    requestedDate,

    sameDay,
  };
}
