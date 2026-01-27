// app/api/orders/status/route.ts

import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { OrderStatus } from "@/lib/order-status";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import Shop from "@/models/Shop";
import {
  addOrderActivity,
  OrderActivityActions,
} from "@/lib/order-activity";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { ApiError } from "@/lib/api-error";


export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { orderId, status, declineReason, declineMessage } = await req.json();

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────
    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId and status are required" },
        { status: 400 }
      );
    }

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const userShopId = session.user.id;

    // ─────────────────────────────────────────────
    // PERMISSIONS
    // Only fulfilling shop can:
    // - accept
    // - decline
    // - complete
    // ─────────────────────────────────────────────
    const fulfillingActions = [
      OrderStatus.ACCEPTED_AWAITING_PAYMENT,
      OrderStatus.DECLINED,
      OrderStatus.COMPLETED,
    ];

    if (
      fulfillingActions.includes(status) &&
      order.fulfillingShop.toString() !== userShopId
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // ─────────────────────────────────────────────
    // DECLINE RULES (REQUIRED REASON)
    // ─────────────────────────────────────────────
    if (status === OrderStatus.DECLINED) {
      if (!declineReason) {
        return NextResponse.json(
          { error: "Decline reason is required" },
          { status: 400 }
        );
      }

      if (
        declineReason === "OTHER" &&
        (!declineMessage || declineMessage.trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "Decline message is required when reason is OTHER" },
          { status: 400 }
        );
      }

      order.declineReason = declineReason;
      order.declineMessage = declineMessage?.trim();
      order.declinedAt = new Date();
      order.declineCount = (order.declineCount || 0) + 1;
      await addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_DECLINED,
        actorShopId: session.user.id,
        message: declineMessage ? declineMessage : `Declined: ${declineReason.replaceAll("_", " ")}`,
      });
    }

    // ─────────────────────────────────────────────
    // STATUS TRANSITION GUARD
    // ─────────────────────────────────────────────
    assertOrderTransition({
      order,
      nextStatus: status,
      actorShopId: session.user.id,
      });

    // ─────────────────────────────────────────────
    // STATUS TRANSITIONS
    // ─────────────────────────────────────────────
    const now = new Date();
    order.status = status;

    if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) {
      order.acceptedAt = now;
      await addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_ACCEPTED,
        actorShopId: session.user.id,
        message: `Order accepted, awaiting payment`,
      });

      // Clear any previous decline data
      order.declineReason = undefined;
      order.declineMessage = undefined;
    }

    if (status === OrderStatus.COMPLETED) {
      order.completedAt = now;
      await addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_COMPLETED,
        actorShopId: session.user.id,
        message: `Order marked as completed`,
      });
    }

    await order.save();

    // ─────────────────────────────────────────────
    // EMAIL NOTIFICATIONS
    // ─────────────────────────────────────────────
    const resend = getResend();
    const originShop = await Shop.findById(order.originatingShop);
    const fulfillShop = await Shop.findById(order.fulfillingShop);

    if (originShop?.email && fulfillShop?.shopName) {
      const sendEmail = (to: string, subject: string, html: string) =>
        resend.emails.send({
          from: "BloomDirect <new-orders@getbloomdirect.com>",
          to,
          subject,
          html,
        });

      if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} - Accepted`,
          `
            <p><strong>${fulfillShop.shopName}</strong> has accepted your order.</p>
            <p>Please submit payment to continue processing.</p>
          `
        );
      }

      if (status === OrderStatus.DECLINED) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} - Declined`,
          `
            <p><strong>${fulfillShop.shopName}</strong> declined your order.</p>
            <p><strong>Reason:</strong> ${
              order.declineReason?.replaceAll("_", " ") ?? "Unknown"
            }</p>
            ${
              declineMessage
                ? `<p><strong>Message:</strong><br/>${order.declineMessage}</p>`
                : ""
            }
            <p>You may reassign this order to another shop.</p>
          `
        );
      }

      if (status === OrderStatus.COMPLETED) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} - Delivered`,
          `
            <p>Your order has been completed and marked as delivered.</p>
            <p>Thank you for using BloomDirect.</p>
          `
        );
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
        console.error("STATUS ROUTE ERROR:", error);
    
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