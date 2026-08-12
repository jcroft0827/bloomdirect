import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectToDB } from "@/lib/mongoose";
import InvitedFlorist from "@/models/InvitedFlorist";
import { sendFloristInvitation } from "@/lib/admin/sendFloristInvitation";

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

  return destination === "homepage" ? baseUrl : `${baseUrl}/register`;
}

export async function GET() {
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    await connectToDB();

    const invitations = await InvitedFlorist.find({})
      .populate("invitedBy", "shopName businessName email")
      .populate("registeredShop", "shopName businessName email slug")
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
    return NextResponse.json({ error: admin.error }, { status: admin.status });
  }

  try {
    const body = (await req.json()) as CreateInvitationBody;

    const shopName = body.shopName?.trim();
    const contactName = body.contactName?.trim();
    const email = body.email ? normalizeEmail(body.email) : "";

    const invitationDestination = body.invitationDestination || "registration";

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

    const sendResult = await sendFloristInvitation({
      invitationId: invitation._id.toString(),
      invitedByName: admin.session.user.name || "The GetBloomDirect Team",
      invitedByShopId: admin.adminShopId.toString(),
      personalMessage: body.personalMessage,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error:
            "The florist was saved, but the invitation email could not be sent.",
          invitation: sendResult.invitation,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        invitation: sendResult.invitation,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("Failed to create admin florist invitation:", error);

    return NextResponse.json(
      {
        error: "Failed to create the florist invitation.",
      },
      { status: 500 },
    );
  }
}
