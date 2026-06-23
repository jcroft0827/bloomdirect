import mongoose from "mongoose";

const websiteVerificationRequestSchema = new mongoose.Schema(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    shopName: {
      type: String,
      required: true,
    },

    shopEmail: {
      type: String,
    },

    phone: {
      type: String,
    },

    city: {
      type: String,
    },

    state: {
      type: String,
    },

    zip: {
      type: String,
    },

    websiteUrl: {
      type: String,
      required: true,
    },

    failureReason: {
      type: String,
    },

    matchedSignals: {
      type: [String],
      default: [],
    },

    riskSignals: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["pending", "approved", "declined"],
      default: "pending",
      index: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.WebsiteVerificationRequest ||
  mongoose.model(
    "WebsiteVerificationRequest",
    websiteVerificationRequestSchema
  );