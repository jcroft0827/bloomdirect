// src/models/BloomWebsiteOrder.ts

import mongoose, { Schema } from "mongoose";

const integerCentsValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer number of cents.",
};

const nonNegativeCents = {
  type: Number,
  required: true,
  min: 0,
  validate: integerCentsValidator,
};

const optionalString = {
  type: String,
  trim: true,
  default: "",
};

const addressSnapshotSchema = new Schema(
  {
    address1: optionalString,
    address2: optionalString,
    city: optionalString,
    state: optionalString,
    postalCode: optionalString,
    country: {
      type: String,
      trim: true,
      uppercase: true,
      default: "US",
    },
    formattedAddress: optionalString,
  },
  {
    _id: false,
  },
);

const customerSnapshotSchema = new Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 320,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const recipientSnapshotSchema = new Schema(
  {
    firstName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    company: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },
    address: {
      type: addressSnapshotSchema,
      default: () => ({}),
    },
    deliveryInstructions: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const addonSnapshotSchema = new Schema(
  {
    addonId: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsiteAddon",
      required: true,
    },
    sku: optionalString,
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    category: optionalString,
    imageUrl: optionalString,
    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be an integer.",
      },
    },
    taxable: {
      type: Boolean,
      required: true,
    },
    unitPriceCents: nonNegativeCents,
    lineTotalCents: nonNegativeCents,
  },
  {
    _id: false,
  },
);

const recipeSnapshotSchema = new Schema(
  {
    ingredients: {
      type: [
        new Schema(
          {
            kind: {
              type: String,
              enum: ["flower", "greenery", "hardgood", "supply", "other"],
              default: "flower",
            },
            name: {
              type: String,
              required: true,
              trim: true,
              maxlength: 160,
            },
            quantity: {
              type: Number,
              required: true,
              min: 0,
            },
            unit: {
              type: String,
              trim: true,
              maxlength: 60,
              default: "stem",
            },
            notes: {
              type: String,
              trim: true,
              maxlength: 500,
              default: "",
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    designerInstructions: {
      type: String,
      trim: true,
      maxlength: 3000,
      default: "",
    },
  },
  { _id: false },
);

const itemSnapshotSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsiteProduct",
      required: true,
    },
    slug: optionalString,
    sku: optionalString,
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    category: optionalString,
    imageUrl: optionalString,

    tier: {
      type: String,
      required: true,
      enum: ["standard", "deluxe", "premium"],
    },
    tierLabel: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    recipe: {
      type: recipeSnapshotSchema,
      default: () => ({
        ingredients: [],
        designerInstructions: "",
      }),
    },

    quantity: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be an integer.",
      },
    },

    taxable: {
      type: Boolean,
      required: true,
    },
    localOnly: {
      type: Boolean,
      required: true,
    },
    allowsSubstitutions: {
      type: Boolean,
      required: true,
    },

    unitPriceCents: nonNegativeCents,
    productSubtotalCents: nonNegativeCents,
    addonSubtotalCents: nonNegativeCents,
    lineTotalCents: nonNegativeCents,

    addons: {
      type: [addonSnapshotSchema],
      default: [],
    },
  },
  {
    _id: false,
  },
);

const fulfillmentSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["delivery", "pickup"],
      index: true,
    },

    /*
     * Keep the requested fulfillment date as YYYY-MM-DD.
     * It represents the florist's local calendar date rather
     * than an arbitrary UTC instant.
     */
    requestedDate: {
      type: String,
      required: true,
      trim: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },

    timezone: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    window: {
      type: {
        type: String,
        enum: ["anytime", "morning", "afternoon", "custom"],
        default: "anytime",
      },
      from: optionalString,
      to: optionalString,
    },

    deliveryAddress: {
      type: addressSnapshotSchema,
      default: () => ({}),
    },

    deliveryFeeCents: {
      ...nonNegativeCents,
      default: 0,
    },

    pickupLocation: {
      businessName: optionalString,
      address: {
        type: addressSnapshotSchema,
        default: () => ({}),
      },
      instructions: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
      preparationMinutes: {
        type: Number,
        min: 0,
        max: 1440,
        default: 0,
        validate: {
          validator: Number.isInteger,
          message: "{PATH} must be an integer.",
        },
      },
    },
  },
  {
    _id: false,
  },
);

