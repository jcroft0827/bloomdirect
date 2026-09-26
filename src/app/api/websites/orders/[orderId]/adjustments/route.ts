import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  BloomWebsiteOrderAdjustmentError,
  updateBloomWebsiteOrderDetails,
} from "@/lib/bloom-websites/orders/updateBloomWebsiteOrderDetails";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Order adjustment payload is required." },
        { status: 400 },
      );
    }

    const result = await updateBloomWebsiteOrderDetails({
      orderId,
      shopId: session.user.id,
      actorLabel:
        session.user.name || session.user.email || "Florist account",
      input: body,
    });

    return NextResponse.json({
      order: {
        id: String(result.order._id),
        orderNumber: result.order.orderNumber,
        status: result.order.status,
      },
      changedFields: result.changes.map((change) => change.field),
      financialReviewRequired: result.financialReviewRequired,
    });
  } catch (error) {
    if (error instanceof BloomWebsiteOrderAdjustmentError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("BloomWebsite order adjustment failed:", error);
    return NextResponse.json(
      { error: "Order changes could not be saved." },
      { status: 500 },
    );
  }
}
