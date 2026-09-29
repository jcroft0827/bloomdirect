// src/models/BloomWebsiteProduct.ts

import mongoose, { Schema } from "mongoose";

const recipeIngredientSchema = new Schema(
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
      default: 1,
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
);

const tierRecipeSchema = new Schema(
  {
    ingredients: {
      type: [recipeIngredientSchema],
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

const priceTierSchema = new Schema(
  {
    label: {
      type: String,
      enum: ["standard", "deluxe", "premium"],
      required: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },

    recipe: {
      type: tierRecipeSchema,
      default: () => ({
        ingredients: [],
        designerInstructions: "",
      }),
    },

    enabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    _id: false,
  },
);

const catalogImageMigrationItemSchema = new Schema(
  {
    kind: {
      type: String,
      enum: [
        "primary",
        "gallery",
        "standardTier",
        "deluxeTier",
        "premiumTier",
        "social",
      ],
      required: true,
    },
    url: {
      type: String,
      trim: true,
      maxlength: 2048,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "failed"],
      default: "pending",
    },
    error: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { _id: false },
);

const bloomWebsiteProductSchema = new Schema(
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
    // PRODUCT IDENTITY
    // ===============================

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
      maxlength: 3000,
      default: "",
    },

    category: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "Everyday",
      index: true,
    },

    sku: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },

    shortDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },

    occasions: {
      type: [String],
      default: [],
    },

    tags: {
      type: [String],
      default: [],
    },

    // ===============================
    // PRODUCT IMAGE
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

    // ===============================
    // PRICING
    // ===============================

    /*
     * Standard / Deluxe / Premium is fundamental
     * to florist ecommerce, so V1 stores these
     * directly on the product.
     */
    pricingTiers: {
      type: [priceTierSchema],
      default: [],
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

    seo: {
      title: {
        type: String,
        trim: true,
        maxlength: 70,
        default: "",
      },

      description: {
        type: String,
        trim: true,
        maxlength: 170,
        default: "",
      },

      imageAltText: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      allowIndexing: {
        type: Boolean,
        default: true,
      },

      canonicalUrl: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },

      socialTitle: {
        type: String,
        trim: true,
        maxlength: 100,
        default: "",
      },

      socialDescription: {
        type: String,
        trim: true,
        maxlength: 250,
        default: "",
      },

      socialImageUrl: {
        type: String,
        trim: true,
        default: "",
      },
    },

    // ===============================
    // IMPORT IMAGE MIGRATION
    // ===============================

    /*
     * Private migration state used only while copying externally hosted
     * catalog images into Bloom storage. Source URLs are never rendered
     * by the storefront and successful items are removed as they finish.
     */
    importImageMigration: {
      status: {
        type: String,
        enum: ["none", "pending", "partial", "failed", "complete"],
        default: "none",
      },
      items: {
        type: [catalogImageMigrationItemSchema],
        default: [],
      },
      migratedCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      failedCount: {
        type: Number,
        min: 0,
        default: 0,
      },
      lastError: {
        type: String,
        trim: true,
        maxlength: 500,
        default: "",
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },

    // ===============================
    // ADD-ONS
    // ===============================

    /*
     * Product-specific add-ons.
     *
     * Universal add-ons are handled separately through
     * BloomWebsiteAddon.isUniversal so florists do not
     * need to attach the same teddy bear, balloon, or
     * chocolates to every product manually.
     */
    availableAddons: [
      {
        type: Schema.Types.ObjectId,
        ref: "BloomWebsiteAddon",
      },
    ],

    // ===============================
    // PRODUCT BEHAVIOR
    // ===============================

    allowsSubstitutions: {
      type: Boolean,
      default: true,
    },

    localOnly: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
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

/*
 * Slugs only need to be unique within one website.
 *
 * Two different florists can both have:
 *
 * /products/designers-choice
 */
bloomWebsiteProductSchema.index(
  {
    website: 1,
    slug: 1,
  },
  {
    unique: true,
  },
);

bloomWebsiteProductSchema.index({
  website: 1,
  isActive: 1,
  sortOrder: 1,
});

bloomWebsiteProductSchema.index({
  website: 1,
  isFeatured: 1,
  sortOrder: 1,
});

bloomWebsiteProductSchema.index({
  website: 1,
  sku: 1,
});

bloomWebsiteProductSchema.index({
  website: 1,
  occasions: 1,
});

bloomWebsiteProductSchema.index({
  website: 1,
  "availability.type": 1,
});

export default mongoose.models.BloomWebsiteProduct ||
  mongoose.model("BloomWebsiteProduct", bloomWebsiteProductSchema);
