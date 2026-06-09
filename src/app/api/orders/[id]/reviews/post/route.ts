import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderStatus } from "@/lib/order-status";
import Notifications from "@/models/Notifications";
import Order from "@/models/Order";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid Order ID" }, { status: 400 });
    }

    const body = await req.json();
    const rating = Number(body.rating);
    const comment = String(body.comment || "").trim();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: "Rating is required and must be between 1 and 5." },
        { status: 400 },
      );
    }

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.status !== OrderStatus.COMPLETED) {
      return NextResponse.json(
        {
          error: "Reviews can only be submitted after the order is completed.",
        },
        { status: 400 },
      );
    }

    const currentShopId = session.user.id;

    const isOriginating = order.originatingShop.toString() === currentShopId;
    const isFulfilling = order.fulfillingShop.toString() === currentShopId;

    if (!isOriginating && !isFulfilling) {
      return NextResponse.json(
        { error: "You are not authorized to review this order." },
        { status: 403 },
      );
    }

    const reviewerRole = isOriginating ? "originating" : "fulfilling";

    const reviewedShop = isOriginating
      ? order.fulfillingShop
      : order.originatingShop;

    const reviewedShopRole = isOriginating ? "fulfilling" : "originating";

    const reviewerShopName = isOriginating
      ? order.originatingShopName
      : order.fulfillingShopName;

    const alreadyReviewed = order.reviews?.some((review: any) => {
      return review.reviewerShop.toString() === currentShopId;
    });

    if (alreadyReviewed) {
      return NextResponse.json(
        { error: "You have already reviewed this order." },
        { status: 400 },
      );
    }

    const reviewForOrder = {
      reviewerShop: currentShopId,
      reviewedShop,
      reviewerRole,
      rating,
      comment,
      createdAt: new Date(),
    };

    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          lastUpdatedByShop: currentShopId,
        },
        $push: {
          reviews: reviewForOrder,
          activityLog: {
            action: "REVIEW_SUBMITTED",
            message: `${reviewerShopName} submitted a ${rating}-star review.`,
            actorShop: currentShopId,
            createdAt: new Date(),
          },
        },
      },
    );

    await Shop.findByIdAndUpdate(reviewedShop, {
      $push: {
        reviews: {
          order: order._id,
          reviewerShop: currentShopId,
          reviewerShopName,
          reviewedShopRole,
          source: "order",
          rating,
          comment,
          date: new Date(),
        },
      },
    });

    await Notifications.updateMany(
      {
        order: order._id,
        receivingShop: currentShopId,
        type: "OrderComplete",
        read: false,
      },
      {
        $set: {
          read: true,
          readAt: new Date(),
        },
      },
    );

    return NextResponse.json({
      success: true,
      message: "Review submitted successfully.",
      review: reviewForOrder,
    });
  } catch (error) {
    console.error("ERROR SUBMITTING ORDER REVIEW: ", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
