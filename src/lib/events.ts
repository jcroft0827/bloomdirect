// lib/events.ts

export const Events = {
  ORDER_CREATED: "order.created",
  ORDER_ACCEPTED: "order.accepted",
  ORDER_DECLINED: "order.declined",
  ORDER_PAID: "order.paid",
  ORDER_COMPLETED: "order.completed",
  ORDER_REASSIGNED: "order.reassigned",
} as const;

export type EventType = typeof Events[keyof typeof Events];