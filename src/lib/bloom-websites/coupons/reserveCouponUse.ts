import { isValidObjectId } from "mongoose";
import BloomWebsiteCoupon from "@/models/BloomWebsiteCoupon";

/**
 * One-document atomic reservation. Does NOT charge a card, count redemption,
 * or enable coupon payments. Caller must have revalidated coupon eligibility.
 *
 * Reservations have bounded lifetimes; expiry alone does not mean a processor
 * payment failed. Recovery MUST confirm provider state before releasing holds.
 */
export type CouponReservationResult = "reserved" | "already_reserved" | "unavailable";

const MAX_ACTIVE_HOLDS = 500;
const ATTEMPT_ID = /^[a-zA-Z0-9:_-]{8,160}$/;

export async function reserveCouponUse(input: {
  couponId: string;
  shopId: string;
  websiteId: string;
  attemptId: string;
  holdUntil: Date;
  now?: Date;
}): Promise<CouponReservationResult> {
  const { couponId, shopId, websiteId, attemptId, holdUntil } = input;
  const now = input.now ?? new Date();
  if (![couponId, shopId, websiteId].every(isValidObjectId) ||
      !ATTEMPT_ID.test(attemptId) ||
      !(holdUntil instanceof Date) || !Number.isFinite(holdUntil.getTime()) ||
      holdUntil.getTime() <= now.getTime() ||
      holdUntil.getTime() > now.getTime() + 24 * 60 * 60 * 1000) {
    throw new Error("Invalid coupon reservation identity or hold expiration.");
  }
  const scope = { _id: couponId, shop: shopId, website: websiteId };
  // Retried prepare calls must not consume another slot.
  const existing = await BloomWebsiteCoupon.exists({
    ...scope, "reservations.attemptId": attemptId,
  });
  if (existing) return "already_reserved";

  // For limited coupons, capacity accounts for both committed redemptions and
  // current reservations in the SAME atomic MongoDB update predicate.
  const capacity = {
    $expr: {
      $and: [
        { $lt: [{ $size: { $ifNull: ["$reservations", []] } }, MAX_ACTIVE_HOLDS] },
        { $or: [
          { $eq: ["$usageLimit", null] },
          { $lt: [
            { $add: ["$redemptionCount", { $size: { $ifNull: ["$reservations", []] } }] },
            "$usageLimit",
          ] },
        ] },
      ],
    },
  };
  const result = await BloomWebsiteCoupon.updateOne({
    ...scope,
    isActive: true,
    redeemedAttemptIds: { $ne: attemptId },
    "reservations.attemptId": { $ne: attemptId },
    $and: [capacity],
  }, {
    $push: { reservations: { attemptId, expiresAt: holdUntil } },
  });
  if (result.modifiedCount === 1) return "reserved";
  // Resolve a concurrency race where another request reserved this attempt.
  return (await BloomWebsiteCoupon.exists({
    ...scope, "reservations.attemptId": attemptId,
  })) ? "already_reserved" : "unavailable";
}

/**
 * Release is idempotent, and only removes a reservation for this attempt.
 * Only call after confirmed terminal failure/cancellation or recovery review.
 */
export async function releaseCouponUse(input: {
  couponId: string;
  shopId: string;
  websiteId: string;
  attemptId: string;
}): Promise<boolean> {
  const { couponId, shopId, websiteId, attemptId } = input;
  if (![couponId, shopId, websiteId].every(isValidObjectId) ||
      !ATTEMPT_ID.test(attemptId)) {
    throw new Error("Invalid coupon release identity.");
  }
  const result = await BloomWebsiteCoupon.updateOne({
    _id: couponId, shop: shopId, website: websiteId,
    "reservations.attemptId": attemptId,
  }, { $pull: { reservations: { attemptId } } });
  return result.modifiedCount === 1;
}

/**
 * Commit a confirmed paid attempt exactly once on the coupon document.
 * Never use for an unverified payment. A missing reservation is an error,
 * not permission to increment usage. Recovery can safely call this repeatedly.
 */
export async function commitCouponRedemption(input: {
  couponId: string;
  shopId: string;
  websiteId: string;
  attemptId: string;
}): Promise<"committed" | "already_committed"> {
  const { couponId, shopId, websiteId, attemptId } = input;
  if (![couponId, shopId, websiteId].every(isValidObjectId) ||
      !ATTEMPT_ID.test(attemptId)) {
    throw new Error("Invalid coupon redemption identity.");
  }
  const scope = { _id: couponId, shop: shopId, website: websiteId };
  const updated = await BloomWebsiteCoupon.updateOne({
    ...scope,
    "reservations.attemptId": attemptId,
    redeemedAttemptIds: { $ne: attemptId },
  }, {
    $pull: { reservations: { attemptId } },
    $addToSet: { redeemedAttemptIds: attemptId },
    $inc: { redemptionCount: 1 },
  });
  if (updated.modifiedCount === 1) return "committed";
  const prior = await BloomWebsiteCoupon.exists({
    ...scope, redeemedAttemptIds: attemptId,
  });
  if (prior) return "already_committed";
  throw new Error("Paid coupon checkout has no matching reservation; manual reconciliation required.");
}
