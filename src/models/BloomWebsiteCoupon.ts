import mongoose, { Schema } from "mongoose";

/** Coupon definitions only. Checkout redemption is intentionally NOT enabled in C2A. */
const couponSchema = new Schema({
  shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  website: { type: Schema.Types.ObjectId, ref: "BloomWebsite", required: true, index: true },
  code: { type: String, required: true, uppercase: true, trim: true, maxlength: 32 },
  description: { type: String, trim: true, maxlength: 240, default: "" },
  discountType: { type: String, enum: ["percentage", "fixed"], required: true },
  /** Percentage in basis points (10000 = 100%), or fixed discount in cents. */
  amount: { type: Number, required: true, min: 1 },
  minimumMerchandiseCents: { type: Number, default: 0, min: 0 },
  startsAt: { type: Date, default: null },
  expiresAt: { type: Date, default: null },
  usageLimit: { type: Number, default: null, min: 1 },
  redemptionCount: { type: Number, default: 0, min: 0 },
  // Idempotency ledger: payment recovery/webhook retries cannot count twice.
  redeemedAttemptIds: { type: [String], default: [] },
  // Stage 3B2D: active holds are stored ON the coupon so MongoDB can enforce
  // capacity in one atomic document update, including across app instances.
  reservations: {
    type: [{
      _id: false,
      attemptId: { type: String, required: true, trim: true },
      expiresAt: { type: Date, required: true },
    }],
    default: [],
  },
  isActive: { type: Boolean, default: false },
}, { timestamps: true });

couponSchema.index({ website: 1, code: 1 }, { unique: true });

export default mongoose.models.BloomWebsiteCoupon ||
  mongoose.model("BloomWebsiteCoupon", couponSchema);
