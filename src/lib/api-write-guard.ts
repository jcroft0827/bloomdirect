// lib/api-write-guard.ts
import { apiError } from "./api-response";

export function assertApiWriteAllowed(shop: any) {
  if (shop.isApiReadOnly) {
    throw apiError(
      "READ_ONLY_MODE",
      "This API key is currently in read-only mode",
      403,
    );
  }
}