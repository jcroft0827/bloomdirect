import { NextResponse } from "next/server";

import { sendFloristInvitation } from "@/lib/admin/sendFloristInvitation";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectToDB } from "@/lib/mongoose";
import InvitedFlorist from "@/models/InvitedFlorist";

type ResendInvitationBody = {
  personalMessage?: string;
};

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status },
    );
  }

  try {
    const { id } = await context.params;
    const body = (await req.json()) as ResendInvitationBody;

    await connectToDB();

    const invitation = await InvitedFlorist.findById(id);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invited florist not found." },
        { status: 404 },
      );
    }

    if (invitation.status === "registered") {
      return NextResponse.json(
        {
          error:
            "This florist has already registered and no longer needs an invitation.",
        },
        { status: 400 },
      );
    }

    if (invitation.status === "declined") {
      return NextResponse.json(
        {
          error:
            "This florist is marked as declined. Update their Customer Success status before sending another invitation.",
        },
        { status: 400 },
      );
    }

    const sendResult = await sendFloristInvitation({
      invitationId: invitation._id.toString(),
      invitedByName:
        admin.session.user.name || "The GetBloomDirect Team",
      invitedByShopId: admin.adminShopId.toString(),
      personalMessage: body.personalMessage,
    });

    if (!sendResult.success) {
      return NextResponse.json(
        {
          error: "The invitation email could not be sent.",
          invitation: sendResult.invitation,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      invitation: sendResult.invitation,
    });
  } catch (error: unknown) {
    console.error("Failed to resend florist invitation:", error);

    return NextResponse.json(
      {
        error: "Failed to resend the florist invitation.",
      },
      { status: 500 },
    );
  }
}