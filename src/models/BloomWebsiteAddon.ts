// src/models/BloomWebsiteAddon.ts

import mongoose, { Schema } from "mongoose";

const bloomWebsiteAddonSchema = new Schema(
  {
    // ===============================
    // OWNERSHIP
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

    // ===============================
    // IDENTITY
    // ===============================

    sku: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },

    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Extras",
      index: true,
    },

    // ===============================
    // MEDIA
    // ===============================

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    galleryImages: {
      type: [String],
      default: [],
    },

    imageAltText: {
      type: String,
      trim: true,
      maxlength: 250,
      default: "",
    },

    // ===============================
    // PRICING
    // ===============================

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    taxable: {
      type: Boolean,
      default: true,
    },

    /**
     * Optional BloomWebsites-native tax-rate override.
     * Null means "use the website default tax rate."
     */
    taxRatePercent: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },

    // ===============================
    // AVAILABILITY RULES
    // ===============================

    /*
     * Universal add-ons are offered broadly across
     * the storefront.
     *
     * Non-universal add-ons can later be attached to
     * individual products through availableAddons.
     */
    isUniversal: {
      type: Boolean,
      default: false,
      index: true,
    },

    /*
     * Optional category restriction for universal
     * add-ons.
     *
     * Example:
     *
     * Mylar Balloon:
     * Flowers, Plants, Gift Baskets
     *
     * Funeral Ribbon:
     * Funeral
     *
     * An empty array means no category restriction.
     */
    eligibleProductCategories: {
      type: [String],
      default: [],
    },

    maxQuantity: {
      type: Number,
      min: 1,
      default: 1,
    },

    // ===============================
    // INVENTORY
    // ===============================

    inventory: {
      trackInventory: {
        type: Boolean,
        default: false,
      },

      quantity: {
        type: Number,
        min: 0,
        default: 0,
      },
    },

    // ===============================
    // SEASONAL AVAILABILITY
    // ===============================

    availability: {
      type: {
        type: String,
        enum: ["always", "date_range"],
        default: "always",
      },

      startDate: {
        type: Date,
        default: null,
      },

      endDate: {
        type: Date,
        default: null,
      },
    },

    // ===============================
    // STATUS
    // ===============================

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    soldOut: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

bloomWebsiteAddonSchema.index(
  {
    website: 1,
    slug: 1,
  },
  {
    unique: true,
  },
);

bloomWebsiteAddonSchema.index({
  website: 1,
  sku: 1,
});

bloomWebsiteAddonSchema.index({
  website: 1,
  isActive: 1,
  sortOrder: 1,
});

bloomWebsiteAddonSchema.index({
  website: 1,
  isUniversal: 1,
  isActive: 1,
  sortOrder: 1,
});

bloomWebsiteAddonSchema.index({
  website: 1,
  eligibleProductCategories: 1,
});

bloomWebsiteAddonSchema.index({
  website: 1,
  "availability.type": 1,
});

export default
  mongoose.models.BloomWebsiteAddon ||
  mongoose.model(
    "BloomWebsiteAddon",
    bloomWebsiteAddonSchema,
  );