const taxLineSchema = new Schema(
  {
    referenceId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    kind: {
      type: String,
      required: true,
      enum: ["product", "addon", "delivery", "tip"],
    },
    amountCents: nonNegativeCents,
    taxableAmountCents: nonNegativeCents,
    taxAmountCents: nonNegativeCents,
    taxCode: optionalString,
    taxabilityReason: optionalString,
  },
  {
    _id: false,
  },
);

const taxJurisdictionSchema = new Schema(
  {
    country: optionalString,
    state: optionalString,
    county: optionalString,
    city: optionalString,
    jurisdictionCode: optionalString,
    rate: {
      type: Number,
      min: 0,
      default: null,
    },
    taxAmountCents: nonNegativeCents,
  },
  {
    _id: false,
  },
);

const taxExemptionSchema = new Schema(
  {
    applied: {
      type: Boolean,
      required: true,
      default: false,
    },
    reason: optionalString,
    certificateReference: optionalString,
    providerReference: optionalString,
  },
  {
    _id: false,
  },
);

const taxSchema = new Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["bloom_native", "stripe_tax", "taxjar", "avalara"],
    },
    providerCalculationId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    providerTransactionId: optionalString,

    taxableSubtotalCents: nonNegativeCents,
    taxAmountCents: nonNegativeCents,

    exemption: {
      type: taxExemptionSchema,
      required: true,
      default: () => ({ applied: false }),
    },

    lines: {
      type: [taxLineSchema],
      default: [],
    },

    jurisdictions: {
      type: [taxJurisdictionSchema],
      default: [],
    },

    /*
     * Snapshot data useful for receipts, support, and
     * reconciliation. It must never replace the authoritative
     * tax-provider result used immediately before payment.
     */
    jurisdiction: {
      country: optionalString,
      state: optionalString,
      county: optionalString,
      city: optionalString,
    },
  },
  {
    _id: false,
  },
);

const totalsSchema = new Schema(
  {
    productSubtotalCents: nonNegativeCents,
    addonSubtotalCents: nonNegativeCents,
    subtotalCents: nonNegativeCents,
    fulfillmentFeeCents: nonNegativeCents,
    tipCents: nonNegativeCents,
    taxableSubtotalCents: nonNegativeCents,
    taxAmountCents: nonNegativeCents,
    totalCents: nonNegativeCents,

    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
      minlength: 3,
      maxlength: 3,
    },
  },
  {
    _id: false,
  },
);

const paymentSchema = new Schema(
  {
    /*
     * Provider is intentionally a normalized string instead
     * of a provider-specific nested object. Bloom owns the
     * canonical payment state; Stripe/Fiserv/Authorize.Net
     * details stay behind provider adapters.
     */
    provider: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      enum: ["stripe", "fiserv"],
    },

    merchantConnectionId: optionalString,
    providerPaymentId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    providerCustomerId: optionalString,

    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "authorized",
        "paid",
        "failed",
        "canceled",
        "partially_refunded",
        "refunded",
        "disputed",
      ],
      index: true,
    },

    amountCents: nonNegativeCents,
    currency: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      default: "USD",
      minlength: 3,
      maxlength: 3,
    },

    authorizedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    failedAt: {
      type: Date,
      default: null,
    },

    failureCode: optionalString,
    failureMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const refundAllocationSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ["product", "addon", "delivery", "tip", "tax", "custom"],
    },
    referenceId: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    quantity: {
      type: Number,
      default: null,
      validate: {
        validator: (value: unknown) =>
          value === null ||
          value === undefined ||
          (Number.isInteger(value) && Number(value) > 0),
        message: "{PATH} must be a positive integer when present.",
      },
    },
    principalAmountCents: nonNegativeCents,
    taxAmountCents: nonNegativeCents,
    totalAmountCents: {
      type: Number,
      required: true,
      min: 1,
      validate: integerCentsValidator,
    },
  },
  { _id: false },
);

const refundSchema = new Schema(
  {
    refundId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    providerRefundId: optionalString,
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
      validate: integerCentsValidator,
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "succeeded", "failed", "canceled"],
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    allocations: {
      type: [refundAllocationSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  },
);

const cancellationSchema = new Schema(
  {
    canceledAt: {
      type: Date,
      default: null,
    },
    canceledBy: {
      type: String,
      enum: ["customer", "florist", "admin", "system"],
      default: null,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
  },
  {
    _id: false,
  },
);

const communicationEventSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: [
        "customer_order_confirmation",
        "florist_new_order",
        "customer_status_update",
        "customer_delivery_confirmation",
        "customer_refund_confirmation",
      ],
    },
    status: {
      type: String,
      trim: true,
      default: "",
      maxlength: 80,
    },
    recipient: optionalString,
    resendId: optionalString,
    sentAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

const orderHistoryChangeSchema = new Schema(
  {
    field: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    beforeValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
    afterValue: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  { _id: false },
);

const orderHistoryActorSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ["customer", "florist", "admin", "pos", "api", "system"],
    },
    id: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    label: {
      type: String,
      trim: true,
      maxlength: 320,
      default: "",
    },
  },
  { _id: false },
);

