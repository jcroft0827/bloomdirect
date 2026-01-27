// /app/api/email/send/route.ts

import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email/sendEmail";
import { SendEmailPayload } from "@/lib/email/email-types";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SendEmailPayload;

    await sendEmail(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("EMAIL SEND ERROR:", error);

    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 },
    );
  }
}
