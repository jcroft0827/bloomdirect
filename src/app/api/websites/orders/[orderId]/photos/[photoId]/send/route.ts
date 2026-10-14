import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { sendBloomWebsiteArrangementPhoto } from "@/lib/bloom-websites/orders/sendBloomWebsiteOrderNotifications";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";

type RouteContext = { params: Promise<{ orderId: string; photoId: string }> };

export async function POST(_request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { orderId, photoId } = await params;
    await connectToDB();

    const order = await BloomWebsiteOrder.findOne({ _id: orderId, shop: session.user.id });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    const photo = Array.isArray(order.arrangementPhotos)
      ? order.arrangementPhotos.find((entry: any) => entry.photoId === photoId)
      : null;
    if (!photo) return NextResponse.json({ error: "Arrangement photo not found." }, { status: 404 });

    const sent = await sendBloomWebsiteArrangementPhoto(String(order._id), photoId);
    if (!sent) {
      return NextResponse.json({ error: "The arrangement photo email could not be sent." }, { status: 502 });
    }

    if (!photo.sentToCustomerAt) {
      const now = new Date();
      photo.sentToCustomerAt = now;
      order.historyEvents = order.historyEvents || [];
      order.historyEvents.push({
        eventId: `BWH_${randomUUID()}`,
        kind: "arrangement_photo_sent",
        source: "portal",
        actor: {
          type: "florist",
          id: session.user.id,
          label: session.user.name || session.user.email || "Florist account",
        },
        summary: "Arrangement photo emailed to customer",
        reason: photo.caption || "",
        referenceType: "arrangement_photo",
        referenceId: photoId,
        changes: [],
        financialReviewRequired: false,
        occurredAt: now,
      } as any);
      await order.save();
    }

    return NextResponse.json({ success: true, sentToCustomerAt: photo.sentToCustomerAt });
  } catch (error) {
    console.error("Order arrangement photo send error:", error);
    return NextResponse.json({ error: "Unable to send the arrangement photo." }, { status: 500 });
  }
}
