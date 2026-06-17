import mongoose, { Schema, models, model } from "mongoose";

const googleSearchResultSchema = new Schema(
  {
    googlePlaceId: {
      type: String,
      trim: true,
      default: "",
    },
    name: {
      type: String,
      trim: true,
      default: "",
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    formattedAddress: {
      type: String,
      trim: true,
      default: "",
    },
    rating: {
      type: Number,
      default: null,
    },
    addressComponents: {
      type: [Schema.Types.Mixed],
      default: [],
    },
  },
  { _id: false },
);

const googleSearchCacheSchema = new Schema(
  {
    zip: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    query: {
      type: String,
      required: true,
      trim: true,
    },
    results: {
      type: [googleSearchResultSchema],
      default: [],
    },
    source: {
      type: String,
      enum: ["google"],
      default: "google",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

googleSearchCacheSchema.index({ zip: 1, query: 1 });
googleSearchCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default models.GoogleSearchCache ||
  model("GoogleSearchCache", googleSearchCacheSchema);