const orderHistoryEventSchema = new Schema(
  {
    eventId: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    kind: {
      type: String,
      required: true,
      enum: [
        "order_placed",
        "status_changed",
        "order_adjusted",
        "refund_recorded",
      ],
    },
    source: {
      type: String,
      required: true,
      enum: ["storefront", "portal", "pos", "api", "system"],
      default: "system",
    },
    actor: {
      type: orderHistoryActorSchema,
      required: true,
    },
    summary: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    referenceType: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },
    referenceId: {
      type: String,
      trim: true,
      maxlength: 240,
      default: "",
    },
    amountCents: {
      type: Number,
      min: 0,
      default: null,
      validate: {
        validator: (value: unknown) =>
          value === null || value === undefined || Number.isInteger(value),
        message: "{PATH} must be an integer number of cents when present.",
      },
    },
    changes: {
      type: [orderHistoryChangeSchema],
      default: [],
    },
    financialReviewRequired: {
      type: Boolean,
      default: false,
    },
    occurredAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false },
);

const bloomWebsiteOrderSchema = new Schema(
  {
    // ===============================
    // IDENTITY / OWNERSHIP
    // ===============================

    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
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

    /*
     * Snapshot the storefront identity used when the order
     * was placed. Later website/domain changes must not alter
     * historical receipts or support records.
     */
    storefront: {
      siteName: {
        type: String,
        required: true,
        trim: true,
        maxlength: 160,
      },
      previewSlug: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },
      customDomain: {
        type: String,
        trim: true,
        lowercase: true,
        default: "",
      },
    },

    // ===============================
    // CHECKOUT IDEMPOTENCY
    // ===============================

    /*
     * Final checkout will create one key per checkout attempt.
     * The partial unique index below makes repeated browser
     * submits, retries, and ambiguous network responses safe.
     */
    idempotencyKey: {
      type: String,
      trim: true,
      default: "",
      maxlength: 200,
    },

    /*
     * Links the permanent order back to the durable checkout
     * attempt that orchestrated validation/payment/persistence.
     * This gives Bloom a recovery path when a provider succeeds
     * but the browser or application server times out.
     */
    checkoutAttempt: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsiteCheckoutAttempt",
      default: null,
      index: true,
    },

    // ===============================
    // CUSTOMER / RECIPIENT
    // ===============================

    customer: {
      type: customerSnapshotSchema,
      required: true,
    },

    recipient: {
      type: recipientSnapshotSchema,
      default: () => ({}),
    },

    cardMessage: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    // ===============================
    // FULFILLMENT
    // ===============================

    fulfillment: {
      type: fulfillmentSchema,
      required: true,
    },

    // ===============================
    // IMMUTABLE COMMERCE SNAPSHOT
    // ===============================

    items: {
      type: [itemSnapshotSchema],
      required: true,
      validate: {
        validator: (value: unknown[]) =>
          Array.isArray(value) && value.length > 0 && value.length <= 50,
        message: "items must contain between 1 and 50 product lines.",
      },
    },

    itemCount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be an integer.",
      },
    },

    totals: {
      type: totalsSchema,
      required: true,
    },

    tax: {
      type: taxSchema,
      required: true,
    },

    // ===============================
    // PAYMENT — SEPARATE FROM FULFILLMENT
    // ===============================

    payment: {
      type: paymentSchema,
      required: true,
    },

    refunds: {
      type: [refundSchema],
      default: [],
    },

    totalRefundedCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: integerCentsValidator,
    },

    // ===============================
    // ECOMMERCE FULFILLMENT LIFECYCLE
    // ===============================

    status: {
      type: String,
      required: true,
      enum: [
        "placed",
        "confirmed",
        "in_preparation",
        "preparation_complete",
        "ready_for_pickup",
        "out_for_delivery",
        "fulfilled",
        "canceled",
      ],
      default: "placed",
      index: true,
    },

    placedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },

    cancellation: {
      type: cancellationSchema,
      default: () => ({}),
    },

    communications: {
      events: {
        type: [communicationEventSchema],
        default: [],
      },
    },

    /*
     * Operational timestamps are separate from the canonical status string.
     * They make fulfillment history useful for the florist and future POS
     * exports without requiring a second order model.
     */
    preparationStartedAt: {
      type: Date,
      default: null,
    },
    preparationCompletedAt: {
      type: Date,
      default: null,
    },
    readyForPickupAt: {
      type: Date,
      default: null,
    },
    outForDeliveryAt: {
      type: Date,
      default: null,
    },

    fulfillmentEvents: {
      type: [
        new Schema(
          {
            status: {
              type: String,
              required: true,
              enum: [
                "placed",
                "confirmed",
                "in_preparation",
                "preparation_complete",
                "ready_for_pickup",
                "out_for_delivery",
                "fulfilled",
                "canceled",
              ],
            },
            source: {
              type: String,
              required: true,
              enum: ["portal", "pos", "api", "system"],
              default: "portal",
            },
            occurredAt: {
              type: Date,
              required: true,
              default: Date.now,
            },
          },
          { _id: false },
        ),
      ],
      default: [],
    },

    // ===============================
    // SUPPORT / AUDIT
    // ===============================

    historyEvents: {
      type: [orderHistoryEventSchema],
      default: [],
    },

    customerNote: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    floristInternalNote: {
      type: String,
      trim: true,
      maxlength: 5000,
      default: "",
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    minimize: false,
    strict: true,
    versionKey: "__v",
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
    },
  },
);

