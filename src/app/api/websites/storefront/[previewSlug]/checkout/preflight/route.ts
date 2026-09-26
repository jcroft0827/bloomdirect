// src/app/api/websites/storefront/[previewSlug]/checkout/preflight/route.ts

import { NextResponse } from "next/server";

import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import {
  BloomWebsiteIdempotencyConflictError,
  createBloomWebsiteCheckoutRequestFingerprint,
  getOrCreateBloomWebsiteCheckoutAttempt,
} from "@/lib/bloom-websites/checkout-idempotency";
import {
  BloomWebsiteCheckoutPreflightError,
  validateBloomWebsiteCheckoutPreflight,
} from "@/lib/bloom-websites/validateBloomWebsiteCheckoutPreflight";
import type { BloomWebsiteCartValidationItemInput } from "@/lib/bloom-websites/validateBloomWebsiteCart";
import { connectToDB } from "@/lib/mongoose";
import {
  recoverExpiredBloomWebsiteInventoryReservations,
} from "@/lib/bloom-websites/payments/recoverExpiredBloomWebsiteInventoryReservations";

import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";

type RouteContext = {
  params: Promise<{
    previewSlug: string;
  }>;
};

type LeanWebsite = {
  _id: unknown;
  shop: unknown;
  status?: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;
};

type CheckoutBody = {
  items?: unknown;
  fulfillmentType?: unknown;
  requestedDate?: unknown;
  customer?: unknown;
  recipient?: unknown;
  deliveryAddress?: unknown;
  deliveryInstructions?: unknown;
  cardMessage?: unknown;
  cardSignature?: unknown;
};

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseCartItems(
  value: unknown,
): BloomWebsiteCartValidationItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const items: BloomWebsiteCartValidationItemInput[] = [];

  for (const raw of value) {
    if (!isRecord(raw)) {
      return null;
    }

    const tier = cleanString(raw.tier);
    const quantity = Number(raw.quantity);

    if (
      tier !== "standard" &&
      tier !== "deluxe" &&
      tier !== "premium"
    ) {
      return null;
    }

    items.push({
      productId: cleanString(raw.productId),
      tier,
      quantity,
      addonIds: Array.isArray(raw.addonIds)
        ? raw.addonIds
            .filter((value): value is string => typeof value === "string")
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
    });
  }

  return items;
}

function parseContact(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    firstName: cleanString(record.firstName),
    lastName: cleanString(record.lastName),
    email: cleanString(record.email),
    phone: cleanString(record.phone),
  };
}

function parseRecipient(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    firstName: cleanString(record.firstName),
    lastName: cleanString(record.lastName),
    phone: cleanString(record.phone),
  };
}

function parseDeliveryAddress(value: unknown) {
  const record = isRecord(value) ? value : {};

  return {
    address1: cleanString(record.address1),
    address2: cleanString(record.address2),
    city: cleanString(record.city),
    state: cleanString(record.state),
    zip: cleanString(record.zip),
  };
}

function attemptStatusResponse(attempt: {
  status?: string;
  attemptId?: string;
  orderNumber?: string;
}) {
  if (attempt.status === "order_committed") {
    return NextResponse.json(
      {
        error: "This checkout has already created an order.",
        code: "CHECKOUT_ALREADY_COMMITTED",
        attemptId: attempt.attemptId,
        orderNumber: attempt.orderNumber || "",
      },
      { status: 409 },
    );
  }

  if (
    attempt.status === "payment_processing" ||
    attempt.status === "payment_succeeded"
  ) {
    return NextResponse.json(
      {
        error:
          "This checkout is already being processed. Please do not submit it again.",
        code: "CHECKOUT_ALREADY_PROCESSING",
        attemptId: attempt.attemptId,
        attemptStatus: attempt.status,
      },
      { status: 409 },
    );
  }

  if (attempt.status === "failed") {
    return NextResponse.json(
      {
        error:
          "This checkout attempt can no longer be used. Please start a new checkout attempt.",
        code: "CHECKOUT_ATTEMPT_FAILED",
        attemptId: attempt.attemptId,
      },
      { status: 409 },
    );
  }

  return null;
}

