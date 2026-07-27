import { Resend } from "resend";

import { EmailEvent } from "@/models/EmailEvent";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendPasswordResetEmailParams = {
  to: string;
  businessName?: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail({
  to,
  businessName,
  resetUrl,
}: SendPasswordResetEmailParams) {
  const subject = "Reset your GetBloomDirect password";

  const payload = {
    businessName: businessName ?? null,
    resetRequested: true,
  };

  try {
    const result = await resend.emails.send({
      from: "GetBloomDirect <noreply@getbloomdirect.com>",
      to,
      subject,
      html: `
        <div
          style="
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #1f2937;
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
          "
        >
          <h2 style="margin-bottom: 16px;">
            Reset Your Password
          </h2>

          <p>
            Hi${businessName ? ` ${businessName}` : ""},
          </p>

          <p>
            We received a request to reset the password for your
            GetBloomDirect account.
          </p>

          <p style="margin: 28px 0;">
            <a
              href="${resetUrl}"
              style="
                display: inline-block;
                background-color: #7c3aed;
                color: #ffffff;
                padding: 12px 20px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: bold;
              "
            >
              Reset Password
            </a>
          </p>

          <p>
            This link expires in 30 minutes and can only be used once.
          </p>

          <p>
            If you did not request this reset, you can safely ignore
            this email. Your password will remain unchanged.
          </p>

          <p style="margin-top: 32px; font-size: 14px; color: #6b7280;">
            GetBloomDirect<br />
            The Fee-Free Florist-to-Florist Order Network
          </p>
        </div>
      `,
    });

    if (result.error) {
      await EmailEvent.create({
        type: "password_reset",
        to,
        subject,
        status: "failed",
        error: result.error.message,
        payload,
      });

      throw new Error(result.error.message);
    }

    await EmailEvent.create({
      type: "password_reset",
      to,
      subject,
      status: "sent",
      resendId: result.data?.id,
      payload,
    });

    return result.data;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown password-reset email error";

    console.error("PASSWORD RESET EMAIL ERROR:", message);

    throw error;
  }
}