// lib/email/templates/inviteFlorist.ts
import { InviteFloristVariables } from "../email-types";

export function inviteFloristTemplate(vars: InviteFloristVariables) {
  const personalMessageSection = vars.personalMessage
    ? `
<tr>
<td style="padding: 20px; background-color: #f8f9fc; border-left: 4px solid #7c3aed;">
<p style="margin: 0 0 8px 0; font-weight: 600; color: #4c1d95;">
Personal message from ${vars.inviterName}:
</p>
<p style="margin: 0; color: #374151; white-space: pre-line;">
${vars.personalMessage}
</p>
</td>
</tr>
`
    : "";

  return {
    subject: `${vars.inviterName} invited you to join BloomDirect 🌸`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
<tr>
<td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08);">
<!-- Header -->
<tr>
<td style="background: linear-gradient(135deg, #10b981, #14b8a6); padding: 32px; text-align: center;">
<h1 style="margin: 0; color: #ffffff; font-size: 28px;">
You’re invited to BloomDirect 🌸
</h1>
<p style="margin-top: 8px; color: #ecfeff; font-size: 16px;">
A florist-to-florist delivery network
</p>
</td>
</tr>


<!-- Body -->
<tr>
<td style="padding: 32px;">
<p style="font-size: 16px; color: #374151;">
Hi there,
</p>


<p style="font-size: 16px; color: #374151;">
<strong>${vars.inviterName}</strong> from
<strong>${vars.shopName}</strong> invited you to join
<strong>BloomDirect</strong>.
</p>


<p style="font-size: 16px; color: #374151;">
BloomDirect helps independent florists:
</p>


<ul style="font-size: 16px; color: #374151; padding-left: 20px;">
<li>Skip wire service fees</li>
<li>Keep more of every order</li>
<li>Work directly with trusted local shops</li>
</ul>


${personalMessageSection}


<div style="text-align: center; margin: 36px 0;">
<a
href="${vars.inviteLink}"
style="
background-color: #7c3aed;
color: #ffffff;
padding: 14px 28px;
border-radius: 9999px;
font-size: 16px;
font-weight: 600;
text-decoration: none;
display: inline-block;
"
>
Join BloomDirect
</a>
</div>


<p style="font-size: 14px; color: #6b7280;">
Joining is free. Upgrade to Pro anytime.
</p>


<p style="font-size: 14px; color: #9ca3af; margin-top: 32px;">
— The BloomDirect Team
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
  };
}
