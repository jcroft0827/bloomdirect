/**
 * Pure, deterministic coupon eligibility calculation.
 * No client-supplied amount from this function is authoritative for payment.
 * Commerce C2B payment integration must recalculate using server-side preflight.
 */
export type CouponDiscountType = "percentage" | "fixed";

export type CouponDefinition = {
  code: string;
  discountType: CouponDiscountType;
  /** Percentage basis points (10_000 = 100%), or fixed cents. */
  amount: number;
  minimumMerchandiseCents: number;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  usageLimit?: number | null;
  redemptionCount: number;
  isActive: boolean;
};

export type CouponEvaluation =
  | { ok: true; code: string; discountCents: number; merchandiseAfterDiscountCents: number }
  | { ok: false; reason: "INVALID_CODE" | "INACTIVE" | "NOT_STARTED" | "EXPIRED" | "USAGE_LIMIT" | "MINIMUM_NOT_MET" | "INVALID_CONFIGURATION" };

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

export function normalizeCouponCode(input: string): string | null {
  const value = input.trim().toUpperCase();
  return CODE_PATTERN.test(value) ? value : null;
}

function validCents(value: number) {
  return Number.isSafeInteger(value) && value >= 0;
}

function validDate(value: Date | string | null | undefined): number | null | undefined {
  if (value === null || value === undefined || value === "") return null;
  const timestamp = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}

export function evaluateCoupon(input: {
  coupon: CouponDefinition;
  code: string;
  merchandiseSubtotalCents: number;
  now?: Date;
}): CouponEvaluation {
  const { coupon, merchandiseSubtotalCents } = input;
  const code = normalizeCouponCode(input.code);
  if (!code || code !== normalizeCouponCode(coupon.code)) return { ok: false, reason: "INVALID_CODE" };
  const startsAt = validDate(coupon.startsAt);
  const expiresAt = validDate(coupon.expiresAt);
  if (
    !validCents(merchandiseSubtotalCents) ||
    !validCents(coupon.minimumMerchandiseCents) ||
    !validCents(coupon.redemptionCount) ||
    !Number.isSafeInteger(coupon.amount) || coupon.amount < 1 ||
    (coupon.discountType !== "fixed" && coupon.discountType !== "percentage") ||
    (coupon.discountType === "percentage" && coupon.amount > 10000) ||
    (coupon.discountType === "fixed" && !validCents(coupon.amount)) ||
    startsAt === undefined || expiresAt === undefined ||
    (coupon.usageLimit != null && (!Number.isSafeInteger(coupon.usageLimit) || coupon.usageLimit < 1))
  ) return { ok: false, reason: "INVALID_CONFIGURATION" };
  if (!coupon.isActive) return { ok: false, reason: "INACTIVE" };
  const now = (input.now ?? new Date()).getTime();
  if (startsAt !== null && now < startsAt) return { ok: false, reason: "NOT_STARTED" };
  // Coupon management stores date-only expiry as UTC midnight. Treat that whole
  // calendar date as valid, matching the florist's displayed end date.
  if (expiresAt !== null) {
    const expiryDate = new Date(expiresAt);
    const isDateOnly = expiryDate.getUTCHours() === 0 && expiryDate.getUTCMinutes() === 0 && expiryDate.getUTCSeconds() === 0 && expiryDate.getUTCMilliseconds() === 0;
    const expiryExclusive = expiresAt + (isDateOnly ? 86400000 : 0);
    if (now >= expiryExclusive) return { ok: false, reason: "EXPIRED" };
  }
  if (coupon.usageLimit != null && coupon.redemptionCount >= coupon.usageLimit) {
    return { ok: false, reason: "USAGE_LIMIT" };
  }
  if (merchandiseSubtotalCents < coupon.minimumMerchandiseCents) {
    return { ok: false, reason: "MINIMUM_NOT_MET" };
  }
  const discountCents = Math.min(
    merchandiseSubtotalCents,
    coupon.discountType === "fixed"
      ? coupon.amount
      : Math.round((merchandiseSubtotalCents * coupon.amount) / 10000),
  );
  return {
    ok: true,
    code,
    discountCents,
    merchandiseAfterDiscountCents: merchandiseSubtotalCents - discountCents,
  };
}
