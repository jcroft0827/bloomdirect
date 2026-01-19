// app/api/orders/status/route.ts

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
      order.activityLog.push({
        action: "DECLINED",
        message: `Order declined${declineReason ? ` : ${declineReason}` : ""}`,
        actorShop: session.user.id,
      });
    }

    // ─────────────────────────────────────────────
    // STATUS TRANSITIONS
    // ─────────────────────────────────────────────
    const now = new Date();
    order.status = status;

    if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) {
      order.acceptedAt = now;
      order.activityLog.push({
        action: "ACCEPTED_AWAITING_PAYMENT",
        message: `Order accepted, awaiting payment`,
        actorShop: session.user.id,
      });

      // Clear any previous decline data
      order.declineReason = undefined;
      order.declineMessage = undefined;
    }

    if (status === OrderStatus.COMPLETED) {
      order.completedAt = now;
      order.activityLog.push({
        action: "COMPLETED",
        message: `Order completed`,
        actorShop: session.user.id,
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// import { NextResponse } from "next/server";
// import Order from "@/models/Order";
// import { OrderStatus } from "@/lib/order-status";
// import { connectToDB } from "@/lib/mongoose";
// import { getServerSession } from "next-auth";
// import { authOptions } from "@/lib/auth";
// import { getResend } from "@/lib/resend";
// import Shop from "@/models/Shop";

// export async function POST(req: Request) {
//   try {
//     await connectToDB();
//     const session = await getServerSession(authOptions);

//     if (!session?.user?.id) {
//       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//     }

//     const { orderId, status } = await req.json();

//     if (!Object.values(OrderStatus).includes(status)) {
//       return NextResponse.json({ error: "Invalid status" }, { status: 400 });
//     }

//     const order = await Order.findById(orderId);
//     if (!order) {
//       return NextResponse.json({ error: "Order not found" }, { status: 404 });
//     }

//     const userShopId = session.user.id;

//     // PERMISSION RULES
//     if (
//       [
//         OrderStatus.ACCEPTED_AWAITING_PAYMENT,
//         OrderStatus.DECLINED,
//         OrderStatus.COMPLETED,
//       ].includes(status) &&
//       order.fulfillingShop.toString() !== userShopId
//     ) {
//       return NextResponse.json({ error: "Not authorized" }, { status: 403 });
//     }

//     // Status transitions
//     order.status = status;

//     const now = new Date();
//     if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) order.acceptedAt = now;
//     if (status === OrderStatus.DECLINED) order.declinedAt = now;
//     if (status === OrderStatus.COMPLETED) order.completedAt = now;

//     await order.save();

//     // Emails
//     const resend = getResend();
//     const originShop = await Shop.findById(order.originatingShop);
//     const fulfillShop = await Shop.findById(order.fulfillingShop);

//     if (originShop && fulfillShop) {
//       const sendEmail = (to: string, subject: string, html: string) =>
//         resend.emails.send({
//           from: "BloomDirect <new-orders@getbloomdirect.com>",
//           to,
//           subject,
//           html,
//         });

//       if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && originShop.email) {
//         await sendEmail(
//           originShop.email,
//           `Order ${order.orderNumber} Accepted`,
//           `<p>${fulfillShop.shopName} has accepted your order.</p>`
//         );
//       }

//       if (status === OrderStatus.DECLINED && originShop.email) {
//         await sendEmail(
//           originShop.email,
//           `Order ${order.orderNumber} Declined`,
//           `<p>${fulfillShop.shopName} declined your order.</p>`
//         );
//       }

//       if (status === OrderStatus.COMPLETED && originShop.email) {
//         await sendEmail(
//           originShop.email,
//           `Order ${order.orderNumber} Delivered`,
//           `<p>Your order has been completed and delivered.</p>`
//         );
//       }
//     }

//     return NextResponse.json({ success: true, order });
//   } catch (error: any) {
//     console.error("STATUS ERROR:", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
