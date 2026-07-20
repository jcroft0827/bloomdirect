// src/lib/api-error.ts

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "INVALID_TRANSITION"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "SERVER_ERROR"
  | "ORDER_NOT_PAID"
  | "INVALID_API_KEY"
  | "MISSING_API_KEY"
  | "PRO_REQUIRED"
  | "ACCOUNT_SUSPENDED"
  | "ORDER_NOT_FOUND"
  | "INVALID_REQUEST"
  | "MISSING_FIELDS"
  | "MISSING_DECLINE_REASON"
  | "MISSING_DECLINE_MESSAGE"
  | "INVALID_PAYMENT_METHOD"
  | "PAYMENT_METHOD_NOT_AVAILABLE"
  | "INVALID_DECLINE_REASON"
  | "DECLINE_MESSAGE_TOO_LONG"
  | "RATE_LIMIT_EXCEEDED"
  | "NOT_IMPLEMENTED";


export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;

  constructor(code: ApiErrorCode, message: string, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
