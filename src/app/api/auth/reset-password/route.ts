// app/api/auth/reset-password/route.ts

import crypto from "crypto";
import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function isValidPassword(password: string) {
  return password.length >= 8;
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = await req.json();

    const { email, token, newPassword, confirmPassword } = body;

    if (
      typeof email !== "string" ||
      typeof token !== "string" ||
      typeof newPassword !== "string" ||
      typeof confirmPassword !== "string" ||
      !email.trim() ||
      !token.trim() ||
      !newPassword ||
      !confirmPassword
    ) {
      return NextResponse.json(
        {
          error: "All password-reset fields are required.",
        },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          error: "Passwords do not match.",
        },
        { status: 400 },
      );
    }

    if (!isValidPassword(newPassword)) {
      return NextResponse.json(
        {
          error: "Your new password must be at least 8 characters long.",
        },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const tokenHash = hashResetToken(token.trim());

    const shop = await Shop.findOne({
      email: normalizedEmail,
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: {
        $gt: new Date(),
      },
    }).select(
      "+password +passwordResetTokenHash +passwordResetExpires",
    );

    /*
     * Use one generic response for:
     * - invalid token
     * - expired token
     * - token belonging to another account
     * - previously used token
     */
    if (!shop) {
      return NextResponse.json(
        {
          error:
            "This password reset link is invalid or has expired. Please request a new one.",
        },
        { status: 400 },
      );
    }

    /*
     * The Shop pre-save hook hashes this automatically.
     * Do not hash it manually here.
     */
    shop.password = newPassword;

    /*
     * Removing these fields makes the link one-time use.
     */
    shop.passwordResetTokenHash = undefined;
    shop.passwordResetExpires = undefined;

    await shop.save();

    return NextResponse.json({
      success: true,
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to reset your password. Please try again.",
      },
      { status: 500 },
    );
  }
}