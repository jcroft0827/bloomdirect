// /lib/order-status.ts
// Responsibility: Defines the canonical lifecycle statuses used by orders.

export enum OrderStatus {
  PENDING_ACCEPTANCE = "PENDING_ACCEPTANCE",

  /**
   * Active order that has been accepted by the fulfilling florist
   * and is awaiting fulfillment.
   */
  ACCEPTED = "ACCEPTED",

  /**
   * Legacy payment-based statuses.
   * Keep temporarily while existing routes, UI, reports, and stored orders
   * are migrated to the simplified lifecycle.
   */
  ACCEPTED_AWAITING_PAYMENT = "ACCEPTED_AWAITING_PAYMENT",
  PAID_AWAITING_FULFILLMENT = "PAID_AWAITING_FULFILLMENT",
  
  COMPLETED = "COMPLETED",
  DECLINED = "DECLINED",
  OUTSIDE_NETWORK = "OUTSIDE_NETWORK",
};

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_ACCEPTANCE]: "Pending Acceptance",
  [OrderStatus.ACCEPTED]: "Accepted",
  [OrderStatus.ACCEPTED_AWAITING_PAYMENT]:
    "Accepted — Awaiting Payment (Legacy)",
  [OrderStatus.PAID_AWAITING_FULFILLMENT]:
    "Paid — In Production (Legacy)",
  [OrderStatus.COMPLETED]: "Completed",
  [OrderStatus.DECLINED]: "Declined",
  [OrderStatus.OUTSIDE_NETWORK]: "Outside Network",
};

const ORDER_STATUS_BADGE_CLASSES: Record<OrderStatus, string> = {
  [OrderStatus.PENDING_ACCEPTANCE]:
    "bg-yellow-100 text-yellow-800",

  [OrderStatus.ACCEPTED]:
    "bg-blue-100 text-blue-800",

  [OrderStatus.ACCEPTED_AWAITING_PAYMENT]:
    "bg-blue-100 text-blue-800",

  [OrderStatus.PAID_AWAITING_FULFILLMENT]:
    "bg-purple-100 text-purple-800",

  [OrderStatus.COMPLETED]:
    "bg-emerald-100 text-emerald-800",

  [OrderStatus.DECLINED]:
    "bg-red-100 text-red-700",

  [OrderStatus.OUTSIDE_NETWORK]:
    "bg-slate-100 text-slate-700",
};

export function getOrderStatusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

export function getOrderStatusBadgeClass(status: OrderStatus): string {
  return ORDER_STATUS_BADGE_CLASSES[status];
}