// app/api/shops/api-access/generate/route.ts
import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/get-current-shop";
import { generateRawApiKey } from "@/lib/api-key";

export async function POST() {
  try {
    const shop = await getCurrentShop();

    if (!shop.isPro) {
      return NextResponse.json(
        { error: "Only pro shops can generate API keys." },
        { status: 403 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "Suspended shops cannot manage API access." },
        { status: 403 },
      );
    }

    if (shop.apiAccess?.keyCreatedAt) {
      return NextResponse.json(
        { error: "API key already exists. Please rotate it instead." },
        { status: 400 },
      );
    }

    const { apiKey, keyPrefix, keyLastFour, keyHash } = generateRawApiKey();

    shop.apiAccess = {
      ...shop.apiAccess,
      enabled: true,
      keyPrefix,
      keyHash,
      keyLastFour,
      keyCreatedAt: new Date(),
      keyRotatedAt: null,
      keyDisabledAt: null,
      lastUsedAt: null,
      lastUsedIp: null,
      lastUsedUserAgent: null,
      lastKeyPreviewShownAt: new Date(),
      createdByShopId: shop._id,
      rotatedByShopId: null,
    };

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
    console.error("Generate API key error:", error);

    return NextResponse.json(
      { error: "Failed to generate API key." },
      { status: 500 },
    );
  }
}