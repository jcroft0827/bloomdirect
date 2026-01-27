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

    /**
     * RESET ORDER STATE
     */
    order.fulfillingShop = newShop._id;
    order.fulfillingShopName = newShop.shopName;

    order.status = OrderStatus.PENDING_ACCEPTANCE;

    order.acceptedAt = undefined;
    order.declinedAt = undefined;
    order.completedAt = undefined;

    order.declineReason = undefined;
    order.declineMessage = undefined;

    order.reassignCount = (order.reassignCount || 0) + 1;

    // ─────────────────────────────────────────────
    // STATUS TRANSITION GUARD
    // ─────────────────────────────────────────────
    assertOrderTransition({
      order,
      nextStatus: OrderStatus.PENDING_ACCEPTANCE,
      actorShopId: session.user.id,
    });

    await order.save();

    // Activity Log
    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.ORDER_REASSIGNED,
      actorShopId: session.user.id,
      message: `Order reassigned to ${newShop.shopName}`,
    });

    /**
     * EMAIL NEW SHOP
     */
    if (newShop.email) {
      const resend = getResend();

      await resend.emails.send({
        from: "BloomDirect <new-orders@getbloomdirect.com>",
        to: newShop.email,
        subject: getOrderEmailSubject(order.orderNumber, order.status),
        html: `
          <p>You have received a new order on <strong>BloomDirect</strong>.</p>
          <p><strong>Order #:</strong> ${order.orderNumber}</p>
          <p>Please log in to review and accept the order.</p>
        `,
      });
    }

    return NextResponse.json({ success: true, order });
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
            error: "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
            code: "SERVER_ERROR",
          },
          { status: 500 },
        );
      }
}
