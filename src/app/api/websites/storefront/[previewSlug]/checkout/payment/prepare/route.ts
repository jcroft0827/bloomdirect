import { NextResponse } from "next/server";
import { authorizeCouponSandboxPreparation, couponOwnerUiSandboxReady } from "@/lib/bloom-websites/coupons/authorizeCouponSandboxPreparation";

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
    const pickup = record(body.pickupDetails);
    const deliveryAddress = record(body.deliveryAddress);
    const tipCents = Number(body.tipCents ?? 0);
    const submittedCoupon = clean(body.couponCode);
    const hasCouponInput = body.couponCode !== undefined && body.couponCode !== null && body.couponCode !== "";
    // Public clients never receive a coupon activation capability. A specific
    // development-only Stripe test-key + secret-token guard is checked below.
    if (hasCouponInput && (!submittedCoupon || submittedCoupon.length > 64)) {
      return NextResponse.json({ error: "Invalid coupon code.", code: "INVALID_COUPON" }, { status: 400 });
    }

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
      .select("_id shop status customDomain domainVerified paymentSettings.provider")
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

    // UI sandbox and private-token sandbox must share the same authorization
    // decision as the checkout capability endpoint. Never enable public coupons here.
    const couponProvider = website.paymentSettings?.provider === "fiserv" ? "fiserv" : "stripe";
    const ownerSandboxAuthorized = access.mode === "owner_preview" &&
      couponProvider === "stripe" && couponOwnerUiSandboxReady();
    const tokenSandboxAuthorized = authorizeCouponSandboxPreparation({
      token: request.headers.get("x-bloom-coupon-sandbox-token") ?? "",
      paymentProvider: couponProvider,
    });
    if (hasCouponInput && !(ownerSandboxAuthorized || tokenSandboxAuthorized)) {
      return NextResponse.json(
        { error: "Coupon redemption is not available yet.", code: "COUPON_REDEMPTION_UNAVAILABLE" },
        { status: 409 },
      );
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
      recipientEmail: clean(recipient.email),
      pickupDetails: fulfillmentType === "pickup" ? {
        person: clean(pickup.person), firstName: clean(pickup.firstName), lastName: clean(pickup.lastName), phone: clean(pickup.phone),
        instructions: clean(pickup.instructions), timeFrom: clean(pickup.timeFrom), timeTo: clean(pickup.timeTo),
      } : undefined,
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

    if (fulfillmentType === "pickup") {
      const who = clean(pickup.person);
      if (!["recipient", "customer", "other"].includes(who)) return NextResponse.json({error:"Choose who is picking up."},{status:400});
      if (who === "other" && (!clean(pickup.firstName) || !clean(pickup.lastName))) return NextResponse.json({error:"Pickup person's name is required."},{status:400});
      if (who === "recipient" && (!clean(recipient.firstName) || !clean(recipient.lastName))) return NextResponse.json({error:"Recipient name is required."},{status:400});
      const from = clean(pickup.timeFrom), to = clean(pickup.timeTo);
      const validTime = (v:string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
      if ((from || to) && (!validTime(from) || !validTime(to) || from >= to)) return NextResponse.json({error:"Select a valid pickup time window."},{status:400});
      if (clean(pickup.instructions).length > 500 || clean(pickup.firstName).length > 120 || clean(pickup.lastName).length > 120 || clean(pickup.phone).length > 50) return NextResponse.json({error:"Pickup details exceed the allowed length."},{status:400});
    }
    if (clean(recipient.email) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(recipient.email))) return NextResponse.json({error:"Invalid recipient email."},{status:400});

    const preflight = await validateBloomWebsiteCheckoutPreflight(input);

    const result = await prepareBloomWebsitePayment({
      attemptId,
      preflight,
      tipCents,
      couponCode: hasCouponInput ? submittedCoupon : undefined,
      checkoutSnapshot: {
        pickupDetails: fulfillmentType === "pickup" ? {
          person: ["recipient", "customer", "other"].includes(clean(pickup.person)) ? clean(pickup.person) : "customer",
          firstName: clean(pickup.firstName).slice(0,120), lastName: clean(pickup.lastName).slice(0,120), phone: clean(pickup.phone).slice(0,50),
          instructions: clean(pickup.instructions).slice(0,500), timeFrom: clean(pickup.timeFrom), timeTo: clean(pickup.timeTo),
        } : undefined,
        recipientEmail: clean(recipient.email).slice(0,320),
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
