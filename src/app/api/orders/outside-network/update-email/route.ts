import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, email } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 },
      );
    }

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "A valid email address is required." },
        { status: 400 },
      );
    }

    await connectToDB();

    const order = await Order.findById(orderId).select(
      "originatingShop fulfillmentType outsideFlorist",
    );

    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    if (order.fulfillmentType !== "outside_network") {
      return NextResponse.json(
        { error: "Only outside-network orders can update outside florist email." },
        { status: 400 },
      );
    }

    if (order.originatingShop.toString() !== session.user.id) {
      return NextResponse.json(
        { error: "You are not allowed to update this order." },
        { status: 403 },
      );
    }

    order.outsideFlorist = {
      ...(order.outsideFlorist?.toObject?.() || order.outsideFlorist || {}),
      email: email.trim().toLowerCase(),
    };

    await order.save();

    return NextResponse.json({
      success: true,
      email: order.outsideFlorist.email,
    });
  } catch (error: any) {
    console.error("UPDATE OUTSIDE NETWORK EMAIL ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Failed to update outside florist email." },
      { status: 500 },
    );
  }
}