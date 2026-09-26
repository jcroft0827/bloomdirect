import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  BloomWebsiteRefundError,
  refundBloomWebsiteOrder,
} from "@/lib/bloom-websites/payments/refundBloomWebsiteOrder";
import { BloomPaymentProviderError } from "@/lib/bloom-websites/payments/types";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    const body = await request.json().catch(() => null);
    const amountCents =
      body?.amountCents === undefined || body?.amountCents === null
        ? undefined
        : Number(body.amountCents);
    const selections = Array.isArray(body?.selections)
      ? body.selections
      : undefined;
    const reason =
      typeof body?.reason === "string" ? body.reason.trim() : "";
    const idempotencyKey =
      typeof body?.idempotencyKey === "string"
        ? body.idempotencyKey.trim()
        : "";

    const result = await refundBloomWebsiteOrder({
      orderId,
      shopId: session.user.id,
      amountCents,
      selections,
      reason,
      idempotencyKey,
      actorLabel:
        session.user.name || session.user.email || "Florist account",
    });

    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof BloomWebsiteRefundError ||
      error instanceof BloomPaymentProviderError
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable:
            "retryable" in error ? error.retryable === true : false,
        },
        {
          status:
            "status" in error && typeof error.status === "number"
              ? error.status
              : 409,
        },
      );
    }

    console.error("BloomWebsite refund failed:", error);
    return NextResponse.json(
      { error: "Refund could not be completed." },
      { status: 500 },
    );
  }
}
