import mongoose, { Schema } from "mongoose";

const optionalString = {
  type: String,
  trim: true,
  default: "",
};

const bloomWebsiteMerchantConnectionSchema = new Schema(
  {
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

    provider: {
      type: String,
      required: true,
      enum: ["stripe", "fiserv"],
      index: true,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "disconnected",
        "pending",
        "active",
        "restricted",
        "error",
      ],
      default: "disconnected",
      index: true,
    },

    providerMerchantId: optionalString,
    providerAccountId: optionalString,
    providerStoreId: optionalString,

    /*
     * Reference to a secret-manager/encrypted credential record.
     * Never store raw processor secrets, card data, CVV, or PAN here.
     */
    credentialReference: optionalString,

    chargesEnabled: {
      type: Boolean,
      default: false,
    },

    payoutsEnabled: {
      type: Boolean,
      default: false,
    },

    detailsSubmitted: {
      type: Boolean,
      default: false,
    },

    lastSyncedAt: {
      type: Date,
      default: null,
    },

    lastError: {
      code: optionalString,
      message: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
      occurredAt: {
        type: Date,
        default: null,
      },
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    strict: true,
    minimize: false,
  },
);

bloomWebsiteMerchantConnectionSchema.index(
  { website: 1, provider: 1 },
  {
    unique: true,
    name: "uniq_bloomwebsite_provider_connection",
  },
);

bloomWebsiteMerchantConnectionSchema.index({
  shop: 1,
  status: 1,
  updatedAt: -1,
});

export default
  mongoose.models.BloomWebsiteMerchantConnection ||
  mongoose.model(
    "BloomWebsiteMerchantConnection",
    bloomWebsiteMerchantConnectionSchema,
  );
