import mongoose, { Schema } from "mongoose";

const shopSessionSchema = new Schema(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
  },
);

shopSessionSchema.index({ shopId: 1, lastSeenAt: -1 });

const ShopSession =
  mongoose.models.ShopSession ||
  mongoose.model("ShopSession", shopSessionSchema);

export default ShopSession;
