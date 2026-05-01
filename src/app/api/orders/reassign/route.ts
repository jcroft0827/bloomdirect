// api/orders/reassign/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import { OrderStatus } from "@/lib/order-status";
import { getResend } from "@/lib/resend";
import { getOrderEmailSubject } from "@/lib/order-email-subject";
import { addOrderActivity, OrderActivityActions } from "@/lib/order-activity";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { ApiError } from "@/lib/api-error";
import { sendOrderEvent } from "@/lib/send-order-event";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, newFulfillingShopId } = await req.json();

    if (!orderId || !newFulfillingShopId) {
      return NextResponse.json(
        { error: "Missing orderId or newFulfillingShopId" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Only originating shop can reassign
    if (order.originatingShop.toString() !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Must be declined first
    if (order.status !== OrderStatus.DECLINED) {
      return NextResponse.json(
        { error: "Only declined orders can be reassigned" },
        { status: 400 },
      );
    }

    // Prevent reassigning to same shop
    if (order.fulfillingShop.toString() === newFulfillingShopId) {
      return NextResponse.json(
        { error: "Order is already assigned to this shop" },
        { status: 400 },
      );
    }

    const newShop = await Shop.findById(newFulfillingShopId);
    if (!newShop) {
      return NextResponse.json(
        { error: "Fulfilling shop not found" },
        { status: 404 },
      );
    }

    if (!newShop.onboardingComplete) {
      return NextResponse.json(
        { error: "Selected shop is not ready to receive orders" },
        { status: 400 },
      );
    }

    assertOrderTransition({
      order,
      nextStatus: OrderStatus.PENDING_ACCEPTANCE,
      actorShopId: session.user.id,
    });

    const updatedOrder = await Order.findOneAndUpdate(
      {
        _id: orderId,
        originatingShop: session.user.id,
        status: OrderStatus.DECLINED,
      },
      {
        $set: {
          fulfillingShop: newShop._id,
          fulfillingShopName: newShop.businessName,
          paymentMethods: {
            venmo: newShop.paymentMethods?.venmo || "",
            cashapp: newShop.paymentMethods?.cashapp || "",
            zelle: newShop.paymentMethods?.zelle || "",
            paypal: newShop.paymentMethods?.paypal || "",
            default: newShop.paymentMethods?.default || "venmo",
          },

          status: OrderStatus.PENDING_ACCEPTANCE,

          acceptedAt: undefined,
          declinedAt: undefined,
          completedAt: undefined,
          paidAt: undefined,
          paymentMarkedPaidAt: undefined,
          paymentMethodUsed: undefined,

          declineReason: undefined,
          declineMessage: undefined,
        },
        $inc: {
          reassignCount: 1,
        },
      },
      { new: true },
    );

    if (!updatedOrder) {
      return NextResponse.json(
        {
          error:
            "Order could not be reassigned. It may have already been updated.",
        },
        { status: 409 },
      );
    }

    // Activity Log
    await addOrderActivity({
      orderId: updatedOrder._id,
      action: OrderActivityActions.ORDER_REASSIGNED,
      actorShopId: session.user.id,
      message: `Order reassigned to ${newShop.businessName}`,
    });

    await sendOrderEvent({
      event: "order.reassigned",
      order: updatedOrder,
      actorShopId: session?.user?.id,
    });

    /**
     * EMAIL NEW SHOP
     */
    if (newShop.email) {
      const resend = getResend();

      await resend.emails.send({
        from: "GetBloomDirect <new-orders@getbloomdirect.com>",
        to: newShop.email,
        subject: getOrderEmailSubject(updatedOrder.orderNumber, updatedOrder.status),
        html: `
          <p>You have received a new order on <strong>GetBloomDirect</strong>.</p>
          <p><strong>Order #:</strong> ${updatedOrder.orderNumber}</p>
          <p>Please log in to review and accept the order.</p>
        `,
      });
    }

    return NextResponse.json({ success: true, updatedOrder });
  } catch (error: any) {
    console.error("REASSIGN ERROR:", error);

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
