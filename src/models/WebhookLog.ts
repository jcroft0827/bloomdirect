// models/WebhookLog.ts

import mongoose from "mongoose";

const webhookLogSchema = new mongoose.Schema({

  shopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },

  webhookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Webhook",
  },

  deliveryId: {
    type: String,
    required: true,
    unique: true,
  },

  event: {
    type: String,
    required: true,
  },

  url: {
    type: String,
    required: true,
    trim: true,
  },

  payload: {
    type: Object,
    required: true,
  },

  signature: String,

  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending",
  },

  attempts: {
    type: Number,
    default: 0,
  },

  nextRetryAt: {
    type: Date,
    default: Date.now,
  },

  lastAttemptAt: Date,
  deliveredAt: Date,
  responseStatus: Number,

  lastError: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.models.WebhookLog ||
  mongoose.model("WebhookLog", webhookLogSchema);