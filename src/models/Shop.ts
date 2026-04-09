import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const shopSchema = new mongoose.Schema(
  {
    // ===============================
    // AUTH & ACCOUNT ACCESS
    // ===============================

    businessName: { type: String, required: true, trim: true },

    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
    },

    role: {
      type: String,
      enum: ["shop", "admin"],
      default: "shop",
    },

    securityCode: {
      type: String,
      default: "0829",
    },

    // ===============================
    // STATUS / ACCOUNT STATE
    // ===============================

    isVerified: {
      type: Boolean,
      default: false,
    },

    verifiedFlorist: {
      type: Boolean,
      default: false,
    },

    isSuspended: {
      type: Boolean,
      default: false,
    },

    suspensionReason: String,

    isPublic: {
      type: Boolean,
      default: true,
    },

    onboardingComplete: {
      type: Boolean,
      default: false,
    },

    networkJoinDate: Date,

    isPro: {
      type: Boolean,
      default: false,
    },

    proSince: Date,

    lastLogin: Date,

    lastActivity: Date,

    // ===============================
    // ACCOUNT SETUP PROGRESS
    // ===============================

    setupProgress: {
      businessInfo: { type: Boolean, default: false },
      paymentMethods: { type: Boolean, default: false },
      deliverySettings: { type: Boolean, default: false },
      financialSettings: { type: Boolean, default: false },
      featuredBouquet: { type: Boolean, default: false },
    },

    // ===============================
    // CONTACT INFORMATION
    // ===============================

    contact: {
      phone: String,
      whatsapp: String,
      emailSecondary: String,
      website: String,
    },

    // ===============================
    // PHYSICAL LOCATION
    // ===============================

    address: {
      street: String,
      city: String,
      state: String,
      zip: String,

      country: {
        type: String,
        default: "US",
      },

      timezone: {
        type: String,
        default: "America/New_York",
      },

      geoLocation: {
        type: { type: String, enum: ["Point"], default: "Point" },

        coordinates: {
          type: [Number],
          default: [0, 0], // [longitude, latitude]
        },
      },
    },

    // ===============================
    // PAYMENT METHODS
    // ===============================

    paymentMethods: {
      venmoHandle: String,

      cashAppTag: String,

      zellePhoneOrEmail: String,

      paypalEmail: String,

      defaultPaymentMethod: {
        type: String,
        enum: ["venmo", "cashapp", "zelle", "paypal"],
      },
    },

    // ===============================
    // STRIPE / SUBSCRIPTIONS
    // ===============================

    stripe: {
      customerId: String,

      subscriptionId: String,

      status: String,

      planId: String,

      cancelAtPeriodEnd: {
        type: Boolean,
        default: false,
      },

      trialEndsAt: Date,
    },

    // ===============================
    // DELIVERY ENGINE
    // ===============================

    delivery: {
      method: {
        type: String,
        enum: ["zip", "distance"],
        default: "zip",
      },

      zipZones: [
        {
          name: String,
          zip: String,
          fee: Number,
        },
      ],

      distanceZones: [
        {
          min: Number,
          max: Number,
          fee: Number,
        },
      ],

      fallbackFee: {
        type: Number,
        default: 0,
      },

      maxRadius: Number,

      minProductTotal: {
        type: Number,
        default: 0,
      },

      sameDayCutoff: {
        type: String,
        default: "14:00",
      },

      holidayDates: [{ name: String, date: Date}],

      holidaySurcharge: { type: Number, default: 0 },

      blackoutDates: [Date],

      blackoutTimes: [
        {
          start: String,
          end: String,
        },
      ],

      noMoreOrdersToday: {
        type: Boolean,
        default: false,
      },

      noMoreOrdersForDate: [Date],

      allowSameDay: {
        type: Boolean,
        default: true,
      },
    },

    // ===============================
    // TAXES & FEES
    // ===============================

    financials: {
      taxPercentage: {
        type: Number,
        default: 0,
      },

      deliveryTaxed: {
        type: Boolean,
        default: false,
      },

      feeTaxed: {
        type: Boolean,
        default: false,
      },

      feeType: {
        type: String,
        enum: ["%", "flat"],
        default: "flat",
      },

      feeValue: {
        type: Number,
        default: 0,
      },
    },

    // ===============================
    // NETWORK RELATIONSHIPS
    // ===============================

    preferredFlorists: [
      {
        shopId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Shop",
        },

        name: String,

        zip: String,
      },
    ],

    blockedFlorists: [
      {
        shopId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Shop",
        },

        reason: String,
      },
    ],

    // ===============================
    // NETWORK STATS
    // ===============================

    stats: {
      ordersSent: {
        type: Number,
        default: 0,
      },

      ordersReceived: {
        type: Number,
        default: 0,
      },

      ordersCompleted: {
        type: Number,
        default: 0,
      },

      ordersDeclined: {
        type: Number,
        default: 0,
      },

      responseRate: Number,

      avgResponseTimeMinutes: Number,
    },

    // ===============================
    // BRANDING
    // ===============================

    branding: {
      logo: String,

      bannerImage: String,

      bio: String,

      primaryColor: {
        type: String,
        default: "#000000",
      },

      socialLinks: {
        instagram: String,
        facebook: String,
        pinterest: String,
        tiktok: String,
      },

      featuredReviewId: mongoose.Schema.Types.ObjectId,
    },

    // ===============================
    // FEATURED PRODUCT
    // ===============================

    featuredBouquet: {
      name: String,

      price: Number,

      description: String,

      image: String,
    },

    // ===============================
    // PUBLIC REVIEWS
    // ===============================

    reviews: [
      {
        customerName: String,

        rating: {
          type: Number,
          min: 1,
          max: 5,
        },

        comment: String,

        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

// ===============================
// PASSWORD HASHING
// ===============================

shopSchema.pre("save", function (next) {
  if (!this.isModified("password")) return next();

  this.password = bcrypt.hashSync(this.password, 10);

  next();
});

// ===============================
// SLUG GENERATION
// ===============================

shopSchema.pre("save", function (next) {
  if (this.isModified("businessName") && !this.slug) {
    this.slug = this.businessName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  next();
});

// ===============================
// INDEXES
// ===============================

// Geo index for distance queries
shopSchema.index({
  "address.geoLocation": "2dsphere",
});

// Text search
shopSchema.index({
  businessName: "text",
  "address.zip": "text",
});

export default mongoose.models.Shop || mongoose.model("Shop", shopSchema);
