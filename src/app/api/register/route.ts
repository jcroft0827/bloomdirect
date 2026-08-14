// app/api/register/route.ts

import crypto from "crypto";
import { NextResponse } from "next/server";

import { ApiError } from "@/lib/api-error";
import { sendEmailVerificationCode } from "@/lib/email/send-email-verification-code";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/lib/legal";
import { connectToDB } from "@/lib/mongoose";
import InvitedFlorist from "@/models/InvitedFlorist";
import Shop from "@/models/Shop";

type TurnstileVerificationResponse = {
  success: boolean;
  "error-codes"?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
};

function generateVerificationCode() {
  return crypto.randomInt(100000, 1000000).toString();
}

function hashVerificationCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex");
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

function getClientIp(req: Request) {
  const forwardedFor = req.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "";
  }

  return (
    req.headers.get("x-real-ip") ||
    req.headers.get("x-vercel-forwarded-for") ||
    ""
  );
}

async function verifyTurnstileToken(
  token: string,
  remoteIp?: string,
): Promise<TurnstileVerificationResponse> {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;

  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY is not configured.");

    return {
      success: false,
      "error-codes": ["missing-secret-key"],
    };
  }

  const formData = new FormData();

  formData.append("secret", secretKey);
  formData.append("response", token);

  if (remoteIp) {
    formData.append("remoteip", remoteIp);
  }

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: formData,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    console.error(
      "TURNSTILE SITEVERIFY HTTP ERROR:",
      response.status,
      response.statusText,
    );

    return {
      success: false,
      "error-codes": ["siteverify-request-failed"],
    };
  }

  return (await response.json()) as TurnstileVerificationResponse;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      businessName,
      email,
      password,
      turnstileToken,
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
          error: "Shop name, email address, and password are required.",
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

    /*
     * Turnstile must be completed before account creation.
     *
     * The token is verified server-side so bots cannot bypass the
     * browser widget by calling /api/register directly.
     */
    if (
      typeof turnstileToken !== "string" ||
      !turnstileToken.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Please complete the security check before creating your account.",
          code: "TURNSTILE_REQUIRED",
        },
        { status: 400 },
      );
    }

    const clientIp = getClientIp(req);

    const turnstileResult = await verifyTurnstileToken(
      turnstileToken.trim(),
      clientIp || undefined,
    );

if (
  !turnstileResult.success ||
  turnstileResult.action !== "register"
) {
  console.warn("TURNSTILE VERIFICATION FAILED:", {
    errorCodes: turnstileResult["error-codes"] || [],
    action: turnstileResult.action || null,
  });

  return NextResponse.json(
    {
      error:
        "We could not verify the security check. Please try again.",
      code: "TURNSTILE_FAILED",
    },
    { status: 403 },
  );
}

    /*
     * Only connect to MongoDB after Turnstile succeeds.
     *
     * This keeps obvious automated registration attempts from consuming
     * unnecessary database work.
     */
    await connectToDB();

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
          error: "An account already exists with this email address.",
        },
        { status: 409 },
      );
    }

    const verificationCode = generateVerificationCode();

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

    /*
     * If this florist was previously invited through Customer Success,
     * connect the invitation record to the newly registered shop.
     *
     * Registration must never fail because this secondary bookkeeping fails.
     */
    try {
      await InvitedFlorist.findOneAndUpdate(
        {
          email: normalizedEmail,
          status: {
            $in: ["draft", "sent", "failed"],
          },
        },
        {
          $set: {
            status: "registered",
            registeredShop: shop._id,
            convertedAt: acceptedAt,
            sendError: "",
          },
        },
        {
          sort: {
            createdAt: -1,
          },
        },
      );
    } catch (invitationError) {
      console.error(
        "CUSTOMER SUCCESS INVITATION CONVERSION ERROR:",
        invitationError,
      );
    }

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
          error: "An account already exists with this email address.",
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

// import crypto from "crypto";
// import { NextResponse } from "next/server";

// import { ApiError } from "@/lib/api-error";
// import { sendEmailVerificationCode } from "@/lib/email/send-email-verification-code";
// import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/lib/legal";
// import { connectToDB } from "@/lib/mongoose";
// import InvitedFlorist from "@/models/InvitedFlorist";
// import Shop from "@/models/Shop";

// function generateVerificationCode() {
//   return crypto.randomInt(100000, 1000000).toString();
// }

// function hashVerificationCode(code: string) {
//   return crypto.createHash("sha256").update(code).digest("hex");
// }

// function createShopSlug(businessName: string) {
//   return businessName
//     .normalize("NFD")
//     .replace(/[\u0300-\u036f]/g, "")
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9\s-]/g, "")
//     .replace(/[\s_-]+/g, "-")
//     .replace(/^-+|-+$/g, "");
// }

// export async function POST(req: Request) {
//   try {
//     await connectToDB();

//     const body = await req.json();

//     const {
//       businessName,
//       email,
//       password,
//       realRetailFloristAccepted,
//       termsOfServiceAccepted,
//       privacyPolicyAccepted,
//     } = body;

