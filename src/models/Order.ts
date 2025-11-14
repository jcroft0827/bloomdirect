import mongoose from "mongoose";

const orderSchema = new mongoose.Schema({
  originatingShop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  fulfillingShop: { type: mongoose.Schema.Types.ObjectId, ref: "Shop", required: true },
  recipientName: String,
  recipientAddress: String,
  recipientCity: String,
  recipientState: String,
  recipientZip: String,
  cardMessage: String,
  arrangementValue: Number,
  deliveryFee: Number,
  originatingFee: Number,
  totalCustomerPaid: Number,
  status: { type: String, enum: ["pending", "accepted", "declined", "completed"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);