// app/api/shops/verification/email/confirm/route.ts
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import crypto from "crypto";

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function hasCompletedVerification(shop: any) {
  const completedOrders = shop.stats?.ordersCompleted ?? 0;

  const reviewCount = shop.reviews?.length ?? 0;

  return (
    !!shop.verification?.emailVerified &&
    !!shop.onboardingComplete &&
    !!shop.verification?.websiteVerified &&
    !!shop.isPublic &&
    completedOrders >= 2 &&
    reviewCount >= 2
  );
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: "Please enter a valid 6-digit code." },
        { status: 400 },
      );
    }

    const shop = await Shop.findById(session.user.id).select(
      "+emailVerificationCodeHash +emailVerificationExpires",
    );

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (shop.verification?.emailVerified) {
      return NextResponse.json({
        success: true,
        verification: {
          emailVerified: true,
          emailVerifiedAt: shop.verification.emailVerifiedAt,
        },
      });
    }

    const storedHash = shop.emailVerificationCodeHash;
    const expires = shop.emailVerificationExpires;

    if (!storedHash || !expires) {
      return NextResponse.json(
        { error: "No active verification code. Please request a new one." },
        { status: 400 },
      );
    }

    if (expires < new Date()) {
      return NextResponse.json(
        { error: "Verification code expired. Please request a new one." },
        { status: 400 },
      );
    }

    const submittedHash = hashCode(code);

    if (submittedHash !== storedHash) {
      return NextResponse.json(
        { error: "Invalid verification code." },
        { status: 400 },
      );
    }

    const now = new Date();

    shop.verification.emailVerified = true;
    shop.verification.emailVerifiedAt = now;
    shop.emailVerificationCodeHash = undefined;
    shop.emailVerificationExpires = undefined;

    const isNowFullyVerified = hasCompletedVerification(shop);

    if (isNowFullyVerified && !shop.verification.verifiedAt) {
      shop.isVerified = true;
      shop.verifiedFlorist = true;
      shop.verification.verifiedAt = now;
    }

    await shop.save();

    return NextResponse.json({
      success: true,
      message: isNowFullyVerified
        ? "Email verified successfully. Your shop is now verified."
        : "Email verified successfully.",
      verification: {
        emailVerified: true,
        emailVerifiedAt: shop.verification.emailVerifiedAt,
        websiteVerified: shop.verification.websiteVerified,
        websiteVerifiedAt: shop.verification.websiteVerifiedAt,
        verifiedAt: shop.verification.verifiedAt,
      },
      isFullyVerified: isNowFullyVerified,
      isVerified: shop.isVerified,
      verifiedFlorist: shop.verifiedFlorist,
    });
  } catch (err) {
    console.error("Confirm email verification error:", err);
    return NextResponse.json(
      { error: "Failed to confirm verification code." },
      { status: 500 },
    );
  }
}