//     /*
//      * Validate the normal account fields before calling string methods
//      * such as trim(), normalize(), and toLowerCase().
//      */
//     if (
//       typeof businessName !== "string" ||
//       typeof email !== "string" ||
//       typeof password !== "string" ||
//       !businessName.trim() ||
//       !email.trim() ||
//       !password
//     ) {
//       return NextResponse.json(
//         {
//           error: "Shop name, email address, and password are required.",
//         },
//         { status: 400 },
//       );
//     }

//     /*
//      * Require explicit true values.
//      *
//      * This prevents values such as "true", 1, or missing fields from
//      * being treated as valid legal acceptance.
//      */
//     if (
//       realRetailFloristAccepted !== true ||
//       termsOfServiceAccepted !== true ||
//       privacyPolicyAccepted !== true
//     ) {
//       return NextResponse.json(
//         {
//           error:
//             "You must confirm that you represent a retail florist and accept the Terms of Service and Privacy Policy.",
//         },
//         { status: 400 },
//       );
//     }

//     const normalizedBusinessName = businessName.trim();
//     const normalizedEmail = email.toLowerCase().trim();
//     const shopSlug = createShopSlug(normalizedBusinessName);

//     if (!shopSlug) {
//       return NextResponse.json(
//         {
//           error:
//             "Please enter a valid shop name containing letters or numbers.",
//         },
//         { status: 400 },
//       );
//     }

//     const existing = await Shop.findOne({
//       email: normalizedEmail,
//     }).select("_id");

//     if (existing) {
//       return NextResponse.json(
//         {
//           error: "An account already exists with this email address.",
//         },
//         { status: 409 },
//       );
//     }

//     const verificationCode = generateVerificationCode();

//     const emailVerificationCodeHash = hashVerificationCode(verificationCode);

//     const emailVerificationExpires = new Date(Date.now() + 10 * 60 * 1000);

//     /*
//      * Use one timestamp for the entire registration agreement.
//      * That gives all three records the exact same acceptance time.
//      */
//     const acceptedAt = new Date();

//     const shop = await Shop.create({
//       // Core identity
//       businessName: normalizedBusinessName,
//       email: normalizedEmail,
//       password,
//       slug: shopSlug,

//       // Account state
//       onboardingComplete: false,
//       networkJoinDate: acceptedAt,

//       // Registration confirmations
//       realRetailFlorist: {
//         confirmedAt: acceptedAt,
//       },

//       termsOfService: {
//         acceptedAt,
//         version: CURRENT_TERMS_VERSION,
//       },

//       privacyPolicy: {
//         acceptedAt,
//         version: CURRENT_PRIVACY_VERSION,
//       },

//       // Email verification
//       emailVerificationCodeHash,
//       emailVerificationExpires,

//       // Stats defaults
//       stats: {
//         ordersSent: 0,
//         ordersRecieved: 0,
//         ordersCompleted: 0,
//         ordersDeclined: 0,
//       },
//     });

//     /*
//      * If this florist was previously invited through Customer Success,
//      * connect the invitation record to the newly registered shop.
//      *
//      * Registration must never fail because this secondary bookkeeping fails.
//      */
//     try {
//       await InvitedFlorist.findOneAndUpdate(
//         {
//           email: normalizedEmail,
//           status: {
//             $in: ["draft", "sent", "failed"],
//           },
//         },
//         {
//           $set: {
//             status: "registered",
//             registeredShop: shop._id,
//             convertedAt: acceptedAt,
//             sendError: "",
//           },
//         },
//         {
//           sort: {
//             createdAt: -1,
//           },
//         },
//       );
//     } catch (invitationError) {
//       console.error(
//         "CUSTOMER SUCCESS INVITATION CONVERSION ERROR:",
//         invitationError,
//       );
//     }

//     await sendEmailVerificationCode({
//       to: shop.email,
//       code: verificationCode,
//       businessName: shop.businessName,
//     });

//     return NextResponse.json(
//       {
//         success: true,
//         verificationRequired: true,
//         email: shop.email,
//         expiresAt: emailVerificationExpires,
//       },
//       { status: 201 },
//     );
//   } catch (error: unknown) {
//     console.error("REGISTRATION SHOP ERROR:", error);

//     if (error instanceof ApiError) {
//       return NextResponse.json(
//         {
//           error: error.message,
//           code: error.code,
//         },
//         { status: error.status },
//       );
//     }

//     /*
//      * Handle a possible duplicate-email race condition.
//      *
//      * Two requests could theoretically pass findOne() before either
//      * account is inserted. A unique email index remains the real
//      * database-level protection.
//      */
//     if (
//       typeof error === "object" &&
//       error !== null &&
//       "code" in error &&
//       error.code === 11000
//     ) {
//       return NextResponse.json(
//         {
//           error: "An account already exists with this email address.",
//           code: "EMAIL_ALREADY_EXISTS",
//         },
//         { status: 409 },
//       );
//     }

//     return NextResponse.json(
//       {
//         error:
//           "Something went wrong. Please try again. If the issue persists, contact GetBloomDirect support.",
//         code: "SERVER_ERROR",
//       },
//       { status: 500 },
//     );
//   }
// }
