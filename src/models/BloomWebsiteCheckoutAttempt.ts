// src/models/BloomWebsiteCheckoutAttempt.ts

import mongoose, { Schema } from "mongoose";

const optionalString = {
  type: String,
  trim: true,
  default: "",
};

const bloomWebsiteCheckoutAttemptSchema = new Schema(
  {
    // ===============================
    // DURABLE CHECKOUT IDENTITY
    // ===============================

    attemptId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    /*
     * One browser checkout submission owns one idempotency key.
     * Retries with the same key must resolve to this same
     * durable attempt instead of starting a second charge.
     */
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      maxlength: 200,
      index: true,
    },

    /*
     * SHA-256 of the normalized commerce request. If a caller
     * reuses an idempotency key with different cart/customer/
     * fulfillment data, Bloom rejects it instead of silently
     * treating two different purchases as the same request.
     */
    requestFingerprint: {
      type: String,
      required: true,
      trim: true,
      minlength: 64,
      maxlength: 64,
    },

    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    website: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsite",
      required: true,
      index: true,
    },

    previewSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /*
     * Immutable server-generated snapshot captured immediately before
     * processor handoff. Recovery/webhooks use this instead of trusting
     * browser data after a charge succeeds.
     */
    checkoutSnapshot: {
      type: Schema.Types.Mixed,
      default: null,
    },

    // ===============================
    // FINALIZATION STATE MACHINE
    // ===============================

    status: {
      type: String,
      required: true,
      enum: [
        "created",
        "validated",
        "payment_processing",
        "payment_succeeded",
        "order_committed",
        "failed",
      ],
      default: "created",
      index: true,
    },

    /*
     * Tax is calculated after authoritative preflight and before
     * payment. The browser may request an exemption, but Bloom only
     * applies one after a server-authoritative verification workflow.
     */
    tax: {
      status: {
        type: String,
        enum: ["not_started", "calculated", "committed", "failed"],
        default: "not_started",
      },
      provider: {
        type: String,
        trim: true,
        lowercase: true,
        enum: ["", "bloom_native", "stripe_tax", "taxjar", "avalara"],
        default: "",
      },
      providerCalculationId: optionalString,
      providerTransactionId: optionalString,
      calculationSnapshot: {
        type: Schema.Types.Mixed,
        default: null,
      },
      inputFingerprint: {
        type: String,
        trim: true,
        minlength: 0,
        maxlength: 64,
        default: "",
      },
      taxableSubtotalCents: {
        type: Number,
        min: 0,
        default: null,
        validate: {
          validator: (value: unknown) =>
            value === null || Number.isInteger(value),
          message: "{PATH} must be null or an integer number of cents.",
        },
      },
      taxAmountCents: {
        type: Number,
        min: 0,
        default: null,
        validate: {
          validator: (value: unknown) =>
            value === null || Number.isInteger(value),
          message: "{PATH} must be null or an integer number of cents.",
        },
      },
      finalTotalCents: {
        type: Number,
        min: 0,
        default: null,
        validate: {
          validator: (value: unknown) =>
            value === null || Number.isInteger(value),
          message: "{PATH} must be null or an integer number of cents.",
        },
      },
      calculatedAt: {
        type: Date,
        default: null,
      },
      committedAt: {
        type: Date,
        default: null,
      },
    },

    tip: {
      amountCents: {
        type: Number,
        min: 0,
        default: 0,
        validate: {
          validator: Number.isInteger,
          message: "{PATH} must be an integer number of cents.",
        },
      },
    },

    taxExemption: {
      status: {
        type: String,
        enum: ["not_requested", "requested", "verified", "rejected"],
        default: "not_requested",
      },
      reason: optionalString,
      certificateReference: optionalString,
      providerReference: optionalString,
      verifiedAt: {
        type: Date,
        default: null,
      },
    },

    /*
     * The payment provider is deliberately normalized. Provider
     * SDK payloads do not belong in this orchestration model.
     */
    payment: {
      provider: {
        type: String,
        enum: ["", "stripe", "fiserv"],
        default: "",
      },
      merchantConnectionId: optionalString,
      providerPaymentId: optionalString,
      providerStatus: {
        type: String,
        enum: [
          "",
          "requires_payment_method",
          "requires_action",
          "processing",
          "succeeded",
          "failed",
          "canceled",
        ],
        default: "",
      },
      idempotencyKey: optionalString,
      amountCents: {
        type: Number,
        min: 0,
        default: null,
        validate: {
          validator: (value: unknown) =>
            value === null || Number.isInteger(value),
          message: "{PATH} must be null or an integer number of cents.",
        },
      },
      paymentStartedAt: {
        type: Date,
        default: null,
      },
      paymentSucceededAt: {
        type: Date,
        default: null,
      },
    },

    /*
     * Inventory is reserved immediately before payment begins,
     * never during preflight. That keeps abandoned carts from
     * consuming stock while still preventing two payment attempts
     * from purchasing the same final unit.
     */
    inventory: {
      status: {
        type: String,
        enum: ["not_started", "reserved", "committed", "released"],
        default: "not_started",
      },
      reservation: {
        type: Schema.Types.ObjectId,
        ref: "BloomWebsiteInventoryReservation",
        default: null,
      },
      reservedAt: {
        type: Date,
        default: null,
      },
      committedAt: {
        type: Date,
        default: null,
      },
      releasedAt: {
        type: Date,
        default: null,
      },
    },

    order: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsiteOrder",
      default: null,
      index: true,
    },

    orderNumber: optionalString,

    lastError: {
      code: optionalString,
      message: {
        type: String,
        trim: true,
        maxlength: 2000,
        default: "",
      },
      occurredAt: {
        type: Date,
        default: null,
      },
    },

    /*
     * Checkout-attempt rows are recovery infrastructure, not
     * permanent business records. Seven days gives Bloom time
     * to reconcile ambiguous provider responses while keeping
     * the collection bounded.
     */
    expiresAt: {
      type: Date,
      required: true,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    minimize: false,
    strict: true,
    versionKey: "__v",
  },
);

bloomWebsiteCheckoutAttemptSchema.index({
  website: 1,
  createdAt: -1,
});

bloomWebsiteCheckoutAttemptSchema.index({
  shop: 1,
  status: 1,
  updatedAt: -1,
});

bloomWebsiteCheckoutAttemptSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

export default
  mongoose.models.BloomWebsiteCheckoutAttempt ||
  mongoose.model(
    "BloomWebsiteCheckoutAttempt",
    bloomWebsiteCheckoutAttemptSchema,
  );
