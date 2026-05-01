// lib/webhook-sign.ts
import crypto from "crypto";

export function signPayload(payload: any, secret: string) {
  return crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");
}