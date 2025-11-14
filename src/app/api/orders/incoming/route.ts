// src/app/api/orders/incoming/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  console.log("INCOMING ORDERS API HIT");

  try {
    console.log("Connecting to DB...");
    await connectToDB();
    console.log("DB connected");

    const session = await getServerSession(authOptions);
    console.log("SESSION:", session);

    if (!session?.user?.shopId) {
      console.log("No session or shopId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Fetching orders for shopId:", session.user.shopId);
    const orders = await Order.find({ fulfillingShop: session.user.shopId })
      .populate("originatingShop", "shopName city state")
      .sort({ createdAt: -1 })
      .lean();

    console.log("Orders found:", orders.length);
    return NextResponse.json({ orders: orders || [] });
  } catch (error: any) {
    console.error("INCOMING ORDERS ERROR:", error);
    return NextResponse.json(
      { error: "Server error", details: error.message },
      { status: 500 }
    );
  }
}