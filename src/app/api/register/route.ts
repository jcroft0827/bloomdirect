// app/api/register/route.ts

import crypto from "crypto";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api-error";
import { sendEmailVerificationCode } from "@/lib/email/send-email-verification-code";
import {
  CURRENT_PRIVACY_VERSION,
  CURRENT_TERMS_VERSION,
} from "@/lib/legal";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashVerificationCode(code: string) {
  return crypto
    .createHash("sha256")
    .update(code)
    .digest("hex");
}

function createShopSlug(businessName: string) {
  return businessName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const body = await req.json();

    const {
      businessName,
      email,
      password,
      realRetailFloristAccepted,
      termsOfServiceAccepted,
      privacyPolicyAccepted,
    } = body;

    /*
     * Validate the normal account fields before calling string methods
     * such as trim(), normalize(), and toLowerCase().
     */
    if (
      typeof businessName !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string" ||
      !businessName.trim() ||
      !email.trim() ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "Shop name, email address, and password are required.",
        },
        { status: 400 },
      );
    }

    /*
     * Require explicit true values.
     *
     * This prevents values such as "true", 1, or missing fields from
     * being treated as valid legal acceptance.
     */
    if (
      realRetailFloristAccepted !== true ||
      termsOfServiceAccepted !== true ||
      privacyPolicyAccepted !== true
    ) {
      return NextResponse.json(
        {
          error:
            "You must confirm that you represent a retail florist and accept the Terms of Service and Privacy Policy.",
        },
        { status: 400 },
      );
    }

    const normalizedBusinessName = businessName.trim();
    const normalizedEmail = email.toLowerCase().trim();
    const shopSlug = createShopSlug(normalizedBusinessName);

    if (!shopSlug) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid shop name containing letters or numbers.",
        },
        { status: 400 },
      );
    }

    const existing = await Shop.findOne({
      email: normalizedEmail,
    }).select("_id");

    if (existing) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this email address.",
        },
        { status: 409 },
      );
    }

    const verificationCode =
      generateVerificationCode();

    const emailVerificationCodeHash =
      hashVerificationCode(verificationCode);

    const emailVerificationExpires = new Date(
      Date.now() + 10 * 60 * 1000,
    );

    /*
     * Use one timestamp for the entire registration agreement.
     * That gives all three records the exact same acceptance time.
     */
    const acceptedAt = new Date();

    const shop = await Shop.create({
      // Core identity
      businessName: normalizedBusinessName,
      email: normalizedEmail,
      password,
      slug: shopSlug,

      // Account state
      onboardingComplete: false,
      networkJoinDate: acceptedAt,

      // Registration confirmations
      realRetailFlorist: {
        confirmedAt: acceptedAt,
      },

      termsOfService: {
        acceptedAt,
        version: CURRENT_TERMS_VERSION,
      },

      privacyPolicy: {
        acceptedAt,
        version: CURRENT_PRIVACY_VERSION,
      },

      // Email verification
      emailVerificationCodeHash,
      emailVerificationExpires,

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
  } catch (error: unknown) {
    console.error("REGISTRATION SHOP ERROR:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
        },
        { status: error.status },
      );
    }

    /*
     * Handle a possible duplicate-email race condition.
     *
     * Two requests could theoretically pass findOne() before either
     * account is inserted. A unique email index remains the real
     * database-level protection.
     */
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          error:
            "An account already exists with this email address.",
          code: "EMAIL_ALREADY_EXISTS",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again. If the issue persists, contact GetBloomDirect support.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}