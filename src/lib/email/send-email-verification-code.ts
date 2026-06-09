// lib/email/send-email-verification-code.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type SendEmailVerificationCodeParams = {
  to: string;
  code: string;
  businessName?: string;
};

export async function sendEmailVerificationCode({
  to,
  code,
  businessName,
}: SendEmailVerificationCodeParams) {
  await resend.emails.send({
    from: "GetBloomDirect <noreply@getbloomdirect.com>",
    to,
    subject: "Your GetBloomDirect verification code",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <h2>Email Verification</h2>
        <p>Hi${businessName ? ` ${businessName}` : ""},</p>
        <p>Your GetBloomDirect verification code is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">${code}</p>
        <p>This code expires in 10 minutes.</p>
        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
}