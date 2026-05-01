// app/api/shops/api-access/disable/route.ts
import { NextResponse } from "next/server";
import { getCurrentShop } from "@/lib/get-current-shop";

export async function POST() {
  try {
    const shop = await getCurrentShop();

    if (!shop.isPro) {
      return NextResponse.json(
        { error: "Only pro shops can disable API access." },
        { status: 403 },
      );
    }

    if (!shop.apiAccess?.keyCreatedAt) {
      return NextResponse.json(
        { error: "No API key exists to disable." },
        { status: 400 },
      );
    }

    shop.apiAccess.enabled = false;
    shop.apiAccess.keyDisabledAt = new Date();

    await shop.save();

    return NextResponse.json({
      success: true,
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
    console.error("Disable API access error:", error);

    return NextResponse.json(
      { error: "Failed to disable API access." },
      { status: 500 },
    );
  }
}