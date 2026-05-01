import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import OrderMessages from "@/models/OrderMessages";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();

    const { id } = await context.params;

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.id;

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order Not Found" }, { status: 404 });
    }

    const isOriginatingShop = order.originatingShop?.toString() === shopId;
    const isFulfillingShop = order.fulfillingShop?.toString() === shopId;

    if (!isOriginatingShop && !isFulfillingShop) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 3. Mark only received unread messages as read
    await OrderMessages.updateMany(
      {
        order: id,
        receivingShop: shopId,
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
    );

    const messages = await OrderMessages.find({ orderId: id })
      .populate("sendingShop", "businessName")
      .populate("receivingShop", "businessName")
      .sort({ createdAt: 1 });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("ERROR FETCHING MESSAGES:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
