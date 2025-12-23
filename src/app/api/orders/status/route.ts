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

    const { orderId, status } = await req.json();

    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const userShopId = session.user.id;

    // PERMISSION RULES
    if (
      [
        OrderStatus.ACCEPTED_AWAITING_PAYMENT,
        OrderStatus.DECLINED,
        OrderStatus.COMPLETED,
      ].includes(status) &&
      order.fulfillingShop.toString() !== userShopId
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Status transitions
    order.status = status;

    const now = new Date();
    if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) order.acceptedAt = now;
    if (status === OrderStatus.DECLINED) order.declinedAt = now;
    if (status === OrderStatus.COMPLETED) order.completedAt = now;

    await order.save();

    // Emails
    const resend = getResend();
    const originShop = await Shop.findById(order.originatingShop);
    const fulfillShop = await Shop.findById(order.fulfillingShop);

    if (originShop && fulfillShop) {
      const sendEmail = (to: string, subject: string, html: string) =>
        resend.emails.send({
          from: "BloomDirect <new-orders@getbloomdirect.com>",
          to,
          subject,
          html,
        });

      if (status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && originShop.email) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} Accepted`,
          `<p>${fulfillShop.shopName} has accepted your order.</p>`
        );
      }

      if (status === OrderStatus.DECLINED && originShop.email) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} Declined`,
          `<p>${fulfillShop.shopName} declined your order.</p>`
        );
      }

      if (status === OrderStatus.COMPLETED && originShop.email) {
        await sendEmail(
          originShop.email,
          `Order ${order.orderNumber} Delivered`,
          `<p>Your order has been completed and delivered.</p>`
        );
      }
    }

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    console.error("STATUS ERROR:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
