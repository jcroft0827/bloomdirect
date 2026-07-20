// lib/api-response.ts

import type { ApiErrorCode } from "./api-error";

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
