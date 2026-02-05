import { sendInviteFloristEmail } from "@/lib/email/inviteFloristEmail";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const { to, shopName, inviteLink, personalMessage } = body;

  if (!to || !shopName || !inviteLink) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  await connectToDB();

  try {
    const result = await sendInviteFloristEmail({
      to,
      shopName,
      inviteLink,
      personalMessage,
    });

    await EmailEvent.create({
      type: "invite-florist",
      to,
      subject: `You've been invited to join ${shopName} on GetBloomDirect`,
      status: "sent",
      resendId: result.data?.id,
      payload: {
        shopName,
        inviteLink,
        personalMessage,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    await EmailEvent.create({
        type: 'invite-florist',
        to,
        subject: `You've been invited to join ${shopName} on GetBloomDirect`,
        status: 'failed',
        error: error.message,
        payload: {
            to,
            shopName,
            inviteLink,
            personalMessage,
        },
    });

    return NextResponse.json(
        { error: 'Failed to send invite email' },
        { status: 500 }
    );
  }
}
