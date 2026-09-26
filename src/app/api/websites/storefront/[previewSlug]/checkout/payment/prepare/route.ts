import { NextResponse } from "next/server";

import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { createBloomWebsiteCheckoutRequestFingerprint } from "@/lib/bloom-websites/checkout-idempotency";
import {
  BloomPreparePaymentError,
  prepareBloomWebsitePayment,
} from "@/lib/bloom-websites/payments/prepareBloomWebsitePayment";
import { BloomPaymentProviderError } from "@/lib/bloom-websites/payments/types";
import {
  BloomMerchantReadinessError,
} from "@/lib/bloom-websites/payments/getBloomWebsiteMerchantReadiness";
import {
  BloomWebsiteCheckoutPreflightError,
  validateBloomWebsiteCheckoutPreflight,
} from "@/lib/bloom-websites/validateBloomWebsiteCheckoutPreflight";
import type { BloomWebsiteCartValidationItemInput } from "@/lib/bloom-websites/validateBloomWebsiteCart";
import { BloomWebsiteCheckoutTaxError } from "@/lib/bloom-websites/tax/calculateBloomWebsiteCheckoutTax";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";

type RouteContext = {
  params: Promise<{ previewSlug: string }>;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function record(value: unknown): Record<string, any> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

type ParsedCartItem = Omit<
  BloomWebsiteCartValidationItemInput,
  "addonIds"
> & {
  addonIds: string[];
};

function parseItems(value: unknown): ParsedCartItem[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 50) return null;

  const result: ParsedCartItem[] = [];

  for (const raw of value) {
    const row = record(raw);
    const tier = clean(row.tier);
    const quantity = Number(row.quantity);

    if (
      !clean(row.productId) ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      !["standard", "deluxe", "premium"].includes(tier)
    ) {
      return null;
    }

    result.push({
      productId: clean(row.productId),
      tier: tier as "standard" | "deluxe" | "premium",
      quantity,
      addonIds: Array.isArray(row.addonIds)
        ? row.addonIds.map(clean).filter(Boolean)
        : [],
    });
  }

  return result;
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { previewSlug } = await params;
    const slug = clean(previewSlug).toLowerCase();
    const body = record(await request.json().catch(() => null));
    const attemptId = clean(body.attemptId);
    const items = parseItems(body.items);
    const fulfillmentType = clean(body.fulfillmentType);
    const requestedDate = clean(body.requestedDate);
    const customer = record(body.customer);
    const recipient = record(body.recipient);
    const deliveryAddress = record(body.deliveryAddress);
    const tipCents = Number(body.tipCents ?? 0);

    if (
      !slug ||
      !attemptId ||
      !items ||
      (fulfillmentType !== "delivery" && fulfillmentType !== "pickup") ||
      !Number.isInteger(tipCents) ||
      tipCents < 0
    ) {
      return NextResponse.json(
        { error: "Invalid payment preparation request.", code: "INVALID_REQUEST" },
        { status: 400 },
      );
    }

    await connectToDB();

    const website = await BloomWebsite.findOne({ previewSlug: slug })
      .select("_id shop status customDomain domainVerified")
      .lean<any>();

    if (!website) {
      return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
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
      scope: "storefront-payment-prepare",
      subject: slug,
      limit: 12,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many payment attempts. Please wait and try again.", code: "RATE_LIMIT_EXCEEDED" },
        { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
      );
    }

    const attempt = await BloomWebsiteCheckoutAttempt.findOne({
      attemptId,
      website: website._id,
      shop: website.shop,
    });

    if (!attempt) {
      return NextResponse.json(
        { error: "Checkout attempt not found.", code: "CHECKOUT_ATTEMPT_NOT_FOUND" },
        { status: 404 },
      );
    }

    const normalizedFulfillment =
      fulfillmentType as "delivery" | "pickup";

    const input = {
      previewSlug: slug,
      items,
      fulfillmentType: normalizedFulfillment,
      requestedDate,
      customer: {
        firstName: clean(customer.firstName),
        lastName: clean(customer.lastName),
        email: clean(customer.email),
        phone: clean(customer.phone),
      },
      recipient: {
        firstName: clean(recipient.firstName),
        lastName: clean(recipient.lastName),
        phone: clean(recipient.phone),
      },
      deliveryAddress: {
        address1: clean(deliveryAddress.address1),
        address2: clean(deliveryAddress.address2),
        city: clean(deliveryAddress.city),
        state: clean(deliveryAddress.state),
        zip: clean(deliveryAddress.zip),
      },
      deliveryInstructions: clean(body.deliveryInstructions),
      cardMessage: clean(body.cardMessage),
      cardSignature: clean(body.cardSignature),
    };

    const fingerprint = createBloomWebsiteCheckoutRequestFingerprint({
      websiteId: String(website._id),
      ...input,
    });

    if (fingerprint !== attempt.requestFingerprint) {
      return NextResponse.json(
        {
          error: "Checkout details changed. Please review the order again.",
          code: "CHECKOUT_FINGERPRINT_MISMATCH",
        },
        { status: 409 },
      );
    }

    const preflight = await validateBloomWebsiteCheckoutPreflight(input);

    const result = await prepareBloomWebsitePayment({
      attemptId,
      preflight,
      tipCents,
      checkoutSnapshot: {
        customer: input.customer,
        recipient: input.recipient,
        deliveryInstructions: input.deliveryInstructions,
        cardMessage: input.cardMessage,
        cardSignature: input.cardSignature,
      },
    });

    return NextResponse.json({
      ready: true,
      ...result,
    });
  } catch (error) {
    if (
      error instanceof BloomWebsiteCheckoutPreflightError ||
      error instanceof BloomWebsiteCheckoutTaxError ||
      error instanceof BloomMerchantReadinessError ||
      error instanceof BloomPreparePaymentError ||
      error instanceof BloomPaymentProviderError
    ) {
      const status =
        "status" in error && typeof error.status === "number"
          ? error.status
          : 409;

      return NextResponse.json(
        { error: error.message, code: error.code },
        { status },
      );
    }

    console.error("BloomWebsite payment preparation failed:", error);
    return NextResponse.json(
      {
        error: "Payment could not be prepared.",
        code: "PAYMENT_PREPARATION_FAILED",
      },
      { status: 500 },
    );
  }
}
