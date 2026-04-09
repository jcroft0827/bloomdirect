// app/api/orders/status/route.ts

import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { OrderStatus } from "@/lib/order-status";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import Shop from "@/models/Shop";
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

    const { orderId, status, declineReason, declineMessage } = await req.json();

    // ─────────────────────────────────────────────
    // VALIDATION
    // ─────────────────────────────────────────────
    if (!orderId || !status) {
      return NextResponse.json(
        { error: "orderId and status are required" },
        { status: 400 },
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
          { status: 400 },
        );
      }

      if (
        declineReason === "OTHER" &&
        (!declineMessage || declineMessage.trim().length === 0)
      ) {
        return NextResponse.json(
          { error: "Decline message is required when reason is OTHER" },
          { status: 400 },
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
        message: declineMessage
          ? declineMessage
          : `Declined: ${declineReason.replaceAll("_", " ")}`,
      });

      await Shop.findByIdAndUpdate(order.fulfillingShop, {
        $inc: { "stats.ordersDeclined": 1 },
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

      // Update Order Activity
      await addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_COMPLETED,
        actorShopId: session.user.id,
        message: `Order marked as completed`,
      });

      // Update the Fulfilling Shop's stats
      await Shop.findByIdAndUpdate(order.fulfillingShop, {
        $inc: { "stats.ordersCompleted": 1 },
      });
    }

    await order.save();

    // ─────────────────────────────────────────────
    // EMAIL NOTIFICATIONS
    // ─────────────────────────────────────────────
    const resend = getResend();
    const originShop = await Shop.findById(order.originatingShop);
    const fulfillShop = await Shop.findById(order.fulfillingShop);

    if (originShop.email && fulfillShop.businessName) {
      const sendEmail = async (to: string, subject: string, html: string) =>
        resend.emails.send({
          from: "BloomDirect <new-orders@getbloomdirect.com>",
          to,
          subject,
          html,
        });

      console.log(status);

      if (
        status.toString().trim() ===
        OrderStatus.ACCEPTED_AWAITING_PAYMENT.toString()
      ) {
        console.log("✅ ACCEPTED condition met. Sending email...");

        console.log("Preparing to send to:", originShop?.email);

        // Fallbacks for everything
        const bizName = fulfillShop?.businessName || "A shop";
        const pref =
          fulfillShop?.paymentMethods?.defaultPaymentMethod || "Not specified";

        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} - Accepted at ${new Date().toLocaleString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          )}`,
          `
            <p><strong>${bizName}</strong> has accepted your order.</p>
            <p>Please submit payment, and then select which payment method you chose on the order in GetBloomDirect to let the shop know you paid!</p>

            <p><strong>${bizName}'s preferred payment is ${pref}.</strong></p>

            <p><strong>Payment Methods:</strong></p>
            <p><strong>Venmo: </strong>${fulfillShop.paymentMethods?.venmoHandle || "N/A"}</p>
            <p><strong>CashApp: </strong>${fulfillShop.paymentMethods?.cashAppTag || "N/A"}</p>
            <p><strong>Zelle: </strong>${fulfillShop.paymentMethods?.zellePhoneOrEmail || "N/A"}</p>
            <p><strong>PayPal: </strong>${fulfillShop.paymentMethods?.paypalEmail || "N/A"}</p>
          `,
        );
      }

      if (status === OrderStatus.DECLINED) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} - Declined`,
          `
            <p><strong>${fulfillShop.businessName}</strong> declined your order.</p>
            <p><strong>Reason:</strong> ${
              order.declineReason?.replaceAll("_", " ") ?? "Unknown"
            }</p>
            ${
              declineMessage
                ? `<p><strong>Message:</strong><br/>${order.declineMessage}</p>`
                : ""
            }
            <p>You may reassign this order to another shop.</p>
          `,
        );
      }

      if (status === OrderStatus.COMPLETED) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} - Delivered at ${new Date().toLocaleString(
            "en-US",
            {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            },
          )}`,
          `
            <p>Your order has been completed and marked as delivered.</p>
            <p>Thank you for using GetBloomDirect.</p>
          `,
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
        error:
          "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}
