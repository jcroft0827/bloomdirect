// app/api/shops/me/public/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function PATCH() {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await Shop.findById(session.user.id);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "This account is currently suspended.",
          code: "SHOP_SUSPENDED",
        },
        { status: 403 },
      );
    }

    shop.isPublic = true;
    await shop.save();

    return NextResponse.json({
      success: true,
      message: "Profile is now public.",
      shop: {
        _id: shop._id,
        businessName: shop.businessName,
        isPublic: shop.isPublic,
      },
    });
  } catch (err) {
    console.error("Failed to update public profile:", err);

    return NextResponse.json(
      { error: "Failed to update public profile" },
      { status: 500 },
    );
  }
}
