import mongoose from "mongoose";
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

  paymentMethod: {
    type: String,
    enum: ["venmo", "cashapp", "zelle", "other"],
  },
  paymentMarkedPaidAt: Date,

  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING_ACCEPTANCE,
  },

  // Timestamps (future-proof, optional use)
  acceptedAt: Date,
  declinedAt: Date,
  paidAt: Date,
  completedAt: Date,

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order ||
  mongoose.model("Order", orderSchema);
