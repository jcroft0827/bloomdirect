import { NextResponse } from "next/server";

import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import {
  BloomPaymentFinalizationError,
} from "@/lib/bloom-websites/payments/finalizeBloomWebsitePayment";
import { recoverBloomWebsiteClientPaymentFailure } from "@/lib/bloom-websites/payments/recoverBloomWebsiteClientPaymentFailure";
import { BloomPaymentProviderError } from "@/lib/bloom-websites/payments/types";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";

type RouteContext = {
  params: Promise<{ previewSlug: string }>;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { previewSlug } = await params;
    const slug = clean(previewSlug).toLowerCase();
    const body = await request.json().catch(() => null);
    const attemptId = clean(body?.attemptId);

    if (!slug || !attemptId) {
      return NextResponse.json(
        {
          error: "Invalid payment failure recovery request.",
          code: "INVALID_REQUEST",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const website = await BloomWebsite.findOne({ previewSlug: slug })
      .select("_id shop status customDomain domainVerified")
      .lean<any>();

    if (!website) {
      return NextResponse.json(
        { error: "Storefront not found." },
        { status: 404 },
      );
    }

    const access = await authorizeBloomWebsiteStorefrontAccess(
      request,
      website,
    );

    if (!access.allowed) {
      return access.response;
    }

    const rateLimit = await checkBloomWebsiteRateLimit({
      request,
      scope: "storefront-payment-failure",
      subject: slug,
      limit: 20,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many payment recovery attempts. Please wait and try again.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const ownedAttempt = await BloomWebsiteCheckoutAttempt.exists({
      attemptId,
      website: website._id,
      shop: website.shop,
    });

    if (!ownedAttempt) {
      return NextResponse.json(
        {
          error: "Checkout attempt not found.",
          code: "CHECKOUT_ATTEMPT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const result = await recoverBloomWebsiteClientPaymentFailure({
      attemptId,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (
      error instanceof BloomPaymentFinalizationError ||
      error instanceof BloomPaymentProviderError
    ) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          retryable: error.retryable,
        },
        { status: error.status },
      );
    }

    console.error("BloomWebsite payment failure recovery failed:", error);

    return NextResponse.json(
      {
        error: "Payment failure could not be reconciled.",
        code: "PAYMENT_FAILURE_RECOVERY_FAILED",
      },
      { status: 500 },
    );
  }
}
