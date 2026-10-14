import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    const body = await request.json().catch(() => null);
    const fileKey = typeof body?.fileKey === "string" ? body.fileKey.trim() : "";
    const caption = typeof body?.caption === "string" ? body.caption.trim() : "";

    if (!fileKey || caption.length > 500) {
      return NextResponse.json({ error: "Invalid arrangement photo." }, { status: 400 });
    }

    await connectToDB();
    const order = await BloomWebsiteOrder.findOne({ _id: orderId, shop: session.user.id });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const expectedPrefix = `bloom-websites/${session.user.id}/orders/${String(order._id)}/arrangements/`;
    if (!fileKey.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid arrangement photo location." }, { status: 400 });
    }

    const cloudFrontBase = process.env.CLOUDFRONT_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    if (!cloudFrontBase) {
      return NextResponse.json({ error: "Website image delivery is not configured." }, { status: 500 });
    }

    const now = new Date();
    const photoId = `BWP_${randomUUID()}`;
    const imageUrl = `${cloudFrontBase.replace(/\/$/, "")}/${fileKey}`;
    const actorLabel = session.user.name || session.user.email || "Florist account";

    order.arrangementPhotos = order.arrangementPhotos || [];
    order.arrangementPhotos.push({
      photoId,
      fileKey,
      imageUrl,
      caption,
      uploadedAt: now,
      uploadedBy: session.user.id,
      sentToCustomerAt: null,
    } as any);

    order.historyEvents = order.historyEvents || [];
    order.historyEvents.push({
      eventId: `BWH_${randomUUID()}`,
      kind: "arrangement_photo_added",
      source: "portal",
      actor: { type: "florist", id: session.user.id, label: actorLabel },
      summary: "Arrangement photo added",
      reason: caption,
      referenceType: "arrangement_photo",
      referenceId: photoId,
      changes: [],
      financialReviewRequired: false,
      occurredAt: now,
    } as any);

    await order.save();

    return NextResponse.json({
      photo: { photoId, imageUrl, caption, uploadedAt: now.toISOString(), sentToCustomerAt: null },
    });
  } catch (error) {
    console.error("Order photo record error:", error);
    return NextResponse.json({ error: "Unable to save the arrangement photo." }, { status: 500 });
  }
}
