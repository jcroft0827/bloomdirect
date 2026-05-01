// models/Webhook.ts
import mongoose from "mongoose";

const webhookSchema = new mongoose.Schema({
  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },

  url: {
    type: String,
    required: true,
    trim: true,
  },

  events: {
    type: [String], // ["order.paid", "order.completed"]
    default: [],
  },

  secret: {
    type: String,
    required: true,
    trim: true,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.models.Webhook ||
  mongoose.model("Webhook", webhookSchema);