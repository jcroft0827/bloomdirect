/** Read only the coupon financial snapshot recorded on the paid order. */
export function getOrderCouponSummary(order: any): { code: string; discountCents: number } | null {
  const coupon = order?.couponSnapshot;
  if (coupon?.version !== 1 || typeof coupon.code !== "string" ||
    !/^[A-Z0-9][A-Z0-9_-]{0,39}$/.test(coupon.code) ||
    !Number.isSafeInteger(coupon.discountCents) || coupon.discountCents <= 0 ||
    !Number.isSafeInteger(order?.totals?.subtotalCents) ||
    coupon.discountCents > order.totals.subtotalCents) return null;
  return { code: coupon.code, discountCents: coupon.discountCents };
}
