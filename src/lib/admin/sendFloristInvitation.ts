import { randomBytes, createHash } from "node:crypto";
import { sendAdminFloristInvitationEmail } from "@/lib/email/adminFloristInvitationEmail";
import { EmailEvent } from "@/models/EmailEvent";
import InvitedFlorist from "@/models/InvitedFlorist";

type SendFloristInvitationParams = {
  invitationId: string;
  invitedByName: string;
  invitedByShopId: string;
  personalMessage?: string;
};

type SendFloristInvitationResult =
  | {
      success: true;
      invitation: InstanceType<typeof InvitedFlorist>;
    }
  | {
      success: false;
      error: string;
      invitation: InstanceType<typeof InvitedFlorist>;
    };

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function sendFloristInvitation({
  invitationId,
  invitedByName,
  invitedByShopId,
  personalMessage,
}: SendFloristInvitationParams): Promise<SendFloristInvitationResult> {
  const invitation = await InvitedFlorist.findById(invitationId);

  if (!invitation) {
    throw new Error("Invited florist not found.");
  }

  // A fresh invitation link expires after 30 days; resending invalidates the previous link.
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://getbloomdirect.com").replace(/\/$/, "");
  const inviteUrl = `${appUrl}/register?earlyAccess=${encodeURIComponent(rawToken)}`;
  const subject = `${invitation.shopName}, you’re invited to join GetBloomDirect`;

  try {
    const emailResult = await sendAdminFloristInvitationEmail({
      to: invitation.email,
      shopName: invitation.shopName,
      contactName: invitation.contactName,
      inviteLink: inviteUrl,
      invitedByName,
      personalMessage: personalMessage?.trim(),
    });

    const resendEmailId = emailResult.data?.id || "";
    const sentAt = new Date();

    invitation.earlyAccessTokenHash = tokenHash;
    invitation.earlyAccessExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    invitation.invitationUrl = inviteUrl;
    invitation.status = "sent";
    invitation.lastSentAt = sentAt;
    invitation.lastContactedAt = sentAt;
    invitation.sendCount = (invitation.sendCount || 0) + 1;
    invitation.resendEmailId = resendEmailId;
    invitation.sendError = "";

    await invitation.save();

    await EmailEvent.create({
      shopId: invitedByShopId,
      type: "admin_invite_florist",
      to: invitation.email,
      subject,
      status: "sent",
      resendId: resendEmailId,
      payload: {
        invitedFloristId: invitation._id,
        shopName: invitation.shopName,
        contactName: invitation.contactName,
        invitationUrl: invitation.invitationUrl,
        invitationDestination: invitation.invitationDestination,
        personalMessage: personalMessage?.trim() || "",
        invitedBy: invitedByShopId,
      },
    });

    return {
      success: true,
      invitation,
    };
  } catch (emailError: unknown) {
    const message = getErrorMessage(emailError);

    invitation.status = "failed";
    invitation.lastContactedAt = new Date();
    invitation.sendCount = (invitation.sendCount || 0) + 1;
    invitation.sendError = message;

    await invitation.save();

    try {
      await EmailEvent.create({
        shopId: invitedByShopId,
        type: "admin_invite_florist",
        to: invitation.email,
        subject,
        status: "failed",
        error: message,
        payload: {
          invitedFloristId: invitation._id,
          shopName: invitation.shopName,
          contactName: invitation.contactName,
          invitationUrl: invitation.invitationUrl,
          invitationDestination: invitation.invitationDestination,
          personalMessage: personalMessage?.trim() || "",
          invitedBy: invitedByShopId,
        },
      });
    } catch (logError) {
      console.error(
        "Failed to log admin invitation email failure:",
        logError,
      );
    }

    return {
      success: false,
      error: message,
      invitation,
    };
  }
}