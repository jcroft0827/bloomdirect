import mongoose, { Schema } from "mongoose";
import { OrderStatus } from "@/lib/order-status";

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },

  // Flow Participants
  originatingShop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
  originatingShopName: String,
  fulfillingShop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
  fulfillingShopName: String,

  // Recipient (Updated with apt/company)
  recipient: {
    firstName: String,
    lastName: String,
    fullName: String,
    address: String,
    apt: String,
    city: String,
    state: String,
    zip: String,
    phone: String,
    email: String,
    company: String,
    message: String,
  },

  // Customer
  customer: {
    firstName: String,
    lastName: String,
    fullName: String,
    email: String,
    phone: String,
  },

  // Logistics
  logistics: {
    deliveryDate: Date,
    deliveryTimeOption: String, // Matches frontend 'deliveryTimeOption'
    deliveryTimeFrom: String,   // Matches frontend 'deliveryTimeFrom'
    deliveryTimeTo: String,     // Matches frontend 'deliveryTimeTo'
    specialInstructions: String,
  },


  // Products Array
  products: [{
    name: { type: String, required: true },
    description: String,
    photo: String, 
    price: Number,
    qty: { type: Number, default: 1 },
    taxable: { type: Boolean, default: true },
  }],

  // Pricing (Aligned exactly with Frontend keys)
  pricing: {
    productsTotal: Number,
    deliveryFee: Number,
    taxAmount: Number,
    customerPays: Number,
    orderTotal: Number,
    fulfillingShopGets: Number,
    feeCharge: Number,
  },

  // Payment (Pluralized to match Frontend)
  paymentMethods: {
    venmo: String,
    cashapp: String,
    zelle: String,
    paypal: String,
    default: String,
  },

  paymentMarkedPaidAt: Date,

  status: {
    type: String,
    enum: Object.values(OrderStatus),
    default: OrderStatus.PENDING_ACCEPTANCE,
  },

  declineReason: String,
  declineMessage: String,
  declineCount: { type: Number, default: 0 },
  declineHistory: [
    {
      shop: { type: Schema.Types.ObjectId, ref: "Shop" },
      shopName: String,
      reason: String,
      message: String,
      declinedAt: { type: Date, default: Date.now },
    }
  ],

  activityLog: [
    {
      action: String,
      message: String,
      actorShop: { type: Schema.Types.ObjectId, ref: "Shop" },
      createdAt: { type: Date, default: Date.now },
    }
  ],

  acceptedAt: Date,
  declinedAt: Date,
  paidAt: Date,
  completedAt: Date,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
