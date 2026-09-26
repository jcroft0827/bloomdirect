// src/lib/bloom-websites/checkout-idempotency.ts

import { createHash, randomBytes } from "crypto";

import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";

const ATTEMPT_PREFIX = "BWC";

export type BloomWebsiteCheckoutAttemptStatus =
  | "created"
  | "validated"
  | "payment_processing"
  | "payment_succeeded"
  | "order_committed"
  | "failed";

export type BloomWebsiteCheckoutFingerprintInput = {
  websiteId: string;
  previewSlug: string;
  fulfillmentType: "delivery" | "pickup";
  requestedDate: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  recipient: {
    firstName: string;
    lastName: string;
    phone: string;
  };
  deliveryAddress?: {
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zip: string;
  };
  deliveryInstructions?: string;
  cardMessage?: string;
  cardSignature?: string;
  items: Array<{
    productId: string;
    tier: "standard" | "deluxe" | "premium";
    quantity: number;
    addonIds: string[];
  }>;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmail(value: unknown) {
  return clean(value).toLowerCase();
}

function sortStrings(values: string[]) {
  return [...values].sort((a, b) => a.localeCompare(b));
}

/**
 * Produces a stable normalized payload for request fingerprinting.
 *
 * IMPORTANT:
 * This is not pricing authority. Final checkout must still
 * re-fetch products/add-ons, fulfillment, tax and merchant
 * readiness server-side. The fingerprint only protects the
 * meaning of an idempotency key across retries.
 */
export function normalizeBloomWebsiteCheckoutFingerprintInput(
  input: BloomWebsiteCheckoutFingerprintInput,
) {
  return {
    websiteId: clean(input.websiteId),
    previewSlug: clean(input.previewSlug).toLowerCase(),
    fulfillmentType: input.fulfillmentType,
    requestedDate: clean(input.requestedDate),

    customer: {
      firstName: clean(input.customer.firstName),
      lastName: clean(input.customer.lastName),
      email: normalizeEmail(input.customer.email),
      phone: clean(input.customer.phone),
    },

    recipient: {
      firstName: clean(input.recipient.firstName),
      lastName: clean(input.recipient.lastName),
      phone: clean(input.recipient.phone),
    },

    deliveryAddress:
      input.fulfillmentType === "delivery"
        ? {
            address1: clean(input.deliveryAddress?.address1),
            address2: clean(input.deliveryAddress?.address2),
            city: clean(input.deliveryAddress?.city),
            state: clean(input.deliveryAddress?.state),
            zip: clean(input.deliveryAddress?.zip),
          }
        : null,

    deliveryInstructions: clean(input.deliveryInstructions),
    cardMessage: clean(input.cardMessage),
    cardSignature: clean(input.cardSignature),

    items: [...input.items]
      .map((item) => ({
        productId: clean(item.productId),
        tier: item.tier,
        quantity: Number(item.quantity),
        addonIds: sortStrings(
          (item.addonIds || []).map(clean).filter(Boolean),
        ),
      }))
      .sort((a, b) => {
        const productCompare = a.productId.localeCompare(b.productId);

        if (productCompare !== 0) {
          return productCompare;
        }

        return a.tier.localeCompare(b.tier);
      }),
  };
}

export function createBloomWebsiteCheckoutRequestFingerprint(
  input: BloomWebsiteCheckoutFingerprintInput,
) {
  const normalized =
    normalizeBloomWebsiteCheckoutFingerprintInput(input);

  return createHash("sha256")
    .update(JSON.stringify(normalized))
    .digest("hex");
}

export function generateBloomWebsiteCheckoutAttemptId() {
  return `${ATTEMPT_PREFIX}_${randomBytes(12).toString("hex")}`;
}

export class BloomWebsiteIdempotencyConflictError extends Error {
  constructor() {
    super(
      "This checkout idempotency key was already used for a different request.",
    );

    this.name = "BloomWebsiteIdempotencyConflictError";
  }
}

export async function getOrCreateBloomWebsiteCheckoutAttempt({
  idempotencyKey,
  requestFingerprint,
  shopId,
  websiteId,
  previewSlug,
}: {
  idempotencyKey: string;
  requestFingerprint: string;
  shopId: string;
  websiteId: string;
  previewSlug: string;
}) {
  const normalizedKey = clean(idempotencyKey);

  if (!normalizedKey || normalizedKey.length > 200) {
    throw new Error("A valid checkout idempotency key is required.");
  }

  const existing = await BloomWebsiteCheckoutAttempt.findOne({
    idempotencyKey: normalizedKey,
  });

  if (existing) {
    if (existing.requestFingerprint !== requestFingerprint) {
      throw new BloomWebsiteIdempotencyConflictError();
    }

    return {
      attempt: existing,
      created: false,
    };
  }

  try {
    const attempt = await BloomWebsiteCheckoutAttempt.create({
      attemptId: generateBloomWebsiteCheckoutAttemptId(),
      idempotencyKey: normalizedKey,
      requestFingerprint,
      shop: shopId,
      website: websiteId,
      previewSlug: clean(previewSlug).toLowerCase(),
      status: "created",
    });

    return {
      attempt,
      created: true,
    };
  } catch (error: any) {
    /*
     * Two server instances may race after both observe no row.
     * MongoDB's unique idempotency index is the lock. Recover
     * by reading the winner and comparing fingerprints.
     */
    if (error?.code === 11000) {
      const winner = await BloomWebsiteCheckoutAttempt.findOne({
        idempotencyKey: normalizedKey,
      });

      if (winner) {
        if (winner.requestFingerprint !== requestFingerprint) {
          throw new BloomWebsiteIdempotencyConflictError();
        }

        return {
          attempt: winner,
          created: false,
        };
      }
    }

    throw error;
  }
}

const allowedTransitions: Record<
  BloomWebsiteCheckoutAttemptStatus,
  BloomWebsiteCheckoutAttemptStatus[]
> = {
  created: ["validated", "failed"],
  validated: ["payment_processing", "failed"],
  payment_processing: ["payment_succeeded", "failed"],
  payment_succeeded: ["order_committed", "failed"],
  order_committed: [],
  failed: [],
};

export function assertBloomWebsiteCheckoutAttemptTransition({
  currentStatus,
  nextStatus,
}: {
  currentStatus: BloomWebsiteCheckoutAttemptStatus;
  nextStatus: BloomWebsiteCheckoutAttemptStatus;
}) {
  if (currentStatus === nextStatus) {
    return;
  }

  if (!allowedTransitions[currentStatus]?.includes(nextStatus)) {
    throw new Error(
      `Invalid BloomWebsite checkout transition: ${currentStatus} -> ${nextStatus}.`,
    );
  }
}
