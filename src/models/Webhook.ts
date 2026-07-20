// models/Webhook.ts
import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema(
  {
    shopId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },

    url: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },

    events: {
      type: [String],
      enum: [
        "order.created",
        "order.accepted",
        "order.declined",
        "order.paid",
        "order.completed",
      ],
      default: [],
    },

    encryptedSecret: {
      type: String,
      required: true,
      select: false,
    },

    encryptionIv: {
      type: String,
      required: true,
      select: false,
    },

    encryptionAuthTag: {
      type: String,
      required: true,
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

webhookSchema.index({ shopId: 1 }, { unique: true },);

export default mongoose.models.Webhook ||
  mongoose.model("Webhook", webhookSchema);

