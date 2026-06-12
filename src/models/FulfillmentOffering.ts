// models/FulfillmentOffering.ts

import mongoose, { Schema } from "mongoose";

const pricingTierSchema = new Schema(
  {
    label: {
      type: String,
      enum: ["Standard", "Premium", "Luxury"],
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
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

    occasion: {
      type: String,
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
      default: "everyday",
      index: true,
    },

    pricingTiers: {
      type: [pricingTierSchema],
      default: [
        { label: "Standard", price: 75 },
        { label: "Premium", price: 100 },
        { label: "Luxury", price: 150 },
      ],
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
fulfillmentOfferingSchema.index(
  { shop: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: {
      type: "designers_choice",
      isActive: true,
    },
  }
);

export default mongoose.models.FulfillmentOffering || mongoose.model("FulfillmentOffering", fulfillmentOfferingSchema);