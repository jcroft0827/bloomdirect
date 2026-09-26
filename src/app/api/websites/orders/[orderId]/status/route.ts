import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  BloomWebsiteOrderStatusError,
  type BloomWebsiteOrderStatus,
  updateBloomWebsiteOrderStatus,
} from "@/lib/bloom-websites/orders/updateBloomWebsiteOrderStatus";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

const allowedStatuses = new Set<BloomWebsiteOrderStatus>([
  "confirmed",
  "in_preparation",
  "preparation_complete",
  "ready_for_pickup",
  "out_for_delivery",
  "fulfilled",
  "canceled",
]);

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    const body = await request.json().catch(() => null);
    const nextStatus = body?.status as BloomWebsiteOrderStatus;
    const cancellationReason =
      typeof body?.cancellationReason === "string"
        ? body.cancellationReason
        : "";

    if (!allowedStatuses.has(nextStatus)) {
      return NextResponse.json(
        { error: "Invalid order status.", code: "INVALID_STATUS" },
        { status: 400 },
      );
    }

    const order = await updateBloomWebsiteOrderStatus({
      orderId,
      shopId: session.user.id,
      nextStatus,
      cancellationReason,
      source: "portal",
      actorId: session.user.id,
      actorLabel:
        session.user.name || session.user.email || "Florist account",
    });

    return NextResponse.json({
      order: {
        id: String(order._id),
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.payment.status,
      },
    });
  } catch (error) {
    if (error instanceof BloomWebsiteOrderStatusError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("BloomWebsite order status update failed:", error);
    return NextResponse.json(
      { error: "Order status could not be updated." },
      { status: 500 },
    );
  }
}
