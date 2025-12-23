// app/api/orders/payment/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { OrderStatus } from "@/lib/order-status";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import Shop from "@/models/Shop";

export async function POST(req: Request) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, paymentMethod } = await req.json();
    if (!["venmo", "cashapp", "zelle", "other"].includes(paymentMethod)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.originatingShop.toString() !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Only allow marking paid if status is ACCEPTED_AWAITING_PAYMENT
    if (order.status !== OrderStatus.ACCEPTED_AWAITING_PAYMENT) {
      return NextResponse.json({ error: "Cannot mark this order as paid", status: 400 });
    }

    // Update order
    order.status = OrderStatus.PAID_AWAITING_FULFILLMENT;
    order.paymentMethod = paymentMethod;
    order.paymentMarkedPaidAt = new Date();
    order.paidAt = new Date();
    await order.save();

    // Send email notification to fulfilling shop
    const originShop = await Shop.findById(order.originatingShop);
    const fulfillShop = await Shop.findById(order.fulfillingShop);
    const resend = getResend();

    if (originShop?.email && fulfillShop?.email) {
      await resend.emails.send({
        from: "BloomDirect <new-orders@getbloomdirect.com>",
        to: fulfillShop.email,
        subject: `Order ${order.orderNumber} Paid — Ready to Fulfill`,
        html: `
          <p>Order #${order.orderNumber} has been marked as paid by ${originShop.shopName} via ${paymentMethod.toUpperCase()}.</p>
          <p>Start preparing the order and mark it as fulfilled once done.</p>
        `,
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("PAYMENT ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
