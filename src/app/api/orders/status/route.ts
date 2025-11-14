// src/app/api/orders/status/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, status } = await req.json();

    if (!orderId || !["accepted", "declined"].includes(status)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.fulfillingShop.toString() !== session.user.shopId) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    order.status = status;
    await order.save();

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Status update error:", error);
    return NextResponse.json(
      { error: "Failed to update", details: error.message },
      { status: 500 }
    );
  }
}