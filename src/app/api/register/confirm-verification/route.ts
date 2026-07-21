import crypto from "crypto";
import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 },
      );
    }

    const shop = await Shop.findOne({
      email: email.toLowerCase().trim(),
    }).select("+emailVerificationCodeHash +emailVerificationExpires",);

    if (!shop) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }

    if (shop.verification?.emailVerified) {
      return NextResponse.json({
        success: true,
      });
    }

    if (
      !shop.emailVerificationCodeHash ||
      !shop.emailVerificationExpires
    ) {
      return NextResponse.json(
        { error: "No verification code found." },
        { status: 400 },
      );
    }

    if (shop.emailVerificationExpires < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired." },
        { status: 400 },
      );
    }

    const hashedCode = hashVerificationCode(code);

    if (hashedCode !== shop.emailVerificationCodeHash) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 },
      );
    }

    shop.verification = {
      ...shop.verification,
      emailVerified: true,
      emailVerifiedAt: new Date(),
    };

    shop.emailVerificationCodeHash = undefined;
    shop.emailVerificationExpires = undefined;

    await shop.save();

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("CONFIRM VERIFICATION ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to verify email.",
      },
      { status: 500 },
    );
  }
}