/**
 * -----------------------------------------------------------------------------
 * GetBloomDirect
 * -----------------------------------------------------------------------------
 * Shop Receiving Eligibility
 *
 * Purpose:
 * Determines whether a shop is eligible to receive an order from a specific
 * sending florist.
 *
 * This helper combines:
 *   • The shop's general account and setup readiness.
 *   • Archived and spam-account restrictions.
 *   • The sending florist's blocked-florist relationships.
 *
 * Why this exists:
 * GetBloomDirect directory search, manual florist selection, auto-selection,
 * order creation, reassignment, and the future POS API must all enforce the
 * same receiving rules.
 *
 * NOTE:
 * This helper handles account-level and relationship-level eligibility.
 * Delivery coverage, blackout dates, same-day cutoffs, and other order-specific
 * availability rules are evaluated separately.
 * -----------------------------------------------------------------------------
 */

import { getShopReadiness } from "./getShopReadiness";

export const SHOP_RECEIVING_INELIGIBILITY_REASONS = [
  "ACCOUNT_INCOMPLETE",
  "EMAIL_NOT_VERIFIED",
  "BUSINESS_INFORMATION_INCOMPLETE",
  "DELIVERY_NOT_CONFIGURED",
  "NO_PAYMENT_METHOD",
  "PROFILE_NOT_PUBLIC",
  "SHOP_SUSPENDED",
  "SHOP_ARCHIVED",
  "SHOP_MARKED_SPAM",
  "BLOCKED_BY_SENDER",
] as const;

export type ShopReceivingIneligibilityReason =
  (typeof SHOP_RECEIVING_INELIGIBILITY_REASONS)[number];

type ObjectIdLike =
  | string
  | {
      toString(): string;
    };

type BlockedFloristEntry = {
  shopId?: ObjectIdLike | null;
};

type ShopReceivingEligibilityInput = Parameters<
  typeof getShopReadiness
>[0] & {
  _id?: ObjectIdLike | null;
  isArchived?: boolean;
  isMarkedSpam?: boolean;
  blockedFlorists?: BlockedFloristEntry[] | null;
};

export type ShopReceivingEligibility = {
  eligible: boolean;
  reasons: ShopReceivingIneligibilityReason[];
};

function normalizeId(value?: ObjectIdLike | null): string | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.toString().trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function hasBlockedFlorist(
  blockedFlorists: BlockedFloristEntry[] | null | undefined,
  fulfillingShopId: ObjectIdLike | null | undefined,
): boolean {
  const normalizedFulfillingShopId = normalizeId(fulfillingShopId);

  if (!normalizedFulfillingShopId || !Array.isArray(blockedFlorists)) {
    return false;
  }

  return blockedFlorists.some(
    (entry) =>
      normalizeId(entry.shopId) === normalizedFulfillingShopId,
  );
}

export function getShopReceivingEligibility({
  receivingShop,
  sendingShop,
}: {
  receivingShop: ShopReceivingEligibilityInput;
  sendingShop?: Pick<
    ShopReceivingEligibilityInput,
    "_id" | "blockedFlorists"
  > | null;
}): ShopReceivingEligibility {
  const readiness = getShopReadiness(receivingShop);
  const reasons: ShopReceivingIneligibilityReason[] = [];

  if (receivingShop.isSuspended === true) {
    reasons.push("SHOP_SUSPENDED");
  }

  if (receivingShop.isArchived === true) {
    reasons.push("SHOP_ARCHIVED");
  }

  if (receivingShop.isMarkedSpam === true) {
    reasons.push("SHOP_MARKED_SPAM");
  }

  if (receivingShop.isPublic !== true) {
    reasons.push("PROFILE_NOT_PUBLIC");
  }

  if (!readiness.requirements.emailVerified) {
    reasons.push("EMAIL_NOT_VERIFIED");
  }

  if (!readiness.requirements.businessInfoComplete) {
    reasons.push("BUSINESS_INFORMATION_INCOMPLETE");
  }

  if (!readiness.requirements.deliveryConfigured) {
    reasons.push("DELIVERY_NOT_CONFIGURED");
  }

  if (!readiness.requirements.paymentConfigured) {
    reasons.push("NO_PAYMENT_METHOD");
  }

  if (!readiness.requirements.accountCreated) {
    reasons.push("ACCOUNT_INCOMPLETE");
  }

  if (
    hasBlockedFlorist(
      sendingShop?.blockedFlorists,
      receivingShop._id,
    )
  ) {
    reasons.push("BLOCKED_BY_SENDER");
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  };
}