// ===============================
// INDEXES
// ===============================

bloomWebsiteOrderSchema.index({
  shop: 1,
  createdAt: -1,
});

bloomWebsiteOrderSchema.index({
  shop: 1,
  status: 1,
  createdAt: -1,
});

bloomWebsiteOrderSchema.index({
  shop: 1,
  "payment.status": 1,
  createdAt: -1,
});

bloomWebsiteOrderSchema.index({
  website: 1,
  createdAt: -1,
});

bloomWebsiteOrderSchema.index({
  "fulfillment.requestedDate": 1,
  shop: 1,
  status: 1,
});

bloomWebsiteOrderSchema.index({
  "payment.providerPaymentId": 1,
  "payment.provider": 1,
});

bloomWebsiteOrderSchema.index(
  {
    idempotencyKey: 1,
  },
  {
    name: "uniq_bloomwebsite_order_idempotency_nonempty",
    unique: true,
    partialFilterExpression: {
      idempotencyKey: {
        $type: "string",
        $gt: "",
      },
    },
  },
);

bloomWebsiteOrderSchema.index(
  {
    checkoutAttempt: 1,
  },
  {
    name: "uniq_bloomwebsite_order_checkout_attempt",
    unique: true,
    partialFilterExpression: {
      checkoutAttempt: {
        $type: "objectId",
      },
    },
  },
);

// ===============================
// CANONICAL CONSISTENCY GUARDS
// ===============================

