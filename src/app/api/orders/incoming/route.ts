// app/api/orders/incoming/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const orders = await Order.find({
      fulfillingShop: session.user.shopId,
      status: { $in: ["pending", "accepted"] },
    })
      .sort({ createdAt: -1 })
      .lean();

    console.log("INCOMING ORDERS RAW COUNT:", orders.length); // ← DEBUG

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("INCOMING ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}