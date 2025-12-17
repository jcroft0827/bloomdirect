// app/api/orders/status/route.ts
import { NextResponse } from "next/server";
import Order from "@/models/Order";
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

    const { orderId, status } = await req.json();

    const order = await Order.findById(orderId);
    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    // Security: only the fulfilling shop can accept/decline
    if (order.fulfillingShop.toString() !== session.user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    order.status = status;
    await order.save();
    
    const resend = getResend();
    // Send email to originating shop
    const originShop = await Shop.findById(order.originatingShop);
    if (originShop?.email) {

      await resend.emails.send({
        from: "Joseph Croft - Test <jcroft0827@gmail.com>",
        to: originShop.email,
        subject: `Order ${order.orderNumber} has been ${status.toUpperCase()}`,
        html: `
      <div style="font-family: system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: ${status === "accepted" ? "#16a34a" : "#dc2626"};">
          Order ${status === "accepted" ? "Accepted" : "Declined"}
        </h1>
        <p><strong>Order #:</strong> ${order.orderNumber}</p>
        <p><strong>Fulfilling Shop:</strong> ${order.fulfillingShopName}</p>
        <p><strong>Status:</strong> <span style="font-size: 1.5em; font-weight: bold; color: ${
          status === "accepted" ? "#16a34a" : "#dc2626"
        };">
          ${status.toUpperCase()}
        </span></p>
        ${
          status === "accepted"
            ? "<p>Great news — they’re making the arrangement now!</p>"
            : "<p>They declined. You may want to find another shop.</p>"
        }
        <p><a href="https://www.getbloomdirect.com/dashboard" style="background:#9333ea; color:white; padding:14px 28px; text-decoration:none; border-radius:12px; font-weight:bold;">
          View in Dashboard
        </a></p>
      </div>
    `,
      });
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("Status update error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
