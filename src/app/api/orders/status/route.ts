// app/api/orders/status/route.ts

import { NextResponse } from "next/server";
import Order from "@/models/Order";
import { OrderStatus } from "@/lib/order-status";
import { connectToDB } from "@/lib/mongoose";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getResend } from "@/lib/resend";
import Shop from "@/models/Shop";
import { addOrderActivity } from "@/lib/order-activity";
import { OrderActivityActions } from "@/lib/order-activity-actions";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { ApiError } from "@/lib/api-error";
import { sendOrderEvent } from "@/lib/send-order-event";
import Notifications from "@/models/Notifications";
import { getShopReadiness } from "@/lib/shops/getShopReadiness";

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

    const currentShop = await Shop.findById(userShopId);

    if (!currentShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (currentShop.isSuspended) {
      return NextResponse.json(
        {
          error: "This account is currently suspended.",
          code: "SHOP_SUSPENDED",
        },
        { status: 403 },
      );
    }

    // ─────────────────────────────────────────────
    // PERMISSIONS
    // Only fulfilling shop can:
    // - accept
    // - decline
    // - complete
    // ─────────────────────────────────────────────
    const fulfillingActions = [
      OrderStatus.ACCEPTED,
      OrderStatus.ACCEPTED_AWAITING_PAYMENT, // legacy
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
    // ACCEPTANCE READINESS
    // A fulfilling florist must have a configured payment method before
    // accepting an order.
    // ─────────────────────────────────────────────
    if (
      status === OrderStatus.ACCEPTED ||
      status === OrderStatus.ACCEPTED_AWAITING_PAYMENT // legacy
    ) {
      const readiness = getShopReadiness(currentShop.toObject());

      if (!readiness.capabilities.canAcceptOrders) {
        return NextResponse.json(
          {
            error:
              "You must set up at least one payment method before accepting an order.",
            code: "PAYMENT_METHOD_REQUIRED",
          },
          { status: 403 },
        );
      }
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

      await sendOrderEvent({
        event: "order.declined",
        order,
        actorShopId: session?.user?.id,
      });

      // Mark Current Notification As READ
      await Notifications.updateMany(
        {
          order: order._id,
          receivingShop: session.user.id,
          read: false,
          type: {
            $in: ["NewOrder", "OrderPaid"],
          },
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        },
      );
      // Add New Notification for Declined
      const notificationMessage = "Order Declined!";
      const newNotification = new Notifications({
        type: "OrderDeclined",
        receivingShop: order.originatingShop,
        sendingShop: order.fulfillingShop,
        order: order._id,
        message: notificationMessage,
        read: false,
        readAt: null,
      });
      await newNotification.save();
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

    if (
      status === OrderStatus.ACCEPTED ||
      status === OrderStatus.ACCEPTED_AWAITING_PAYMENT
    ) {
      order.acceptedAt = now;
      await addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_ACCEPTED,
        actorShopId: session.user.id,
        message:
          status === OrderStatus.ACCEPTED
            ? "Order accepted"
            : "Order accepted, awaiting payment",
      });

      await sendOrderEvent({
        event: "order.accepted",
        order,
        actorShopId: session?.user?.id,
      });

      // Clear any previous decline data
      order.declineReason = undefined;
      order.declineMessage = undefined;

      // Mark Current Notification As READ
      await Notifications.updateMany(
        {
          order: order._id,
          receivingShop: session.user.id,
          read: false,
          type: {
            $in: ["NewOrder", "OrderPaid"],
          },
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        },
      );
      // Add New Notification for Accepted
      const notificationMessage = "Order Accepted!";
      const newNotification = new Notifications({
        type: "OrderAccepted",
        receivingShop: order.originatingShop,
        sendingShop: order.fulfillingShop,
        order: order._id,
        message: notificationMessage,
        read: false,
        readAt: null,
      });
      await newNotification.save();
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

      await sendOrderEvent({
        event: "order.completed",
        order,
        actorShopId: session?.user?.id,
      });

      // Mark Current Notification As READ
      await Notifications.updateMany(
        {
          order: order._id,
          receivingShop: session.user.id,
          read: false,
          type: {
            $in: ["NewOrder", "OrderPaid"],
          },
        },
        {
          $set: {
            read: true,
            readAt: new Date(),
          },
        },
      );
      // Add New Notification for Completed
      const notificationMessage = "Order Completed, Rate Florist!";
      const newNotification = new Notifications({
        type: "OrderComplete",
        receivingShop: order.originatingShop,
        sendingShop: order.fulfillingShop,
        order: order._id,
        message: notificationMessage,
        read: false,
        readAt: null,
      });
      await newNotification.save();
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
      if (
        status === OrderStatus.ACCEPTED ||
        status === OrderStatus.ACCEPTED_AWAITING_PAYMENT
      ) {
        // Fallbacks for everything
        const bizName = fulfillShop?.businessName || "A shop";
        const pref =
          fulfillShop?.paymentMethods?.defaultPaymentMethod || "Not specified";

        const paymentMethods = fulfillShop?.paymentMethods;

        const normalizePaymentHandle = (value?: string) =>
          value?.trim().replace(/^[@$]/, "") || "";

        const preferredPaymentButton = (() => {
          const buttonStyle = [
            "display:inline-block",
            "padding:12px 20px",
            "background-color:#111827",
            "color:#ffffff",
            "text-decoration:none",
            "border-radius:8px",
            "font-weight:600",
            "margin:8px 0 20px",
          ].join(";");

          switch (pref) {
            case "venmo": {
              const handle = normalizePaymentHandle(
                paymentMethods?.venmoHandle,
              );

              if (!handle) return "";

              return `
        <a
          href="https://venmo.com/u/${encodeURIComponent(handle)}"
          style="${buttonStyle}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pay with Venmo
        </a>
      `;
            }

            case "cashapp": {
              const cashtag = normalizePaymentHandle(
                paymentMethods?.cashAppTag,
              );

              if (!cashtag) return "";

              return `
        <a
          href="https://cash.app/$${encodeURIComponent(cashtag)}"
          style="${buttonStyle}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pay with Cash App
        </a>
      `;
            }

            case "paypal": {
              if (!paymentMethods?.paypalEmail?.trim()) return "";

              return `
        <a
          href="https://www.paypal.com/us/digital-wallet/send-receive-money/send-money"
          style="${buttonStyle}"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open PayPal
        </a>
      `;
            }

            default:
              return "";
          }
        })();

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
            <p>Please submit payment directly to the fulfilling florist using one of the payment methods below.</p>

            <p><strong>${bizName}'s preferred payment is ${pref}.</strong></p>

            ${preferredPaymentButton}

            <p><strong>Payment Methods:</strong></p>
            <p><strong>Venmo: </strong>${fulfillShop.paymentMethods?.venmoHandle || "N/A"}</p>
            <p><strong>Cash App: </strong>${fulfillShop.paymentMethods?.cashAppTag || "N/A"}</p>
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
