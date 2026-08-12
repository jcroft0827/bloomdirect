import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectToDB } from "@/lib/mongoose";
import InvitedFlorist from "@/models/InvitedFlorist";

type UpdateInvitationBody = {
  action?: "update_notes" | "mark_contacted" | "mark_declined";
  notes?: string;
};

export async function PATCH(
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
    const body = (await req.json()) as UpdateInvitationBody;

    if (!body.action) {
      return NextResponse.json(
        { error: "An action is required." },
        { status: 400 },
      );
    }

    await connectToDB();

    const invitation = await InvitedFlorist.findById(id);

    if (!invitation) {
      return NextResponse.json(
        { error: "Invited florist not found." },
        { status: 404 },
      );
    }

    switch (body.action) {
      case "update_notes": {
        invitation.notes = body.notes?.trim() || "";
        break;
      }

      case "mark_contacted": {
        invitation.lastContactedAt = new Date();
        break;
      }

      case "mark_declined": {
        if (invitation.status === "registered") {
          return NextResponse.json(
            {
              error:
                "A registered florist cannot be marked as declined.",
            },
            { status: 400 },
          );
        }

        invitation.status = "declined";
        invitation.declinedAt = new Date();
        invitation.lastContactedAt = new Date();

        if (typeof body.notes === "string") {
          invitation.notes = body.notes.trim();
        }

        break;
      }

      default: {
        return NextResponse.json(
          { error: "Invalid Customer Success action." },
          { status: 400 },
        );
      }
    }

    await invitation.save();

    return NextResponse.json({
      success: true,
      invitation,
    });
  } catch (error: unknown) {
    console.error(
      "Failed to update invited florist:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to update the invited florist.",
      },
      { status: 500 },
    );
  }
}