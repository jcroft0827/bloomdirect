// app/api/shops/api-access/rotate/route.ts
import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/get-current-shop";
import { generateRawApiKey } from "@/lib/api-key";

export async function POST() {
  try {
    const shop = await getCurrentShop();

    if (!shop.isPro) {
      return NextResponse.json(
        { error: "Only pro shops can rotate API keys." },
        { status: 403 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "Suspended shops cannot manage API access." },
        { status: 403 },
      );
    }

    if (!shop.apiAccess?.keyCreatedAt) {
      return NextResponse.json(
        { error: "No API key exists yet. Please generate one first." },
        { status: 400 },
      );
    }

    const { apiKey, keyPrefix, keyLastFour, keyHash } = generateRawApiKey();

    shop.apiAccess.keyPrefix = keyPrefix;
    shop.apiAccess.keyHash = keyHash;
    shop.apiAccess.keyLastFour = keyLastFour;
    shop.apiAccess.enabled = true;
    shop.apiAccess.keyRotatedAt = new Date();
    shop.apiAccess.keyDisabledAt = null;
    shop.apiAccess.lastKeyPreviewShownAt = new Date();
    shop.apiAccess.rotatedByShopId = shop._id;

    await shop.save();

    return NextResponse.json({
      success: true,
      apiKey,
      apiAccess: {
        enabled: shop.apiAccess.enabled,
        keyPrefix: shop.apiAccess.keyPrefix,
        keyLastFour: shop.apiAccess.keyLastFour,
        keyCreatedAt: shop.apiAccess.keyCreatedAt,
        keyRotatedAt: shop.apiAccess.keyRotatedAt,
        keyDisabledAt: shop.apiAccess.keyDisabledAt,
        lastUsedAt: shop.apiAccess.lastUsedAt,
        lastUsedIp: shop.apiAccess.lastUsedIp,
        lastUsedUserAgent: shop.apiAccess.lastUsedUserAgent,
        lastKeyPreviewShownAt: shop.apiAccess.lastKeyPreviewShownAt,
        createdByShopId: shop.apiAccess.createdByShopId,
        rotatedByShopId: shop.apiAccess.rotatedByShopId,
      },
    });
  } catch (error) {
    console.error("Rotate API key error:", error);

    return NextResponse.json(
      { error: "Failed to rotate API key." },
      { status: 500 },
    );
  }
}