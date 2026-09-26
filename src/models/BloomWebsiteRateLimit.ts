import mongoose, { Schema } from "mongoose";

const bloomWebsiteRateLimitSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    count: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: {
        expireAfterSeconds: 0,
      },
    },
  },
  {
    versionKey: false,
  },
);

export default mongoose.models.BloomWebsiteRateLimit ||
  mongoose.model("BloomWebsiteRateLimit", bloomWebsiteRateLimitSchema);