export async function POST(
  request: Request,
  { params }: RouteContext,
) {
  let attemptId = "";

  try {
    const { previewSlug } = await params;
    const normalizedPreviewSlug = cleanString(previewSlug).toLowerCase();

    if (!normalizedPreviewSlug) {
      return NextResponse.json(
        {
          error: "Storefront could not be found.",
          code: "STOREFRONT_NOT_FOUND",
        },
        { status: 404 },
      );
    }

    const idempotencyKey = cleanString(
      request.headers.get("idempotency-key"),
    );

    if (!idempotencyKey || idempotencyKey.length > 200) {
      return NextResponse.json(
        {
          error: "A valid checkout idempotency key is required.",
          code: "IDEMPOTENCY_KEY_REQUIRED",
        },
        { status: 400 },
      );
    }

    let body: CheckoutBody;

    try {
      body = (await request.json()) as CheckoutBody;
    } catch {
      return NextResponse.json(
        {
          error: "Request body must contain valid JSON.",
          code: "INVALID_JSON",
        },
        { status: 400 },
      );
    }

    const items = parseCartItems(body.items);

    if (!items) {
      return NextResponse.json(
        {
          error: "Your cart could not be validated.",
          code: "INVALID_CART",
        },
        { status: 400 },
      );
    }

    const fulfillmentTypeValue = cleanString(body.fulfillmentType);

    if (
      fulfillmentTypeValue !== "delivery" &&
      fulfillmentTypeValue !== "pickup"
    ) {
      return NextResponse.json(
        {
          error: "Please choose delivery or pickup.",
          code: "INVALID_FULFILLMENT_TYPE",
        },
        { status: 400 },
      );
    }

    /*
     * Preserve the validated literal union for the checkout
     * fingerprint/preflight types instead of allowing object
     * inference to widen this value back to `string`.
     */
    const fulfillmentType: "delivery" | "pickup" =
      fulfillmentTypeValue;

    const requestedDate = cleanString(body.requestedDate);
    const customer = parseContact(body.customer);
    const recipient = parseRecipient(body.recipient);
    const deliveryAddress = parseDeliveryAddress(body.deliveryAddress);

    await connectToDB();

    const rateLimit = await checkBloomWebsiteRateLimit({
      request,
      scope: "storefront-checkout-preflight",
      subject: normalizedPreviewSlug,
      limit: 20,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Too many checkout attempts. Please wait a moment and try again.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
            "X-RateLimit-Limit": String(rateLimit.limit),
            "X-RateLimit-Remaining": String(rateLimit.remaining),
          },
        },
      );
    }

    const website = (await BloomWebsite.findOne({
      previewSlug: normalizedPreviewSlug,
    })
      .select("_id shop status customDomain domainVerified")
      .lean()) as unknown as LeanWebsite | null;

    if (!website) {
      return NextResponse.json(
        {
          error: "Storefront could not be found.",
          code: "STOREFRONT_NOT_FOUND",
        },
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

    /*
     * A production cron is the primary backstop, but active storefront traffic
     * can also clean a small number of expired reservations for this website
     * before inventory is revalidated. The recovery service reconciles Stripe
     * first/cancels confirmable expired payments before releasing stock.
     */
    await recoverExpiredBloomWebsiteInventoryReservations({
      websiteId: String(website._id),
      limit: 5,
    }).catch((recoveryError) => {
      console.error(
        "BloomWebsite opportunistic inventory recovery failed:",
        recoveryError,
      );
    });

    const fingerprintInput = {
      websiteId: String(website._id),
      previewSlug: normalizedPreviewSlug,
      fulfillmentType,
      requestedDate,
      customer,
      recipient,
      deliveryAddress:
        fulfillmentType === "delivery" ? deliveryAddress : undefined,
      deliveryInstructions: cleanString(body.deliveryInstructions),
      cardMessage: cleanString(body.cardMessage),
      cardSignature: cleanString(body.cardSignature),
      /*
       * The shared cart-validation type allows addonIds to be
       * omitted, but the fingerprint must always normalize the
       * field to an array so equivalent requests hash the same
       * way and satisfy the stricter fingerprint contract.
       */
      items: items.map((item) => ({
        productId: item.productId,
        tier: item.tier,
        quantity: item.quantity,
        addonIds: item.addonIds ?? [],
      })),
    };

    const requestFingerprint =
      createBloomWebsiteCheckoutRequestFingerprint(fingerprintInput);

    const attemptResult =
      await getOrCreateBloomWebsiteCheckoutAttempt({
        idempotencyKey,
        requestFingerprint,
        shopId: String(website.shop),
        websiteId: String(website._id),
        previewSlug: normalizedPreviewSlug,
      });

    const attempt = attemptResult.attempt;
    attemptId = String(attempt.attemptId || "");

    const advancedResponse = attemptStatusResponse(attempt);

    if (advancedResponse) {
      return advancedResponse;
    }

    const preflight = await validateBloomWebsiteCheckoutPreflight({
      previewSlug: normalizedPreviewSlug,
      items,
      fulfillmentType,
      requestedDate,
      customer,
      recipient,
      deliveryAddress:
        fulfillmentType === "delivery" ? deliveryAddress : undefined,
      deliveryInstructions: cleanString(body.deliveryInstructions),
      cardMessage: cleanString(body.cardMessage),
      cardSignature: cleanString(body.cardSignature),
    });

    /*
     * Move created -> validated atomically.
     *
     * If two identical retries race, only one changes the row.
     * The other observes the already-validated attempt and may
     * safely return the same freshly calculated preflight data.
     */
    await BloomWebsiteCheckoutAttempt.updateOne(
      {
        _id: attempt._id,
        status: "created",
      },
      {
        $set: {
          status: "validated",
          "lastError.code": "",
          "lastError.message": "",
          "lastError.occurredAt": null,
        },
      },
    );

    const storefront = {
      websiteId: String(preflight.website._id),
      shopId: String(preflight.shop._id),
      previewSlug: normalizedPreviewSlug,
    };

    return NextResponse.json({
      ready: true,
      attemptId,
      attemptStatus: "validated",

      storefront,

      customer: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email.toLowerCase(),
        phone: customer.phone,
      },

      recipient,

      fulfillment: preflight.fulfillment,

      cart: {
        itemCount: preflight.cart.itemCount,
        items: preflight.cart.items.map((item) => {
          const { recipe, ...publicItem } = item;
          void recipe;
          return publicItem;
        }),
        productSubtotalCents: preflight.cart.productSubtotalCents,
        addonSubtotalCents: preflight.cart.addonSubtotalCents,
        subtotalCents: preflight.cart.subtotalCents,
        taxableSubtotalCents: preflight.cart.taxableSubtotalCents,
      },

      totals: preflight.totals,

      tax: {
        status: "pending",
      },

      payment: {
        status: "not_started",
      },
    });
  } catch (error) {
    if (error instanceof BloomWebsiteIdempotencyConflictError) {
      return NextResponse.json(
        {
          error: error.message,
          code: "IDEMPOTENCY_KEY_CONFLICT",
        },
        { status: 409 },
      );
    }

    if (error instanceof BloomWebsiteCheckoutPreflightError) {
      if (attemptId) {
        await BloomWebsiteCheckoutAttempt.updateOne(
          {
            attemptId,
            status: "created",
          },
          {
            $set: {
              "lastError.code": error.code,
              "lastError.message": error.message,
              "lastError.occurredAt": new Date(),
            },
          },
        ).catch((updateError) => {
          console.error(
            "Unable to record BloomWebsite preflight validation error:",
            updateError,
          );
        });
      }

      return NextResponse.json(
        {
          ready: false,
          error: error.message,
          code: error.code,
          attemptId: attemptId || undefined,
          ...(error.details || {}),
        },
        { status: error.status },
      );
    }

    if (error instanceof Error) {
      if (
        error.message.includes("delivery address") ||
        error.message.includes("verify that delivery address")
      ) {
        return NextResponse.json(
          {
            ready: false,
            error: error.message,
            code: "ADDRESS_NOT_VERIFIED",
            attemptId: attemptId || undefined,
          },
          { status: 400 },
        );
      }
    }

    console.error("BloomWebsite checkout preflight error:", error);

    return NextResponse.json(
      {
        error: "We couldn't verify checkout right now. Please try again.",
        code: "CHECKOUT_PREFLIGHT_FAILED",
        attemptId: attemptId || undefined,
      },
      { status: 500 },
    );
  }
}
