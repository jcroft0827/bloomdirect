import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { sendAdminFloristInvitationEmail } from "@/lib/email/adminFloristInvitationEmail";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";
import InvitedFlorist from "@/models/InvitedFlorist";

type InvitationDestination = "homepage" | "registration";

type CreateInvitationBody = {
  shopName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  website?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  notes?: string;
  personalMessage?: string;
  source?: string;
  invitationDestination?: InvitationDestination;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getApplicationUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "https://getbloomdirect.com"
  ).replace(/\/$/, "");
}

function buildInvitationUrl(destination: InvitationDestination) {
  const baseUrl = getApplicationUrl();

  return destination === "homepage"
    ? baseUrl
    : `${baseUrl}/register`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function GET() {
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status },
    );
  }

  try {
    await connectToDB();

    const invitations = await InvitedFlorist.find({})
      .populate("invitedBy", "shopName businessName email")
      .populate(
        "registeredShop",
        "shopName businessName email slug",
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      invitations,
    });
  } catch (error: unknown) {
    console.error("Failed to load invited florists:", error);

    return NextResponse.json(
      { error: "Failed to load invited florists." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const body = (await req.json()) as CreateInvitationBody;

    const shopName = body.shopName?.trim();
    const contactName = body.contactName?.trim();
    const email = body.email ? normalizeEmail(body.email) : "";

    const invitationDestination =
      body.invitationDestination || "registration";

    if (!shopName || !contactName || !email) {
      return NextResponse.json(
        {
          error: "Shop name, contact name, and email are required.",
        },
        { status: 400 },
      );
    }

    if (!email.includes("@") || !email.includes(".")) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 },
      );
    }

    if (
      invitationDestination !== "homepage" &&
      invitationDestination !== "registration"
    ) {
      return NextResponse.json(
        { error: "Invalid invitation destination." },
        { status: 400 },
      );
    }

    await connectToDB();

    const existingInvitation = await InvitedFlorist.findOne({
      email,
      status: {
        $in: ["draft", "sent", "failed", "registered"],
      },
    })
      .sort({ createdAt: -1 })
      .lean();

    if (existingInvitation) {
      return NextResponse.json(
        {
          error: "This florist has already been invited.",
          duplicate: true,
          invitation: existingInvitation,
        },
        { status: 409 },
      );
    }

    const invitationUrl = buildInvitationUrl(invitationDestination);
    const now = new Date();

    const invitation = await InvitedFlorist.create({
      shopName,
      contactName,
      email,

      phone: body.phone?.trim() || "",
      website: body.website?.trim() || "",

      address: {
        street: body.address?.street?.trim() || "",
        city: body.address?.city?.trim() || "",
        state: body.address?.state?.trim().toUpperCase() || "",
        zip: body.address?.zip?.trim() || "",
      },

      notes: body.notes?.trim() || "",
      source: body.source || "other",

      invitationDestination,
      invitationUrl,

      status: "draft",
      invitedBy: admin.adminShopId,
      invitedAt: now,
      lastContactedAt: now,
      sendCount: 0,
    });

    const subject = `${shopName}, you’re invited to join GetBloomDirect`;

    try {
      const emailResult = await sendAdminFloristInvitationEmail({
        to: email,
        shopName,
        contactName,
        inviteLink: invitationUrl,
        invitedByName:
          admin.session.user.name || "The GetBloomDirect Team",
        personalMessage: body.personalMessage?.trim(),
      });

      const resendEmailId = emailResult.data?.id || "";
      const sentAt = new Date();

      invitation.status = "sent";
      invitation.lastSentAt = sentAt;
      invitation.lastContactedAt = sentAt;
      invitation.sendCount = 1;
      invitation.resendEmailId = resendEmailId;
      invitation.sendError = "";

      await invitation.save();

      await EmailEvent.create({
        type: "admin_invite_florist",
        to: email,
        subject,
        status: "sent",
        resendId: resendEmailId,
        payload: {
          invitedFloristId: invitation._id,
          shopName,
          contactName,
          invitationUrl,
          invitationDestination,
          personalMessage: body.personalMessage?.trim() || "",
          invitedBy: admin.adminShopId,
        },
      });

      return NextResponse.json(
        {
          success: true,
          invitation,
        },
        { status: 201 },
      );
    } catch (emailError: unknown) {
      const message = getErrorMessage(emailError);

      invitation.status = "failed";
      invitation.sendCount = 1;
      invitation.sendError = message;
      invitation.lastContactedAt = new Date();

      await invitation.save();

      try {
        await EmailEvent.create({
          type: "admin_invite_florist",
          to: email,
          subject,
          status: "failed",
          error: message,
          payload: {
            invitedFloristId: invitation._id,
            shopName,
            contactName,
            invitationUrl,
            invitationDestination,
            invitedBy: admin.adminShopId,
          },
        });
      } catch (logError) {
        console.error(
          "Failed to log admin invitation email failure:",
          logError,
        );
      }

      return NextResponse.json(
        {
          error:
            "The florist was saved, but the invitation email could not be sent.",
          invitation,
        },
        { status: 502 },
      );
    }
  } catch (error: unknown) {
    console.error(
      "Failed to create admin florist invitation:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to create the florist invitation.",
      },
      { status: 500 },
    );
  }
}