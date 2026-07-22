// app/api/register/route.ts

import { connectToDB } from "@/lib/mongoose";
import { NextResponse } from "next/server";
import Shop from "@/models/Shop";
import { ApiError } from "@/lib/api-error";
import crypto from "crypto";
import { sendEmailVerificationCode } from "@/lib/email/send-email-verification-code";

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = await req.json();

    const { businessName, email, password } = body;

    const shopSlug = businessName
      .normalize("NFD") // 1. Decompose combined characters (like 'é' to 'e' + '´')
      .replace(/[\u0300-\u036f]/g, "") // 2. Remove the now-separated accent marks
      .toLowerCase() // 3. Lowercase everything
      .trim() // 4. Remove leading/trailing whitespace
      .replace(/[^a-z0-9\s-]/g, "") // 5. Remove any remaining non-alphanumeric chars
      .replace(/[\s_-]+/g, "-") // 6. Replace spaces/underscores with hyphens
      .replace(/^-+|-+$/g, ""); // 7. Trim hyphens from ends

    // Basic validation
    if (!businessName || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    //Check for existing account
    const existing = await Shop.findOne({ email: normalizedEmail });

    if (existing) {
      return NextResponse.json(
        { error: "Email already used" },
        { status: 400 },
      );
    }

    const verificationCode = generateVerificationCode();

    const emailVerificationCodeHash = hashVerificationCode(verificationCode);

    const emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

    // Create new shop
    const shop = await Shop.create({
      // Core Identity
      businessName: businessName.trim(),
      email: normalizedEmail,
      password,

      // Account state
      onboardingComplete: false,
      networkJoinDate: new Date(),

      // Email Verification
      emailVerificationCodeHash,
      emailVerificationExpires,

      slug: shopSlug,

      // Stats defaults
      stats: {
        ordersSent: 0,
        ordersRecieved: 0,
        ordersCompleted: 0,
        ordersDeclined: 0,
      },
    });

    await sendEmailVerificationCode({
      to: shop.email,
      code: verificationCode,
      businessName: shop.businessName,
    });

    return NextResponse.json(
      {
        success: true,
        verificationRequired: true,
        email: shop.email,
        expiresAt: emailVerificationExpires,
      },
      { status: 201 },
    );
  } catch (error: any) {
    console.log("REGISTRATION SHOP ERROR: ", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again. If the issue persists, contact BloomDirect support.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}