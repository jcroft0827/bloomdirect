// src/models/Order.ts
import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  originatingShop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  originatingShopName: String,
  fulfillingShop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  fulfillingShopName: String,

  recipient: {
    firstName: String,
    lastName: String,
    fullName: String,
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

  deliveryDate: { type: Date, required: true },
  deliveryTimeOption: { type: String, enum: ["anytime", "specific"], default: "anytime" },
  deliveryTimeFrom: String,
  deliveryTimeTo: String,

  productName: String,
  productDescription: String,
  productPhoto: String,
  specialInstructions: String,

  totalCustomerPaid: { type: Number, required: true },
  bloomDirectFee: Number,
  fulfillingShopGets: Number,

  // Legacy — keep for old orders
  arrangementValue: Number,
  deliveryFee: Number,
  originatingFee: Number,

  status: {
    type: String,
    enum: ["pending", "accepted", "declined", "delivered"],
    default: "pending",
  },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);