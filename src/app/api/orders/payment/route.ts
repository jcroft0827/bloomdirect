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
import { sendOrderEvent } from "@/lib/send-order-event";
import { PAYMENT_METHODS, PaymentMethod } from "@/lib/order-payment-methods";

export async function POST(req: Request) {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, paymentMethodUsed } = await req.json();

    if (!orderId || !paymentMethodUsed) {
      return NextResponse.json(
        { error: "Missing orderId or paymentMethodUsed" },
        { status: 400 },
      );
    }

    if (!PAYMENT_METHODS.includes(paymentMethodUsed)) {
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

    const paymentValue = order.paymentMethods?.[paymentMethodUsed as PaymentMethod];

    if (typeof paymentValue !== "string" || paymentValue.trim() === "") {
      return NextResponse.json(
        { error: "That payment method is not available for this order" },
        { status: 400 },
      );
    }

    if (order.status !== OrderStatus.ACCEPTED_AWAITING_PAYMENT) {
      return NextResponse.json(
        { error: "Order is not eligible to be marked as paid" },
        { status: 400 },
      );
    }
    
    // ─────────────────────────────────────────────
    // STATUS TRANSITION GUARD
    // ─────────────────────────────────────────────
    assertOrderTransition({
      order,
      nextStatus: OrderStatus.PAID_AWAITING_FULFILLMENT,
      actorShopId: session.user.id,
    });

    const now = new Date();

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        originatingShop: session.user.id,
        status: OrderStatus.ACCEPTED_AWAITING_PAYMENT,
      },
      {
        $set: {
          status: OrderStatus.PAID_AWAITING_FULFILLMENT,
          paymentMethodUsed,
          paidAt: now,
        },
      },
      { new: true }
    );

    if (!updatedOrder) {
      return NextResponse.json(
        {
          error: "Order could not be marked as paid. It may have already been updated.",
        },
        { status: 409 },
      );
    }
    
    // Activity Log
    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.PAYMENT_MARKED,
      actorShopId: session.user.id,
      message: `Payment marked as received via ${paymentMethodUsed.toUpperCase()}`,
    });
    
    await sendOrderEvent({
      event: "order.paid",
      order,
      actorShopId: session?.user?.id,
    });


    const originShop = await Shop.findById(order.originatingShop);
    const fulfillShop = await Shop.findById(order.fulfillingShop);
    
    
    if (originShop?.email && fulfillShop?.email) {
      const resend = getResend();
      await resend.emails.send({
        from: "GetBloomDirect <new-orders@getbloomdirect.com>",
        to: fulfillShop.email,
        subject:
          getOrderEmailSubject(order.orderNumber, order.status) +
          ` - Ready to Fulfill`,
        html: `
          <p>Order #${order.orderNumber} has been marked as paid by ${
            originShop.businessName
          } via ${paymentMethodUsed.toUpperCase()}.</p>
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
        error:
          "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
