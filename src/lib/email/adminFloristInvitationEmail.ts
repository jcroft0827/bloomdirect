import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type AdminFloristInvitationEmailInput = {
  to: string;
  shopName: string;
  contactName?: string;
  inviteLink: string;
  invitedByName?: string;
  personalMessage?: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendAdminFloristInvitationEmail({
  to,
  shopName,
  contactName,
  inviteLink,
  invitedByName,
  personalMessage,
}: AdminFloristInvitationEmailInput) {
  const greetingName = contactName?.trim() || "there";
  const senderName = invitedByName?.trim() || "The GetBloomDirect Team";

  const safeGreetingName = escapeHtml(greetingName);
  const safeShopName = escapeHtml(shopName);
  const safeSenderName = escapeHtml(senderName);
  const safeInviteLink = escapeHtml(inviteLink);

  const personalMessageSection = personalMessage?.trim()
    ? `
      <tr>
        <td style="padding: 0 36px 28px;">
          <div style="
            border-left: 4px solid #8b5cf6;
            background-color: #faf7ff;
            border-radius: 0 10px 10px 0;
            padding: 18px 20px;
          ">
            <p style="
              margin: 0 0 8px;
              color: #6d28d9;
              font-size: 13px;
              font-weight: 700;
              letter-spacing: 0.04em;
              text-transform: uppercase;
            ">
              A personal note
            </p>

            <p style="
              margin: 0;
              color: #4b5563;
              font-size: 15px;
              line-height: 1.7;
              white-space: pre-line;
            ">
              ${escapeHtml(personalMessage.trim())}
            </p>
          </div>
        </td>
      </tr>
    `
    : "";

  const result = await resend.emails.send({
    from: "GetBloomDirect <no-reply@getbloomdirect.com>",
    to,
    subject: `${shopName}, you’re invited to join GetBloomDirect`,
    html: `
      <!doctype html>
      <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>You're invited to GetBloomDirect</title>
        </head>

        <body style="
          margin: 0;
          padding: 0;
          background-color: #f4f5f7;
          font-family: Arial, Helvetica, sans-serif;
        ">
          <table
            role="presentation"
            width="100%"
            cellspacing="0"
            cellpadding="0"
            border="0"
            style="background-color: #f4f5f7;"
          >
            <tr>
              <td align="center" style="padding: 40px 16px;">
                <table
                  role="presentation"
                  width="100%"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  style="
                    max-width: 640px;
                    background-color: #ffffff;
                    border-radius: 18px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(17, 24, 39, 0.08);
                  "
                >
                  <tr>
                    <td style="
                      padding: 24px 36px;
                      background-color: #6d28d9;
                    ">
                      <p style="
                        margin: 0;
                        color: #ffffff;
                        font-size: 24px;
                        font-weight: 800;
                      ">
                        GetBloomDirect
                      </p>

                      <p style="
                        margin: 5px 0 0;
                        color: #ede9fe;
                        font-size: 14px;
                      ">
                        Florists helping florists
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 38px 36px 20px;">
                      <p style="
                        margin: 0 0 16px;
                        color: #111827;
                        font-size: 24px;
                        font-weight: 800;
                        line-height: 1.3;
                      ">
                        Hi ${safeGreetingName},
                      </p>

                      <p style="
                        margin: 0 0 18px;
                        color: #4b5563;
                        font-size: 16px;
                        line-height: 1.7;
                      ">
                        Thank you for taking the time to learn more about
                        GetBloomDirect. We would like to personally invite
                        <strong style="color: #111827;">
                          ${safeShopName}
                        </strong>
                        to join our growing network of independent florists.
                      </p>

                      <p style="
                        margin: 0 0 18px;
                        color: #4b5563;
                        font-size: 16px;
                        line-height: 1.7;
                      ">
                        GetBloomDirect is a florist-to-florist order network
                        designed to help local flower shops send and receive
                        orders directly—without traditional wire-service fees.
                      </p>
                    </td>
                  </tr>

                  <tr>
                    <td style="padding: 0 36px 26px;">
                      <table
                        role="presentation"
                        width="100%"
                        cellspacing="0"
                        cellpadding="0"
                        border="0"
                        style="
                          background-color: #f9fafb;
                          border: 1px solid #e5e7eb;
                          border-radius: 12px;
                        "
                      >
                        <tr>
                          <td style="padding: 22px;">
                            <p style="
                              margin: 0 0 14px;
                              color: #111827;
                              font-size: 16px;
                              font-weight: 700;
                            ">
                              With GetBloomDirect, your shop can:
                            </p>

                            <p style="
                              margin: 0 0 10px;
                              color: #4b5563;
                              font-size: 15px;
                              line-height: 1.6;
                            ">
                              ✓ Send orders directly to trusted local florists
                            </p>

                            <p style="
                              margin: 0 0 10px;
                              color: #4b5563;
                              font-size: 15px;
                              line-height: 1.6;
                            ">
                              ✓ Receive florist-to-florist orders without
                              wire-service commissions
                            </p>

                            <p style="
                              margin: 0 0 10px;
                              color: #4b5563;
                              font-size: 15px;
                              line-height: 1.6;
                            ">
                              ✓ Build lasting relationships with other
                              independent flower shops
                            </p>

                            <p style="
                              margin: 0;
                              color: #4b5563;
                              font-size: 15px;
                              line-height: 1.6;
                            ">
                              ✓ Start with Bloom Free and upgrade only when it
                              makes sense for your business
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${personalMessageSection}

                  <tr>
                    <td align="center" style="padding: 0 36px 32px;">
                      <a
                        href="${safeInviteLink}"
                        target="_blank"
                        style="
                          display: inline-block;
                          background-color: #059669;
                          border-radius: 9px;
                          color: #ffffff;
                          font-size: 16px;
                          font-weight: 700;
                          padding: 15px 30px;
                          text-decoration: none;
                        "
                      >
                        Get Started
                      </a>
                    </td>
                  </tr>

                  <tr>
                    <td style="
                      padding: 24px 36px 32px;
                      border-top: 1px solid #e5e7eb;
                    ">
                      <p style="
                        margin: 0 0 8px;
                        color: #4b5563;
                        font-size: 14px;
                        line-height: 1.6;
                      ">
                        We would be happy to answer any questions you may have.
                      </p>

                      <p style="
                        margin: 0 0 18px;
                        color: #4b5563;
                        font-size: 14px;
                        line-height: 1.6;
                      ">
                        Sincerely,<br />
                        <strong>${safeSenderName}</strong><br />
                        GetBloomDirect
                      </p>

                      <p style="
                        margin: 0 0 6px;
                        color: #9ca3af;
                        font-size: 12px;
                        line-height: 1.6;
                      ">
                        You received this email because someone from
                        GetBloomDirect recently spoke with your shop or believed
                        the platform could be helpful to your business.
                      </p>

                      <p style="
                        margin: 0;
                        color: #9ca3af;
                        font-size: 12px;
                        line-height: 1.6;
                      ">
                        © ${new Date().getFullYear()} GetBloomDirect
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
  });

  if (result.error) {
    throw new Error(
      result.error.message || "Resend failed to send the invitation email.",
    );
  }

  return result;
}