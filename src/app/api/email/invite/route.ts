import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { sendInviteFloristEmail } from "@/lib/email/inviteFloristEmail";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";
import Shop from "@/models/Shop";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();

  const shop = await Shop.findById(session.user.id)
    .select("_id businessName isSuspended isArchived isMarkedSpam")
    .lean<{
      _id: unknown;
      businessName?: string;
      isSuspended?: boolean;
      isArchived?: boolean;
      isMarkedSpam?: boolean;
    } | null>();

  if (!shop) {
    return NextResponse.json({ error: "Shop not found" }, { status: 404 });
  }

  if (shop.isSuspended || shop.isArchived || shop.isMarkedSpam) {
    return NextResponse.json(
      { error: "This account cannot send invitations right now." },
      { status: 403 },
    );
  }

  const rateLimit = await checkBloomWebsiteRateLimit({
    request: req,
    scope: "florist-invite",
    subject: session.user.id,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many invitation attempts. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  let body: Record<string, unknown> = {};

  try {
    body = (await req.json()) as Record<string, unknown>;

    const to = normalizeEmail(body.to);
    const requestedBusinessName =
      typeof body.businessName === "string" ? body.businessName.trim() : "";
    const businessName =
      typeof shop.businessName === "string" && shop.businessName.trim()
        ? shop.businessName.trim()
        : requestedBusinessName;
    const inviteLink =
      typeof body.inviteLink === "string" ? body.inviteLink.trim() : "";
    const personalMessage =
      typeof body.personalMessage === "string"
        ? body.personalMessage.trim().slice(0, 2000)
        : "";

    if (!to || !businessName || !inviteLink) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(to)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    let parsedInviteLink: URL;
    try {
      parsedInviteLink = new URL(inviteLink);
    } catch {
      return NextResponse.json(
        { error: "Invite link is invalid." },
        { status: 400 },
      );
    }

    const allowedHosts = new Set([
      "getbloomdirect.com",
      "www.getbloomdirect.com",
      "localhost",
      "127.0.0.1",
    ]);

    const configuredAppUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXTAUTH_URL;

    if (configuredAppUrl) {
      try {
        allowedHosts.add(new URL(configuredAppUrl).hostname.toLowerCase());
      } catch {
        // Ignore invalid optional configuration here; application boot/config
        // validation is responsible for surfacing it elsewhere.
      }
    }

    if (!allowedHosts.has(parsedInviteLink.hostname.toLowerCase())) {
      return NextResponse.json(
        { error: "Invite link must point to GetBloomDirect." },
        { status: 400 },
      );
    }

    const subject = `You've been invited to join ${businessName} on GetBloomDirect`;

    const result = await sendInviteFloristEmail({
      to,
      businessName,
      inviteLink: parsedInviteLink.toString(),
      personalMessage,
    });

    const emailEvent = await EmailEvent.create({
      shopId: session.user.id,
      type: "invite_florist",
      to,
      subject,
      status: "sent",
      resendId: result.data?.id,
      payload: {
        businessName,
        inviteLink: parsedInviteLink.toString(),
        personalMessage,
      },
    });

    return NextResponse.json({
      success: true,
      emailEventId: emailEvent._id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Invite florist email failed:", error);

    try {
      const to = normalizeEmail(body.to);
      const businessName =
        typeof body.businessName === "string" ? body.businessName.trim() : "";

      if (to) {
        await EmailEvent.create({
          shopId: session.user.id,
          type: "invite_florist",
          to,
          subject: businessName
            ? `You've been invited to join ${businessName} on GetBloomDirect`
            : "GetBloomDirect florist invite",
          status: "failed",
          error: message,
          payload: body,
        });
      }
    } catch (logError) {
      console.error("Failed to log invite email failure:", logError);
    }

    return NextResponse.json(
      { error: "Failed to send invite email" },
      { status: 500 },
    );
  }
}
