// /lib/email/sendEmail.ts

import { Resend } from "resend";
import { SendEmailPayload } from "./email-types";
import { renderEmail } from "./templates";

const resend = new Resend(process.env.RESEND_API_KEY!);

export async function sendEmail<T extends SendEmailPayload>(payload: T) {
  const {
    type,
    to,
    variables,
    from = "BloomDirect <no-reply@getbloomdirect.com>",
    subjectOverride,
  } = payload;

  const template = renderEmail(type, variables);

  return resend.emails.send({
    from,
    to,
    subject: subjectOverride ?? template.subject,
    html: template.html,
  });
}
