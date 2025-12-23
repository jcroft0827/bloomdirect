// app/api/orders/incoming/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderStatus } from "@/lib/order-status";

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orders = await Order.find({
      fulfillingShop: session.user.id,
      status: {
        $in: [
          OrderStatus.PENDING_ACCEPTANCE,
          OrderStatus.ACCEPTED_AWAITING_PAYMENT,
          OrderStatus.PAID_AWAITING_FULFILLMENT,
        ],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders });
  } catch (error: any) {
    console.error("INCOMING ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
