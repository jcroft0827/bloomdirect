import mongoose, { Schema } from "mongoose";

const invitedFloristSchema = new Schema(
  {
    shopName: {
      type: String,
      required: true,
      trim: true,
    },

    contactName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    website: {
      type: String,
      trim: true,
      default: "",
    },

    address: {
      street: {
        type: String,
        trim: true,
        default: "",
      },
      city: {
        type: String,
        trim: true,
        default: "",
      },
      state: {
        type: String,
        trim: true,
        uppercase: true,
        default: "",
      },
      zip: {
        type: String,
        trim: true,
        default: "",
      },
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },

    source: {
      type: String,
      enum: [
        "phone_call",
        "email",
        "referral",
        "trade_show",
        "facebook",
        "website",
        "in_person",
        "other",
      ],
      default: "other",
      index: true,
    },

    invitationDestination: {
      type: String,
      enum: ["homepage", "registration"],
      default: "registration",
    },

    invitationUrl: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: [
        "draft",
        "sent",
        "failed",
        "registered",
        "declined",
      ],
      default: "draft",
      index: true,
    },

    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },

    invitedAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastSentAt: {
      type: Date,
      default: null,
    },

    lastContactedAt: {
      type: Date,
      default: null,
    },

    convertedAt: {
      type: Date,
      default: null,
      index: true,
    },

    declinedAt: {
      type: Date,
      default: null,
    },

    sendCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    resendEmailId: {
      type: String,
      trim: true,
      default: "",
    },

    sendError: {
      type: String,
      trim: true,
      default: "",
    },

    registeredShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Common Admin Panel filtering and sorting
invitedFloristSchema.index({ status: 1, createdAt: -1 });
invitedFloristSchema.index({ invitedBy: 1, createdAt: -1 });
invitedFloristSchema.index({ invitedBy: 1, status: 1 });
invitedFloristSchema.index({ shopName: 1 });
invitedFloristSchema.index({ convertedAt: -1 });

export default mongoose.models.InvitedFlorist ||
  mongoose.model("InvitedFlorist", invitedFloristSchema);