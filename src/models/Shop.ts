import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const shopSchema = new mongoose.Schema(
  {
    // Core identity (Shop acts as the "user")
    shopName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, select: false }, // never send to client

    // Address (for search & delivery)
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true, maxlength: 2, uppercase: true },
    zip: { type: String, required: true },

    // Contact
    phone: { type: String, required: true },

    // Delivery settings
    deliveryRadius: { type: Number, default: 25 },
    sameDayCutoff: { type: String, default: "13:00" },
    deliveryFee: { type: Number, default: 20 },
    holidaySurcharge: { type: Number, default: 0 },

    // Payment methods
    venmoHandle: String,
    cashAppTag: String,
    zellePhoneOrEmail: String,

    // Public profile
    logo: { type: String },
    featuredBouquet: { type: String },
    bio: String,
    acceptsWalkIns: { type: Boolean, default: true },
    weddingConsultations: { type: Boolean, default: false },

    // Subscription / Stripe
    isPro: { type: Boolean, default: false },
    proSince: Date,
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    subscriptionStatus: {
      type: String,
      enum: ["active", "past_due", "canceled", "trialing", "unpaid", "inactive"],
      default: "inactive",
    },
    planId: String,
    cancelAtPeriodEnd: { type: Boolean, default: false },

    // Housekeeping
    lastLogin: Date,
    lastActive: Date,
    onboardingComplete: { type: Boolean, default: false },

    // Search / geo (optional)
    geoLocation: {
      type: { type: String, enum: ["Point"], default: "Point" },
      coordinates: { type: [Number], default: [0, 0] }, // [lng, lat]
    },

    // Future features
    deliveryFeesByDistance: [{ distance: Number, fee: Number }],
    deliveryFeesByZip: [String],
  },
  { timestamps: true }
);

// Hash password before save if changed
shopSchema.pre("save", function (next) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const doc: any = this;
  if (doc.isModified("password")) {
    doc.password = bcrypt.hashSync(doc.password, 10);
  }
  next();
});

export default mongoose.models.Shop || mongoose.model("Shop", shopSchema);
