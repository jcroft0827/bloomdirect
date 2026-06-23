import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

type DecisionEmailInput = {
  to: string;
  shopName: string;
  websiteUrl: string;
};

export async function sendWebsiteApprovedEmail({
  to,
  shopName,
  websiteUrl,
}: DecisionEmailInput) {
  return resend.emails.send({
    from: "GetBloomDirect <no-reply@getbloomdirect.com>",
    to,
    subject: "Your website has been verified on GetBloomDirect",
    html: `
      <div style="background:#f7f7fb;padding:32px;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;border-top:6px solid #059669;">
          <h1 style="margin:0 0 12px;color:#111827;">Website Approved</h1>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Hi ${shopName},
          </p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Good news — your website has been reviewed and approved on GetBloomDirect.
          </p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Verified website:
            <br />
            <a href="${websiteUrl}" target="_blank" style="color:#6d28d9;font-weight:bold;">${websiteUrl}</a>
          </p>
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">
            – GetBloomDirect
          </p>
        </div>
      </div>
        `,
  });
}

export async function sendWebsiteDeclinedEmail({
  to,
  shopName,
  websiteUrl,
}: DecisionEmailInput) {
  return resend.emails.send({
    from: "GetBloomDirect <no-reply@getbloomdirect.com>",
    to,
    subject: "Your website verifictaion needs attention",
    html: `
                <div style="background:#f7f7fb;padding:32px;font-family:Arial,sans-serif;">
        <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:14px;padding:28px;border-top:6px solid #dc2626;">
          <h1 style="margin:0 0 12px;color:#111827;">Website Verification Declined</h1>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Hi ${shopName},
          </p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            We reviewed your website, but we were not able to approve it for automatic verification at this time.
          </p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            Website reviewed:
            <br />
            <a href="${websiteUrl}" target="_blank" style="color:#6d28d9;font-weight:bold;">${websiteUrl}</a>
          </p>
          <p style="color:#374151;font-size:16px;line-height:1.6;">
            If you have questions, please contact us at
            <strong>716-566-0673</strong>.
          </p>
          <p style="color:#6b7280;font-size:14px;margin-top:24px;">
            – GetBloomDirect
          </p>
        </div>
      </div>
        `,
  });
}
