// lib/order-email-subject.ts
import { OrderStatus } from "@/lib/order-status";

export function getOrderEmailSubject(
  orderNumber: number,
  status: OrderStatus
) {
  switch (status) {
    case OrderStatus.PENDING_ACCEPTANCE:
      return `Order #${orderNumber} — New Order`;
    case OrderStatus.ACCEPTED_AWAITING_PAYMENT:
      return `Order #${orderNumber} — Accepted`;
    case OrderStatus.PAID_AWAITING_FULFILLMENT:
      return `Order #${orderNumber} — Paid`;
    case OrderStatus.COMPLETED:
      return `Order #${orderNumber} — Completed`;
    case OrderStatus.DECLINED:
      return `Order #${orderNumber} — Declined`;
    default:
      return `Order #${orderNumber} — Update`;
  }
}
