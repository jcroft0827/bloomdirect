import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type InviteFloristEmailInput = {
  to: string;
  shopName: string;
  inviteLink: string;
  personalMessage?: string;
};

export async function sendInviteFloristEmail(input: InviteFloristEmailInput) {
  const messageSection = input.personalMessage
    ? `
      <p><em>Personal message from ${input.shopName}:</em></p>
      <blockquote>${input.personalMessage}</blockquote>
    `
    : "";

  return resend.emails.send({
    from: "Get Bloom Direct <no-reply@getbloomdirect.com>",
    to: input.to,
    subject: `You’ve been invited to join ${input.shopName} on Get Bloom Direct`,
    html: `
<div style="background-color: #f9f9f9; padding: 40px 20px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
  <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 8px; border-top: 6px solid #af4ee4; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <tr>
      <td style="padding: 40px 30px;">
        <h1 style="color: #333333; font-size: 24px; margin-top: 0;">Hi there,</h1>
        
        <p style="color: #555555; font-size: 16px; line-height: 1.6;">
          <strong style="color: #af4ee4;">${input.shopName}</strong> has invited you to join <span style="font-weight: bold; color: #333333;">GetBloomDirect</span>.
        </p>

        <div style="margin: 25px 0; border-left: 4px solid #af4ee4; padding-left: 20px; color: #666666; font-style: italic;">
          ${messageSection}
        </div>

        <table border="0" cellspacing="0" cellpadding="0" style="margin: 35px 0;">
          <tr>
            <td align="center" bgcolor="#06906a" style="border-radius: 5px;">
              <a href="${input.inviteLink}" target="_blank" style="font-size: 18px; font-weight: bold; color: #ffffff; text-decoration: none; padding: 15px 30px; display: inline-block; border-radius: 5px; border: 1px solid #06906a;">
                Accept Invitation
              </a>
            </td>
          </tr>
        </table>

        <p style="color: #999999; font-size: 14px; margin-bottom: 0;">
          – Get Bloom Direct
        </p>
      </td>
    </tr>
  </table>
</div>
    `,
  });
}
