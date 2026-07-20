export const OrderActivityActions = {
  ORDER_CREATED: "ORDER_CREATED",
  ORDER_ACCEPTED: "ORDER_ACCEPTED",
  ORDER_DECLINED: "ORDER_DECLINED",
  PAYMENT_MARKED: "PAYMENT_MARKED",
  ORDER_REASSIGNED: "ORDER_REASSIGNED",
  ORDER_COMPLETED: "ORDER_COMPLETED",
  REVIEW_SUBMITTED: "REVIEW_SUBMITTED",
} as const;

export type OrderActivityAction =
  (typeof OrderActivityActions)[keyof typeof OrderActivityActions];