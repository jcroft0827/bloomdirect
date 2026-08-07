// lib/order-email-subject.ts
import { OrderStatus } from "@/lib/order-status";

export function getOrderEmailSubject(
  orderNumber: number,
  status: OrderStatus,
): string {
  switch (status) {
    case OrderStatus.PENDING_ACCEPTANCE:
      return `Order #${orderNumber} — New Order`;

    case OrderStatus.ACCEPTED:
    case OrderStatus.ACCEPTED_AWAITING_PAYMENT:
      return `Order #${orderNumber} — Accepted`;

    case OrderStatus.PAID_AWAITING_FULFILLMENT:
      return `Order #${orderNumber} — Payment Recorded`;

    case OrderStatus.COMPLETED:
      return `Order #${orderNumber} — Completed`;

    case OrderStatus.DECLINED:
      return `Order #${orderNumber} — Declined`;

    case OrderStatus.OUTSIDE_NETWORK:
      return `Order #${orderNumber} — Outside Network`;

    default: {
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
    }
  }
}