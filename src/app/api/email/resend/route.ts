import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { sendInviteFloristEmail } from "@/lib/email/inviteFloristEmail";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";

const INVITE_EVENT_TYPES = new Set(["invite_florist", "invite-florist"]);

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await checkBloomWebsiteRateLimit({
      request: req,
      scope: "email-resend",
      subject: session.user.id,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many resend attempts. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json().catch(() => null);
    const emailEventId =
      body && typeof body.emailEventId === "string" ? body.emailEventId : "";

    if (!emailEventId || !mongoose.isValidObjectId(emailEventId)) {
      return NextResponse.json(
        { error: "Missing or invalid emailEventId" },
        { status: 400 },
      );
    }

    await connectToDB();

    const originalEvent = await EmailEvent.findOne({
      _id: emailEventId,
      shopId: session.user.id,
    });

    if (!originalEvent) {
      return NextResponse.json(
        { error: "Email event not found" },
        { status: 404 },
      );
    }

    if (!INVITE_EVENT_TYPES.has(originalEvent.type)) {
      return NextResponse.json(
        { error: "This email type cannot be resent from email history." },
        { status: 400 },
      );
    }

    let newEventData;

    try {
      const result = await sendInviteFloristEmail(originalEvent.payload);

      newEventData = await EmailEvent.create({
        shopId: session.user.id,
        type: "invite_florist",
        to: originalEvent.to,
        subject: originalEvent.subject,
        status: "sent",
        resendId: result.data?.id,
        payload: originalEvent.payload,
      });
    } catch (sendError) {
      const message =
        sendError instanceof Error ? sendError.message : "Unknown resend error";

      newEventData = await EmailEvent.create({
        shopId: session.user.id,
        type: "invite_florist",
        to: originalEvent.to,
        subject: originalEvent.subject,
        status: "failed",
        error: message,
        payload: originalEvent.payload,
      });

      return NextResponse.json(
        { error: "Failed to resend email", details: message },
        { status: 500 },
      );
    }

    return NextResponse.json({ event: newEventData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
