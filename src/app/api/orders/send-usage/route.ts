// api/orders/send-usage/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getMonthlySendUsage } from "@/lib/order-send-usage";
import Shop from "@/models/Shop";

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

    const shop = await Shop.findById(session.user.id)
      .select("_id isPro isSuspended");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "This shop account is suspended." },
        { status: 403 },
      );
    }

    const usage = await getMonthlySendUsage({
      shopId: shop._id,
      isPro: Boolean(shop.isPro),
    });

    return NextResponse.json({
      usage: {
        isPro: usage.isPro,
        sentThisMonth: usage.sentThisMonth,
        limit: usage.limit,
        remaining: usage.remaining,
        allowed: usage.allowed,
        monthStart: usage.monthStart,
        nextMonthStart: usage.nextMonthStart,
      },
    });
  } catch (error) {
    console.error("SEND USAGE GET ERROR:", error);

    return NextResponse.json(
      { error: "Unable to load monthly order usage." },
      { status: 500 },
    );
  }
}