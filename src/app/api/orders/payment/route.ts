// app/api/orders/payment/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { OrderStatus } from "@/lib/order-status";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import Shop from "@/models/Shop";
import { getOrderEmailSubject } from "@/lib/order-email-subject";
import { addOrderActivity, OrderActivityActions } from "@/lib/order-activity";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { ApiError } from "@/lib/api-error";

export async function POST(req: Request) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, paymentMethod } = await req.json();
    if (!["venmo", "cashapp", "zelle", "other"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.originatingShop.toString() !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // ─────────────────────────────────────────────
    // STATUS TRANSITION GUARD
    // ─────────────────────────────────────────────
    assertOrderTransition({
      order,
      nextStatus: OrderStatus.PAID_AWAITING_FULFILLMENT,
      actorShopId: session.user.id,
    });

    // Update order
    order.status = OrderStatus.PAID_AWAITING_FULFILLMENT;
    order.paymentMethod = paymentMethod;
    order.paymentMarkedPaidAt = new Date();
    order.paidAt = new Date();

    await order.save();

    // Activity Log
    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.PAYMENT_MARKED,
      actorShopId: session.user.id,
      message: `Payment marked as received via ${paymentMethod.toUpperCase()}`,
    });

    // Send email notification to fulfilling shop
    const originShop = await Shop.findById(order.originatingShop);
    const fulfillShop = await Shop.findById(order.fulfillingShop);
    const resend = getResend();

    if (originShop?.email && fulfillShop?.email) {
      await resend.emails.send({
        from: "BloomDirect <new-orders@getbloomdirect.com>",
        to: fulfillShop.email,
        subject:
          getOrderEmailSubject(order.orderNumber, order.status) +
          ` - Ready to Fulfill`,
        html: `
          <p>Order #${order.orderNumber} has been marked as paid by ${
            originShop.shopName
          } via ${paymentMethod.toUpperCase()}.</p>
          <p>Start preparing the order and mark it as fulfilled once done.</p>
        `,
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
      console.error("PAYMENT ERROR:", error);
  
      if (error instanceof ApiError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status },
        );
      }
  
      return NextResponse.json(
        {
          error: "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
          code: "SERVER_ERROR",
        },
        { status: 500 },
      );
    }
}
