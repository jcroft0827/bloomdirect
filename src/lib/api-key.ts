// lib/api-key.ts
import crypto from "crypto";

const API_KEY_PEPPER = process.env.API_KEY_PEPPER || "";

if (!API_KEY_PEPPER) {
  throw new Error("Missing API_KEY_PEPPER environment variable.");
}

export function generateRawApiKey() {
  const publicId = crypto.randomBytes(3).toString("hex"); // 6 chars
  const secret = crypto.randomBytes(24).toString("hex"); // 48 chars

  const apiKey = `gbd_live_${publicId}.${secret}`;
  const keyPrefix = `gbd_live_${publicId}.`;
  const keyLastFour = secret.slice(-4);
  const keyHash = hashApiKey(apiKey);

  return {
    apiKey,
    keyPrefix,
    keyLastFour,
    keyHash,
  };
}

export function hashApiKey(rawApiKey: string) {
  return crypto
    .createHmac("sha256", API_KEY_PEPPER)
    .update(rawApiKey)
    .digest("hex");
}