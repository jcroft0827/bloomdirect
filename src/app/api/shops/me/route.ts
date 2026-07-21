// api/shops/me/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import { getShopReadiness } from "@/lib/shops/getShopReadiness";

export async function GET() {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const shop = await getAuthenticatedShop(session.user.id);

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 },
      );
    }

    const shopData = shop.toObject();
    const readiness = getShopReadiness(shopData);

    return NextResponse.json({
      shop: shopData,
      readiness,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Server error" },
      { status: 500 },
    );
  }
}