import crypto from "crypto";
import { NextResponse } from "next/server";

import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

const RESET_TOKEN_EXPIRATION_MINUTES = 30;

function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function hashResetToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function getApplicationUrl() {
  const applicationUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    process.env.NEXTAUTH_URL;

  if (!applicationUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_APP_URL, APP_URL, or NEXTAUTH_URL.",
    );
  }

  return applicationUrl.replace(/\/$/, "");
}

export async function POST(req: Request) {
  const genericResponse = {
    success: true,
    message:
      "If an account exists for that email address, a password reset link has been sent.",
  };

  try {
    await connectToDB();

    const body = await req.json();
    const email = body?.email;

    if (
      typeof email !== "string" ||
      !email.trim()
    ) {
      return NextResponse.json(
        {
          error: "Please enter your email address.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email
      .toLowerCase()
      .trim();

    const shop = await Shop.findOne({
      email: normalizedEmail,
    }).select(
      "+passwordResetTokenHash +passwordResetExpires businessName email",
    );

    /*
     * Always return the same response when the account does not exist.
     * This prevents account enumeration.
     */
    if (!shop) {
      return NextResponse.json(genericResponse);
    }

    const rawToken = createResetToken();
    const tokenHash = hashResetToken(rawToken);

    const expiration = new Date(
      Date.now() +
        RESET_TOKEN_EXPIRATION_MINUTES * 60 * 1000,
    );

    shop.passwordResetTokenHash = tokenHash;
    shop.passwordResetExpires = expiration;

    await shop.save();

    const applicationUrl = getApplicationUrl();

    const resetUrl =
      `${applicationUrl}/reset-password` +
      `?token=${encodeURIComponent(rawToken)}` +
      `&email=${encodeURIComponent(shop.email)}`;

    try {
      await sendPasswordResetEmail({
        to: shop.email,
        businessName: shop.businessName,
        resetUrl,
      });
    } catch (emailError) {
      /*
       * Remove the unusable token when the email fails.
       */
      shop.passwordResetTokenHash = undefined;
      shop.passwordResetExpires = undefined;

      await shop.save();

      console.error(
        "PASSWORD RESET EMAIL DELIVERY ERROR:",
        emailError,
      );

      return NextResponse.json(
        {
          error:
            "We could not send the password reset email. Please try again.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    console.error(
      "FORGOT PASSWORD ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to process the password reset request. Please try again.",
      },
      { status: 500 },
    );
  }
}