// models/FulfillmentOffering.ts

import mongoose, { Schema } from "mongoose";

const pricingTierSchema = new Schema(
  {
    label: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },
  },
  { _id: false },
);

const fulfillmentOfferingSchema = new Schema(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "designers_choice",
        "featured",
        "sympathy",
        "funeral",
        "wedding",
        "holiday",
        "everyday",
      ],
      default: "designers_choice",
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
      default: "Designer's Choice",
    },

    internalName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: "",
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      trim: true,
      default:
        "Let the florist create something beautiful using the freshest flowers available.",
      maxlength: 1000,
    },

    image: {
      type: String,
      default: "",
    },

    occasions: {
      type: [String],
      enum: [
        "birthday",
        "sympathy",
        "funeral",
        "anniversary",
        "love",
        "wedding",
        "just_because",
        "holiday",
        "everyday",
      ],
      default: ["everyday"],
      index: true,
    },

    pricingTiers: {
      type: [pricingTierSchema],
      validate: {
        validator: function (tiers: any[]) {
          return tiers.length >= 1 && tiers.length <= 3;
        },
        message: "Offerings must have between 1 and 3 pricing tiers.",
      },
      default: [
        { label: "Standard", price: 75, description: "" },
        { label: "Premium", price: 100, description: "" },
        { label: "Luxury", price: 150, description: "" },
      ],
    },

    internalNotes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    seasonalAvailability: {
      enabled: {
        type: Boolean,
        default: false,
      },
      startMonth: Number,
      startDay: Number,
      endMonth: Number,
      endDay: Number,
    },

    styleTags: {
      type: [String],
      default: [],
    },

    colorTags: {
      type: [String],
      default: [],
    },

    flowerTags: {
      type: [String],
      default: [],
    },

    taxable: {
      type: Boolean,
      default: true,
    },

    allowsSubstitutions: {
      type: Boolean,
      default: true,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    isDesignerChoice: {
      type: Boolean,
      default: false,
    },

    sortOrder: {
      type: Number,
      default: 0,
    },

    proOnly: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

fulfillmentOfferingSchema.index({ shop: 1, isActive: 1 });
fulfillmentOfferingSchema.index({ shop: 1, type: 1 });
fulfillmentOfferingSchema.index({ shop: 1, sortOrder: 1 });
fulfillmentOfferingSchema.index({ shop: 1, isDefault: 1 });
fulfillmentOfferingSchema.index({ shop: 1, occasions: 1 });
fulfillmentOfferingSchema.index(
  { shop: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "designers_choice",
      isActive: true,
    },
  },
);

export default mongoose.models.FulfillmentOffering ||
  mongoose.model("FulfillmentOffering", fulfillmentOfferingSchema);
