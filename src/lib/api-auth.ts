// lib/api-auth.ts
import Shop from "@/models/Shop";
import { connectToDB } from "@/lib/mongoose";
import { apiError } from "./api-response";
import { hashApiKey } from "./api-key";

export async function getShopFromApiKey(req: Request) {
  await connectToDB();

  // ===============================
  // EXTRACT API KEY
  // ===============================

  const authHeader = req.headers.get("authorization");
  const apiKeyHeader = req.headers.get("x-api-key");

  let rawApiKey = "";

  if (authHeader?.startsWith("Bearer ")) {
    rawApiKey = authHeader.replace("Bearer ", "").trim();
  } else if (apiKeyHeader) {
    rawApiKey = apiKeyHeader.trim();
  }

  if (!rawApiKey) {
    throw apiError("MISSING_API_KEY", "Your API key is missing!", 401);
  }

  // ===============================
  // HASH + LOOKUP
  // ===============================

  const keyHash = hashApiKey(rawApiKey);

  const shop = await Shop.findOne({
    "apiAccess.keyHash": keyHash,
    "apiAccess.enabled": true,
  }).select("+apiAccess.keyHash");

  if (!shop) {
    throw apiError(
      "INVALID_API_KEY",
      "You are trying to use an invalid API key",
      401,
    );
  }

  // ===============================
  // PAYWALL + ACCOUNT STATUS
  // ===============================

  if (!shop.isPro) {
    throw apiError(
      "PRO_REQUIRED",
      "This feature requires an active Pro subscription",
      403,
    );
  }

  if (shop.isSuspended) {
    throw apiError("ACCOUNT_SUSPENDED", "Account suspended", 403);
  }

  // ===============================
  // TRACK USAGE (IMPORTANT)
  // ===============================

  const now = new Date();

  const lastUsedAt = shop.apiAccess?.lastUsedAt
    ? new Date(shop.apiAccess.lastUsedAt)
    : null;

  const shouldUpdateUsage = 
    !lastUsedAt ||
    now.getTime() - lastUsedAt.getTime() >= 5 * 60 * 1000;

  if (shouldUpdateUsage) {
    try {
      await Shop.updateOne(
        { _id: shop._id },
        {
          $set: {
            "apiAccess.lastUsedAt": now,
            "apiAccess.lastUsedIp":
              req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
            "apiAccess.lastUsedUserAgent":
              req.headers.get("user-agent") || null,
          },
        },
      );

      shop.apiAccess.lastUsedAt = now;
    } catch (err) {
      console.error("Failed to update API usage metadata", err);
    }
  }

  return shop;
}