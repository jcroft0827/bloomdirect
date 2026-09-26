import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { isValidObjectId } from "mongoose";

import authOptions from "@/lib/auth";
import {
  BloomTfposExportError,
  getBloomWebsiteTfposExportStatus,
  sendBloomWebsiteOrderToTfpos,
} from "@/lib/bloom-websites/pos/tfpos/sendBloomWebsiteOrderToTfpos";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

function invalidOrderId(orderId: string) {
  return !isValidObjectId(orderId);
}

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { orderId } = await params;

  if (invalidOrderId(orderId)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  try {
    const status = await getBloomWebsiteTfposExportStatus({
      orderId,
      shopId: session.user.id,
    });

    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    if (error instanceof BloomTfposExportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("TFPOS export status failed:", error);
    return NextResponse.json(
      { error: "Unable to load TFPOS export status." },
      { status: 500 },
    );
  }
}

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { orderId } = await params;

  if (invalidOrderId(orderId)) {
    return NextResponse.json({ error: "Invalid order id." }, { status: 400 });
  }

  try {
    const current = await getBloomWebsiteTfposExportStatus({
      orderId,
      shopId: session.user.id,
    });

    const trigger = current.export ? "retry" : "manual";

    const result = await sendBloomWebsiteOrderToTfpos({
      orderId,
      shopId: session.user.id,
      trigger,
    });

    const status = await getBloomWebsiteTfposExportStatus({
      orderId,
      shopId: session.user.id,
    });

    return NextResponse.json({ success: true, result, ...status });
  } catch (error) {
    if (error instanceof BloomTfposExportError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("TFPOS export failed:", error);
    return NextResponse.json(
      { error: "Bloom could not send this order to The Floral POS." },
      { status: 500 },
    );
  }
}
