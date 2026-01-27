export const API_ERROR_MESSAGES = {
  // Auth / permissions
  UNAUTHORIZED: "You must be logged in to do that.",
  FORBIDDEN: "You don’t have permission to perform this action.",

  // Validation
  INVALID_INPUT: "Some required information is missing or invalid.",
  INVALID_STATUS: "This action is not allowed for the current order status.",
  INVALID_TRANSITION: "This order can’t move to that status.",

  // Orders
  ORDER_NOT_FOUND: "We couldn’t find that order.",
  ORDER_ALREADY_ASSIGNED: "This order is already assigned to that shop.",
  ORDER_NOT_DECLINED: "Only declined orders can be reassigned.",

  // Payments
  INVALID_PAYMENT_METHOD: "Invalid payment method selected.",
  PAYMENT_NOT_ALLOWED: "This order cannot be marked as paid.",

  // Generic
  SERVER_ERROR: "Something went wrong. Please try again.",
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_MESSAGES;
