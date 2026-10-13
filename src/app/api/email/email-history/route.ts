import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const events = await EmailEvent.find({ shopId: session.user.id })
      .sort({ createdAt: -1 })
      .limit(250);

    const safeEvents = events.map((event) => ({
      _id: event._id.toString(),
      type: event.type || "unknown_type",
      to: event.to || "unknown_recipient",
      subject: event.subject || "No Subject",
      status: event.status === "sent" ? "sent" : "failed",
      error: event.error || undefined,
      resendId: event.resendId || undefined,
      createdAt: event.createdAt
        ? event.createdAt.toISOString()
        : new Date().toISOString(),
      updatedAt: event.updatedAt
        ? event.updatedAt.toISOString()
        : new Date().toISOString(),
    }));

    return NextResponse.json(safeEvents);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
