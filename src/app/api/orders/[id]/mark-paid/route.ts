import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { OrderStatus } from "@/lib/order-status";
import Order from "@/models/Order";
import Shop from "@/models/Shop";

const ALLOWED_PAYMENT_METHODS = [
  "venmo",
  "cashapp",
  "zelle",
  "paypal",
] as const;

type PaymentMethod =
  (typeof ALLOWED_PAYMENT_METHODS)[number];

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type MarkPaidBody = {
  paymentMethod?: unknown;
};

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const { id } = await context.params;

    await connectToDB();

    const currentShop = await Shop.findById(
      session.user.id,
    ).select("isSuspended");

    if (!currentShop) {
      return NextResponse.json(
        { error: "Shop not found" },
        { status: 404 },
      );
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

    const order = await Order.findById(id);

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 },
      );
    }

    if (
      order.originatingShop.toString() !==
      session.user.id
    ) {
      return NextResponse.json(
        {
          error:
            "Only the sending florist can record payment.",
        },
        { status: 403 },
      );
    }

    if (order.fulfillmentType === "outside_network") {
      return NextResponse.json(
        {
          error:
            "Outside-network orders are not managed through network settlements.",
        },
        { status: 400 },
      );
    }

    /*
     * Payment may be recorded after acceptance or after delivery.
     *
     * Payment is deliberately separate from the order lifecycle.
     * Completing an order must not prevent the sending florist
     * from later recording that settlement was sent.
     */
    const allowedStatuses: OrderStatus[] = [
      OrderStatus.ACCEPTED,
      OrderStatus.ACCEPTED_AWAITING_PAYMENT,
      OrderStatus.PAID_AWAITING_FULFILLMENT,
      OrderStatus.COMPLETED,
    ];

    if (!allowedStatuses.includes(order.status)) {
      return NextResponse.json(
        {
          error:
            "Payment cannot be recorded for this order yet.",
        },
        { status: 409 },
      );
    }

    if (order.paidAt) {
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        paidAt: order.paidAt,
        paymentMethodUsed:
          order.paymentMethodUsed ?? null,
      });
    }

    const body =
      (await request.json()) as MarkPaidBody;

    const paymentMethod =
      typeof body.paymentMethod === "string"
        ? body.paymentMethod.trim().toLowerCase()
        : "";

    if (
      !ALLOWED_PAYMENT_METHODS.includes(
        paymentMethod as PaymentMethod,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Select a valid payment method.",
        },
        { status: 400 },
      );
    }

    const now = new Date();

    /*
     * Do NOT change order.status here.
     *
     * A completed order remains completed.
     * An accepted order remains accepted.
     *
     * paidAt/paymentMethodUsed represent settlement state
     * independently from flower fulfillment.
     */
    order.paidAt = now;
    order.paymentMethodUsed =
      paymentMethod as PaymentMethod;
    order.lastUpdatedByShop =
      session.user.id;

    await order.save();

    return NextResponse.json({
      success: true,
      paidAt: order.paidAt,
      paymentMethodUsed:
        order.paymentMethodUsed,
      status: order.status,
    });
  } catch (error) {
    console.error(
      "Failed to mark order paid:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to record payment.",
      },
      { status: 500 },
    );
  }
}