/**
 * Commerce C2B — coupon financial snapshot contract.
 * Pure validation; no payment changes or redemption side effects.
 * Snapshots must be created from server-authoritative preflight, coupon
 * evaluation, tax calculation and processor amount — NEVER from browser totals.
 */
export type CouponPaymentSnapshotInput = {
  couponId: string;
  code: string;
  merchandiseSubtotalCents: number;
  merchandiseDiscountCents: number;
  fulfillmentFeeCents: number;
  tipCents: number;
  taxAmountCents: number;
  chargedTotalCents: number;
  checkoutAttemptId: string;
};

export type CouponPaymentSnapshot = Readonly<{
  version: 1;
  couponId: string;
  code: string;
  checkoutAttemptId: string;
  originalMerchandiseCents: number;
  discountCents: number;
  discountedMerchandiseCents: number;
  fulfillmentFeeCents: number;
  tipCents: number;
  taxAmountCents: number;
  chargedTotalCents: number;
}>;

const MAX_AMOUNT = 100_000_000_000;
function amount(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value < 0 || value > MAX_AMOUNT) {
    throw new RangeError(`${field} must be a non-negative safe integer in cents.`);
  }
  return value;
}
function identifier(value: string, field: string) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 200) {
    throw new TypeError(`${field} is required.`);
  }
  return value.trim();
}

export function buildCouponPaymentSnapshot(input: CouponPaymentSnapshotInput): CouponPaymentSnapshot {
  const original = amount(input.merchandiseSubtotalCents, 'merchandiseSubtotalCents');
  const discount = amount(input.merchandiseDiscountCents, 'merchandiseDiscountCents');
  const fulfillment = amount(input.fulfillmentFeeCents, 'fulfillmentFeeCents');
  const tip = amount(input.tipCents, 'tipCents');
  const tax = amount(input.taxAmountCents, 'taxAmountCents');
  const charged = amount(input.chargedTotalCents, 'chargedTotalCents');
  if (discount > original) throw new RangeError('Coupon discount exceeds merchandise subtotal.');
  const discounted = original - discount;
  const expected = discounted + fulfillment + tip + tax;
  if (!Number.isSafeInteger(expected) || expected !== charged) {
    throw new RangeError('Coupon checkout total does not reconcile to processor charge.');
  }
  const code = identifier(input.code, 'code').toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(code)) throw new TypeError('Invalid coupon code.');
  return Object.freeze({
    version: 1 as const,
    couponId: identifier(input.couponId, 'couponId'),
    code,
    checkoutAttemptId: identifier(input.checkoutAttemptId, 'checkoutAttemptId'),
    originalMerchandiseCents: original,
    discountCents: discount,
    discountedMerchandiseCents: discounted,
    fulfillmentFeeCents: fulfillment,
    tipCents: tip,
    taxAmountCents: tax,
    chargedTotalCents: charged,
  });
}
