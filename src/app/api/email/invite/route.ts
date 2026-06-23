// app/api/email/invite/route.ts

import { sendInviteFloristEmail } from "@/lib/email/inviteFloristEmail";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectToDB();

  let body: any = {};

  try {
    body = await req.json();

    const { to, businessName, inviteLink, personalMessage } = body;

    if (!to || !businessName || !inviteLink) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subject = `You've been invited to join ${businessName} on GetBloomDirect`;

    const result = await sendInviteFloristEmail({
      to,
      businessName,
      inviteLink,
      personalMessage,
    });

    const emailEvent = await EmailEvent.create({
      type: "invite_florist",
      to,
      subject,
      status: "sent",
      resendId: result.data?.id,
      payload: {
        businessName,
        inviteLink,
        personalMessage,
      },
    });

    return NextResponse.json({
      success: true,
      emailEventId: emailEvent._id,
    });
  } catch (error: any) {
    console.error("Invite florist email failed:", error);

    try {
      await EmailEvent.create({
        type: "invite_florist",
        to: body?.to,
        subject: body?.businessName
          ? `You've been invited to join ${body.businessName} on GetBloomDirect`
          : "GetBloomDirect florist invite",
        status: "failed",
        error: error.message || "Unknown error",
        payload: body,
      });
    } catch (logError) {
      console.error("Failed to log invite email failure:", logError);
    }

    return NextResponse.json(
      { error: "Failed to send invite email" },
      { status: 500 }
    );
  }
}