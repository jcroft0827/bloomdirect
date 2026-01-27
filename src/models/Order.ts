// src/models/Order.ts

import mongoose, { Schema } from "mongoose";
import { OrderStatus } from "@/lib/order-status";

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },

  originatingShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  originatingShopName: String,

  fulfillingShop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Shop",
    required: true,
  },
  fulfillingShopName: String,

  recipient: {
    firstName: String,
    lastName: String,
    address: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    email: String,
    message: String,
  },

  customer: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String,
  },

  deliveryDate: Date,

  productName: String,
  productDescription: String,
  productPhoto: String,
  specialInstructions: String,

  totalCustomerPaid: Number,
  bloomDirectFee: Number,
  fulfillingShopGets: Number,

  /* =====================
     PAYMENT
  ====================== */
  paymentMethod: {
    type: String,
    enum: ["venmo", "cashapp", "zelle", "other"],
  },
  paymentMarkedPaidAt: Date,

  /* =====================
     STATUS
  ====================== */
  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING_ACCEPTANCE,
  },

  /* =====================
     DECLINE HANDLING
  ====================== */
  declineReason: {
    type: String,
    enum: [
      "OUT_OF_STOCK",
      "DELIVERY_UNAVAILABLE",
      "TOO_BUSY",
      "PRICE_TOO_LOW",
      "OUT_OF_AREA",
      "OTHER",
    ],
  },

  declineMessage: {
    type: String,
    trim: true,
    maxlength: 500,
  },

  declineCount: {
    type: Number,
    default: 0,
  },

  declineHistory: [
    {
      shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop",
      },
      shopName: String,
      reason: String,
      message: String,
      declinedAt: Date,
    },
  ],

    /* =====================
     Activity Log
  ====================== */
  activityLog: [
    {
      action: String, // "DECLINED", "REASSIGNED", "PAID", etc.
      message: String,
      actorShop: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
      },
      createdAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],



  /* =====================
     TIMESTAMPS
  ====================== */
  acceptedAt: Date,
  declinedAt: Date,
  paidAt: Date,
  completedAt: Date,

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order ||
  mongoose.model("Order", orderSchema);