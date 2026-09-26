// src/models/BloomWebsiteInventoryReservation.ts

import mongoose, { Schema } from "mongoose";

const reservationLineSchema = new Schema(
  {
    kind: {
      type: String,
      required: true,
      enum: ["product", "addon"],
    },

    item: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    name: {
      type: String,
      trim: true,
      maxlength: 160,
      default: "",
    },

    sku: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
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
  },
  {
    _id: false,
  },
);

const bloomWebsiteInventoryReservationSchema = new Schema(
  {
    // ===============================
    // OWNERSHIP / CHECKOUT LINK
    // ===============================

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

    checkoutAttempt: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsiteCheckoutAttempt",
      required: true,
      unique: true,
      index: true,
    },

    attemptId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // ===============================
    // RESERVATION STATE
    // ===============================

    status: {
      type: String,
      required: true,
      enum: ["active", "committed", "released"],
      default: "active",
      index: true,
    },

    lines: {
      type: [reservationLineSchema],
      default: [],
    },

    reservedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    /*
     * This timestamp is application authority, not an automatic
     * Mongo TTL release. Inventory has already been decremented,
     * so expired reservations must be released through the
     * inventory service before their records can be discarded.
     */
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },

    committedAt: {
      type: Date,
      default: null,
    },

    releasedAt: {
      type: Date,
      default: null,
    },

    releaseReason: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    /*
     * Terminal records may be cleaned up later. Active reservation
     * rows intentionally never use a TTL because deleting an active
     * row would lose the information required to restore inventory.
     */
    cleanupAt: {
      type: Date,
      default: null,
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

bloomWebsiteInventoryReservationSchema.index({
  website: 1,
  status: 1,
  expiresAt: 1,
});

bloomWebsiteInventoryReservationSchema.index({
  shop: 1,
  status: 1,
  createdAt: -1,
});

bloomWebsiteInventoryReservationSchema.index(
  {
    cleanupAt: 1,
  },
  {
    expireAfterSeconds: 0,
  },
);

export default
  mongoose.models.BloomWebsiteInventoryReservation ||
  mongoose.model(
    "BloomWebsiteInventoryReservation",
    bloomWebsiteInventoryReservationSchema,
  );