bloomWebsiteOrderSchema.pre("validate", function (next) {
  const order = this as mongoose.HydratedDocument<any>;

  const items = Array.isArray(order.items) ? order.items : [];

  if (items.length === 0) {
    return next(new Error("A BloomWebsite order must contain at least one item."));
  }

  let calculatedProductSubtotalCents = 0;
  let calculatedAddonSubtotalCents = 0;
  let calculatedItemCount = 0;

  for (const item of items) {
    if (
      item.productSubtotalCents !== item.unitPriceCents * item.quantity
    ) {
      return next(
        new Error(
          "A BloomWebsite order item product subtotal does not match its unit price and quantity.",
        ),
      );
    }

    let calculatedAddonLineTotal = 0;

    for (const addon of item.addons || []) {
      if (addon.lineTotalCents !== addon.unitPriceCents * addon.quantity) {
        return next(
          new Error(
            "A BloomWebsite order add-on total does not match its unit price and quantity.",
          ),
        );
      }

      calculatedAddonLineTotal += addon.lineTotalCents;
    }

    if (item.addonSubtotalCents !== calculatedAddonLineTotal) {
      return next(
        new Error(
          "A BloomWebsite order item add-on subtotal does not match its add-ons.",
        ),
      );
    }

    if (
      item.lineTotalCents !==
      item.productSubtotalCents + item.addonSubtotalCents
    ) {
      return next(
        new Error(
          "A BloomWebsite order item total does not match its product and add-on subtotals.",
        ),
      );
    }

    calculatedProductSubtotalCents += item.productSubtotalCents;
    calculatedAddonSubtotalCents += item.addonSubtotalCents;
    calculatedItemCount += item.quantity;
  }

  if (order.itemCount !== calculatedItemCount) {
    return next(new Error("BloomWebsite order itemCount is inconsistent."));
  }

  if (order.totals.productSubtotalCents !== calculatedProductSubtotalCents) {
    return next(
      new Error("BloomWebsite product subtotal is inconsistent with its items."),
    );
  }

  if (order.totals.addonSubtotalCents !== calculatedAddonSubtotalCents) {
    return next(
      new Error("BloomWebsite add-on subtotal is inconsistent with its items."),
    );
  }

  const expectedSubtotal =
    order.totals.productSubtotalCents + order.totals.addonSubtotalCents;

  if (order.totals.subtotalCents !== expectedSubtotal) {
    return next(new Error("BloomWebsite subtotal is inconsistent."));
  }

  if (
    order.totals.fulfillmentFeeCents !== order.fulfillment.deliveryFeeCents
  ) {
    return next(
      new Error("BloomWebsite fulfillment fee is inconsistent with fulfillment."),
    );
  }

  if (order.totals.taxableSubtotalCents !== order.tax.taxableSubtotalCents) {
    return next(new Error("BloomWebsite taxable subtotal is inconsistent."));
  }

  if (order.totals.taxAmountCents !== order.tax.taxAmountCents) {
    return next(new Error("BloomWebsite tax amount is inconsistent."));
  }

  const taxLines = Array.isArray(order.tax.lines) ? order.tax.lines : [];
  if (taxLines.length > 0) {
    const calculatedTaxFromLines = taxLines.reduce(
      (sum: number, line: any) => sum + line.taxAmountCents,
      0,
    );

    if (calculatedTaxFromLines !== order.tax.taxAmountCents) {
      return next(
        new Error("BloomWebsite tax line amounts do not match the tax total."),
      );
    }

    const calculatedTaxableFromLines = taxLines.reduce(
      (sum: number, line: any) => sum + line.taxableAmountCents,
      0,
    );

    if (calculatedTaxableFromLines !== order.tax.taxableSubtotalCents) {
      return next(
        new Error(
          "BloomWebsite taxable tax-line amounts do not match the taxable subtotal.",
        ),
      );
    }
  }

  const expectedTotal =
    order.totals.subtotalCents +
    order.totals.fulfillmentFeeCents +
    order.totals.taxAmountCents +
    order.totals.tipCents;

  if (order.totals.totalCents !== expectedTotal) {
    return next(new Error("BloomWebsite order total is inconsistent."));
  }

  if (order.payment.amountCents !== order.totals.totalCents) {
    return next(
      new Error("BloomWebsite payment amount must match the order total."),
    );
  }

  for (const refund of order.refunds || []) {
    const allocations = Array.isArray(refund.allocations)
      ? refund.allocations
      : [];

    if (allocations.length > 0) {
      let allocationTotal = 0;

      for (const allocation of allocations) {
        if (
          allocation.totalAmountCents !==
          allocation.principalAmountCents + allocation.taxAmountCents
        ) {
          return next(
            new Error(
              "BloomWebsite refund allocation does not reconcile principal and tax.",
            ),
          );
        }

        allocationTotal += allocation.totalAmountCents;
      }

      if (allocationTotal !== refund.amountCents) {
        return next(
          new Error(
            "BloomWebsite refund allocations do not reconcile with the refund total.",
          ),
        );
      }
    }
  }

  if (order.totalRefundedCents > order.totals.totalCents) {
    return next(
      new Error("BloomWebsite refunded amount cannot exceed the order total."),
    );
  }

  if (
    order.fulfillment.type === "pickup" &&
    order.fulfillment.deliveryFeeCents !== 0
  ) {
    return next(new Error("Pickup orders cannot contain a delivery fee."));
  }

  if (order.status === "fulfilled" && !order.fulfilledAt) {
    order.fulfilledAt = new Date();
  }

  if (order.status === "canceled" && !order.cancellation?.canceledAt) {
    order.cancellation = {
      ...(order.cancellation?.toObject?.() || order.cancellation || {}),
      canceledAt: new Date(),
    };
  }

  next();
});

export default
  mongoose.models.BloomWebsiteOrder ||
  mongoose.model("BloomWebsiteOrder", bloomWebsiteOrderSchema);
