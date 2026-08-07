import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderActivityActions } from "@/lib/order-activity-actions";
import {
  assertValidRefundAmount,
  getRefundSummary,
} from "@/lib/orders/refunds";
import { OrderStatus } from "@/lib/order-status";
import Order from "@/models/Order";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

const REFUND_CATEGORIES = [
  "delivery_fee",
  "tax",
  "full",
  "custom",
] as const;

type RefundCategory = (typeof REFUND_CATEGORIES)[number];

type CreateRefundBody = {
  amountCents?: unknown;
  refundDate?: unknown;
  category?: unknown;
  reason?: unknown;
  notes?: unknown;
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const REFUNDABLE_STATUSES: OrderStatus[] = [
  OrderStatus.ACCEPTED,
  OrderStatus.ACCEPTED_AWAITING_PAYMENT,
  OrderStatus.PAID_AWAITING_FULFILLMENT,
  OrderStatus.COMPLETED,
];

function isRefundCategory(value: unknown): value is RefundCategory {
  return (
    typeof value === "string" &&
    REFUND_CATEGORIES.includes(value as RefundCategory)
  );
}

function normalizeOptionalText(
  value: unknown,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

function parseRefundDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  /*
   * Using noon UTC prevents a YYYY-MM-DD value from appearing as the
   * previous calendar day in North American time zones.
   */
  const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.test(value);

  const parsedDate = dateOnlyMatch
    ? new Date(`${value}T12:00:00.000Z`)
    : new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
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

    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required." },
        { status: 400 },
      );
    }

    let body: CreateRefundBody;

    try {
      body = (await request.json()) as CreateRefundBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    const amountCents =
      typeof body.amountCents === "number"
        ? body.amountCents
        : Number.NaN;

    if (!isRefundCategory(body.category)) {
      return NextResponse.json(
        { error: "A valid refund category is required." },
        { status: 400 },
      );
    }

    const refundDate = parseRefundDate(body.refundDate);

    if (!refundDate) {
      return NextResponse.json(
        { error: "A valid refund date is required." },
        { status: 400 },
      );
    }

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (refundDate.getTime() > endOfToday.getTime()) {
      return NextResponse.json(
        { error: "Refund date cannot be in the future." },
        { status: 400 },
      );
    }

    const reason = normalizeOptionalText(body.reason, 500);
    const notes = normalizeOptionalText(body.notes, 2000);

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
            "Only the originating shop can record a refund for this order.",
        },
        { status: 403 },
      );
    }

    if (!REFUNDABLE_STATUSES.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            "Refunds can only be recorded for accepted or delivered orders.",
        },
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
            "This order does not have a valid refundable total.",
        },
        { status: 409 },
      );
    }

    const existingRefunds = Array.isArray(order.refunds)
      ? order.refunds.map(
          (refund: {
            amountCents: number;
            status: "active" | "voided";
          }) => ({
            amountCents: refund.amountCents,
            status: refund.status,
          }),
        )
      : [];

    const currentSummary = getRefundSummary({
      orderTotalCents,
      refunds: existingRefunds,
    });

    try {
      assertValidRefundAmount({
        amountCents,
        remainingRefundableCents:
          currentSummary.remainingRefundableCents,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid refund amount.",
        },
        { status: 400 },
      );
    }

    if (
      body.category === "full" &&
      amountCents !== currentSummary.remainingRefundableCents
    ) {
      return NextResponse.json(
        {
          error:
            "A full refund must equal the remaining refundable amount.",
        },
        { status: 400 },
      );
    }

    order.refunds ??= [];

    order.refunds.push({
      amountCents,
      refundDate,
      source: "manual",
      category: body.category,
      reason,
      notes,
      status: "active",
      createdByShop: session.user.id,
      createdAt: new Date(),
      voidedAt: null,
      voidedByShop: null,
      voidReason: "",
      externalRefundId: "",
      externalPaymentId: "",
    });

    const updatedSummary = getRefundSummary({
      orderTotalCents,
      refunds: order.refunds.map(
        (refund: {
          amountCents: number;
          status: "active" | "voided";
        }) => ({
          amountCents: refund.amountCents,
          status: refund.status,
        }),
      ),
    });

    order.totalRefundedCents =
      updatedSummary.totalRefundedCents;

    order.refundStatus = updatedSummary.refundStatus;

    const formattedAmount = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amountCents / 100);

    order.activityLog ??= [];

    order.activityLog.push({
      action: OrderActivityActions.ORDER_REFUND_CREATED,
      actorShopId: session.user.id,
      message:
        updatedSummary.refundStatus === "full"
          ? `Order #${order.orderNumber} was fully refunded for ${formattedAmount}.`
          : `Order #${order.orderNumber} was partially refunded by ${formattedAmount}.`,
      createdAt: new Date(),
    });

    await order.save();

    const createdRefund =
      order.refunds[order.refunds.length - 1];

    return NextResponse.json(
      {
        success: true,
        refund: createdRefund,
        refundStatus: order.refundStatus,
        totalRefundedCents: order.totalRefundedCents,
        remainingRefundableCents:
          updatedSummary.remainingRefundableCents,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("CREATE ORDER REFUND ERROR:", error);

    return NextResponse.json(
      {
        error:
          "Unable to record the refund. Please try again.",
      },
      { status: 500 },
    );
  }
}