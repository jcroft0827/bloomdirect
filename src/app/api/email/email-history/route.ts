// /api/email/email-history/route.ts
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDB();

    const events = await EmailEvent.find().sort({ createdAt: -1 });

    // Ensure safe format for front-end
    const safeEvents = events.map((e) => ({
      _id: e._id.toString(),
      type: e.type || "unknown_type",
      to: e.to || "unknown_recipient",
      subject: e.subject || "No Subject",
      status:
        e.status === "sent" || e.status === "failed" || e.status === "pending"
          ? e.status
          : "failed",
      error: e.error || undefined,
      payload: e.payload || {},
      resendId: e.resendId || undefined,
      createdAt: e.createdAt ? e.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: e.updatedAt ? e.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json(safeEvents);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
