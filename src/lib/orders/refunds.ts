import type {
  OrderRefund,
  OrderRefundStatus,
} from "@/types/order";

type RefundLike = Pick<
  OrderRefund,
  "amountCents" | "status"
>;

type RefundSummaryParams = {
  orderTotalCents: number;
  refunds?: RefundLike[];
};

export type RefundSummary = {
  activeRefunds: RefundLike[];
  totalRefundedCents: number;
  remainingRefundableCents: number;
  refundStatus: OrderRefundStatus;
};

export function getRefundSummary({
  orderTotalCents,
  refunds = [],
}: RefundSummaryParams): RefundSummary {
  const safeOrderTotalCents = Math.max(
    0,
    Math.round(orderTotalCents),
  );

  const activeRefunds = refunds.filter(
    (refund) => refund.status === "active",
  );

  const totalRefundedCents = activeRefunds.reduce(
    (total, refund) =>
      total + Math.max(0, Math.round(refund.amountCents)),
    0,
  );

  const remainingRefundableCents = Math.max(
    0,
    safeOrderTotalCents - totalRefundedCents,
  );

  let refundStatus: OrderRefundStatus = "none";

  if (totalRefundedCents > 0) {
    refundStatus =
      totalRefundedCents >= safeOrderTotalCents
        ? "full"
        : "partial";
  }

  return {
    activeRefunds,
    totalRefundedCents,
    remainingRefundableCents,
    refundStatus,
  };
}

export function assertValidRefundAmount({
  amountCents,
  remainingRefundableCents,
}: {
  amountCents: number;
  remainingRefundableCents: number;
}) {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new Error(
      "Refund amount must be a positive whole number of cents.",
    );
  }

  if (amountCents > remainingRefundableCents) {
    throw new Error(
      "Refund amount cannot exceed the remaining refundable amount.",
    );
  }
}