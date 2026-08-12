import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Notifications from "@/models/Notifications";
import Order from "@/models/Order";
import OrderMessages from "@/models/OrderMessages";
import Shop from "@/models/Shop";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const shopId = session.user.id;

    const shop = await Shop.findById(shopId).select("_id isSuspended");

    if (!shop) {
      return NextResponse.json(
        { success: false, error: "Shop not found" },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          success: false,
          error: "This account is currently suspended.",
          code: "SHOP_SUSPENDED",
        },
        { status: 403 },
      );
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid Order ID" },
        { status: 400 },
      );
    }

    const { message } = await req.json();

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Message cannot be empty." },
        { status: 400 },
      );
    }

    const order = await Order.findById(id).select(
      "_id originatingShop fulfillingShop",
    );

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 },
      );
    }

    const originatingShopId = order.originatingShop?.toString();
    const fulfillingShopId = order.fulfillingShop?.toString();

    const isOriginatingShop = originatingShopId === shopId;
    const isFulfillingShop = fulfillingShopId === shopId;

    if (!isOriginatingShop && !isFulfillingShop) {
      return NextResponse.json(
        {
          success: false,
          error: "You are not authorized to message on this order.",
        },
        { status: 403 },
      );
    }

    const receivingShopId = isOriginatingShop
      ? fulfillingShopId
      : originatingShopId;

    if (!receivingShopId) {
      return NextResponse.json(
        {
          success: false,
          error: "This order does not have another shop available to message.",
        },
        { status: 400 },
      );
    }

    const trimmedMessage = message.trim();

    const newNotification = new Notifications({
      type: "NewMessage",
      receivingShop: receivingShopId,
      sendingShop: shopId,
      order: order._id,
      message: trimmedMessage,
      read: false,
      readAt: null,
    });

    await newNotification.save();

    const newMessage = new OrderMessages({
      message: trimmedMessage,
      sendingShop: shopId,
      receivingShop: receivingShopId,
      order: order._id,
      read: false,
      readAt: null,
    });

    await newMessage.save();

    return NextResponse.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("ERROR SENDING MESSAGE:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Internal Server Error",
      },
      { status: 500 },
    );
  }
}