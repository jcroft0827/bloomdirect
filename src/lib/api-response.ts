// lib/api-response.ts

type ApiErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_API_KEY"
  | "MISSING_API_KEY"
  | "PRO_REQUIRED"
  | "ACCOUNT_SUSPENDED"
  | "ORDER_NOT_FOUND"
  | "INVALID_REQUEST"
  | "MISSING_FIELDS"
  | "READ_ONLY_MODE"
  | "MISSING_DECLINE_REASON"
  | "MISSING_DECLINE_MESSAGE"
  | "INVALID_PAYMENT_METHOD"
  | "PAYMENT_METHOD_NOT_AVAILABLE"
  | "FORBIDDEN";

const API_VERSION = "1.0";

export function apiSuccess(data: any, status = 200) {
  return Response.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: API_VERSION,
      },
    },
    {
      status,
      headers: {
        "x-api-version": API_VERSION,
      },
    },
  );
}

export function apiError(code: ApiErrorCode, message: string, status = 400) {
  return Response.json(
    {
      success: false,
      error: {
        code,
        message,
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: API_VERSION,
      },
    },
    {
      status,
      headers: {
        "x-api-version": API_VERSION,
      },
    },
  );
}
