// /api/email/resend/route.ts
import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";
import { sendInviteFloristEmail } from "@/lib/email/inviteFloristEmail";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("🔥 RESEND API HIT");
    console.log("BODY:", body);
    const { emailEventId } = body;

    if (!emailEventId) {
      return NextResponse.json(
        { error: "Missing emailEventId" },
        { status: 400 },
      );
    }

    await connectToDB();

    // Find the original email event
    const originalEvent = await EmailEvent.findById(emailEventId);

    if (!originalEvent) {
      return NextResponse.json(
        { error: "Email event not found" },
        { status: 404 },
      );
    }

    let newEventData;

    // Determine email type and send
    if (originalEvent.type === "invite-florist") {
      try {
        const result = await sendInviteFloristEmail(originalEvent.payload);

        // Create new EmailEvent as sent
        newEventData = await EmailEvent.create({
          type: originalEvent.type,
          to: originalEvent.to,
          subject: originalEvent.subject,
          status: "sent",
          resendId: result.data?.id,
          payload: originalEvent.payload,
        });
      } catch (sendError) {
        // Create new EmailEvent as failed
        const message =
          sendError instanceof Error
            ? sendError.message
            : JSON.stringify(sendError);
        console.error("Resend send error:", message);

        newEventData = await EmailEvent.create({
          type: originalEvent.type,
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
    } else {
      return NextResponse.json(
        { error: "Unsupported email type" },
        { status: 400 },
      );
    }

    return NextResponse.json({ event: newEventData });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
