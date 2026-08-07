import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderActivityActions } from "@/lib/order-activity-actions";
import { getRefundSummary } from "@/lib/orders/refunds";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type VoidRefundBody = {
  reason?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
    refundId: string;
  }>;
};

function normalizeRequiredText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export async function POST(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const { id: orderId, refundId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 },
      );
    }

    if (!refundId) {
      return NextResponse.json(
        { error: "Refund ID is required." },
        { status: 400 },
      );
    }

    let body: VoidRefundBody;

    try {
      body = (await request.json()) as VoidRefundBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const reason = normalizeRequiredText(body.reason, 500);

    if (!reason) {
      return NextResponse.json(
        { error: "A reason is required to void this refund." },
        { status: 400 },
      );
    }

    await connectToDB();

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 },
      );
    }

    if (
      order.originatingShop.toString() !==
      session.user.id.toString()
    ) {
      return NextResponse.json(
        {
          error:
            "Only the originating shop can void a refund for this order.",
        },
        { status: 403 },
      );
    }

    if (!Array.isArray(order.refunds)) {
      return NextResponse.json(
        { error: "Refund not found." },
        { status: 404 },
      );
    }

    const refund = order.refunds.id(refundId);

    if (!refund) {
      return NextResponse.json(
        { error: "Refund not found." },
        { status: 404 },
      );
    }

    if (refund.status === "voided") {
      return NextResponse.json(
        { error: "This refund has already been voided." },
        { status: 409 },
      );
    }

    const orderTotalCents = order.pricing?.orderTotalCents;

    if (
      !Number.isInteger(orderTotalCents) ||
      orderTotalCents <= 0
    ) {
      return NextResponse.json(
        {
          error:
            "This order does not have a valid total.",
        },
        { status: 409 },
      );
    }

    const voidedAt = new Date();

    refund.status = "voided";
    refund.voidedAt = voidedAt;
    refund.voidedByShop = session.user.id;
    refund.voidReason = reason;

    const updatedSummary = getRefundSummary({
      orderTotalCents,
      refunds: order.refunds.map(
        (orderRefund: {
          amountCents: number;
          status: "active" | "voided";
        }) => ({
          amountCents: orderRefund.amountCents,
          status: orderRefund.status,
        }),
      ),
    });

    order.totalRefundedCents =
      updatedSummary.totalRefundedCents;

    order.refundStatus = updatedSummary.refundStatus;

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(refund.amountCents / 100);

    order.activityLog ??= [];

    order.activityLog.push({
      action: OrderActivityActions.ORDER_REFUND_VOIDED,
      actorShopId: session.user.id,
      message: `A ${formattedAmount} refund for order #${order.orderNumber} was voided. Reason: ${reason}`,
      createdAt: voidedAt,
    });

    await order.save();

    return NextResponse.json({
      success: true,
      refund,
      refundStatus: order.refundStatus,
      totalRefundedCents: order.totalRefundedCents,
      remainingRefundableCents:
        updatedSummary.remainingRefundableCents,
    });
  } catch (error) {
    console.error("VOID ORDER REFUND ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Unable to void the refund. Please try again.",
      },
      { status: 500 },
    );
  }
}