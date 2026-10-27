/** Read-only triage. Never infer payment failure solely from hold expiry. */
export type CouponHoldFinding =
  | "active_payment_with_provider_id"
  | "ambiguous_payment_without_provider_id"
  | "eligible_for_review_after_failure"
  | "already_committed_needs_review"
  | "missing_checkout_attempt"
  | "mismatched_coupon_snapshot"
  | "validated_or_created_needs_review";

export function classifyCouponHold(input: {
  couponId: string;
  attempt?: {
    status?: string;
    couponSnapshot?: { couponId?: string } | null;
    providerPaymentId?: string | null;
  } | null;
}): CouponHoldFinding {
  const { attempt, couponId } = input;
  if (!attempt) return "missing_checkout_attempt";
  if (!attempt.couponSnapshot || String(attempt.couponSnapshot.couponId) !== couponId) {
    return "mismatched_coupon_snapshot";
  }
  if (attempt.status === "order_committed" || attempt.status === "payment_succeeded") {
    return "already_committed_needs_review";
  }
  if (attempt.status === "failed") return "eligible_for_review_after_failure";
  if (attempt.status === "payment_processing") {
    return attempt.providerPaymentId
      ? "active_payment_with_provider_id"
      : "ambiguous_payment_without_provider_id";
  }
  return "validated_or_created_needs_review";
}
