// /app/api/invites/send/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Invite from "@/models/Invite";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmail } from "@/lib/email/sendEmail";

export async function POST(req: Request) {
  await connectToDB();

  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as {
    email: string;
    message?: string;
  };

  const { email, message } = body;

  // prevent duplicate pending invites
  const existing = await Invite.findOne({
    email,
    acceptedAt: null,
    expiresAt: { $gt: new Date() },
  });

  if (existing) {
    return NextResponse.json({ error: "Invite already sent" }, { status: 400 });
  }

  const token = crypto.randomUUID();

  const invite = await Invite.create({
    email,
    token,
    invitedByShopId: session.user.shopId,
    invitedByUserId: session.user.id,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
  });

  // Development Link
  const inviteLink = `${process.env.NEXT_PUBLIC_URL}/invite/${token}`;

  await sendEmail({
    type: "INVITE_FLORIST",
    to: email,
    variables: {
        inviterName: session.user.shopName,
        inviteLink,
        personalMessage: message || undefined,
    },
    shopId: session.user.shopId,
    actorId: session.user.id,
    metadata: { message },
  });

  return NextResponse.json({ success: true });
}
