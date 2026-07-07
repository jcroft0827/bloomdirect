// app/api/shops/verification/email/send/route.ts
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendEmailVerificationCode } from "@/lib/email/send-email-verification-code";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";

function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST() {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await getAuthenticatedShop(session.user.id);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (shop.verification?.emailVerified) {
      return NextResponse.json({
        success: true,
        alreadyVerified: true,
        message: "Email is already verified.",
      });
    }

    if (
      shop.emailVerificationExpires &&
      shop.emailVerificationExpires > new Date(Date.now() + 8 * 60 * 1000)
    ) {
      return NextResponse.json(
        {
          error:
            "A verification code was already sent recently. Please check your email.",
        },
        { status: 429 },
      );
    }

    const code = generateCode();
    const codeHash = hashCode(code);
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const updatedShop = await Shop.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          emailVerificationCodeHash: codeHash,
          emailVerificationExpires: expires,
        },
      },
      { new: true },
    ).select("+emailVerificationCodeHash +emailVerificationExpires");

    await sendEmailVerificationCode({
      to: shop.email,
      code,
      businessName: shop.businessName,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent.",
      expiresAt: expires,
    });
  } catch (err) {
    console.error("Send email verification error:", err);
    return NextResponse.json(
      { error: "Failed to send verification code." },
      { status: 500 },
    );
  }
}
