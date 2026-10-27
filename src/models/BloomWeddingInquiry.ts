import mongoose, { Schema } from "mongoose";

const schema = new Schema({
  shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true, index: true },
  website: { type: Schema.Types.ObjectId, ref: "BloomWebsite", required: true, index: true },
  name: { type: String, required: true, maxlength: 120 },
  email: { type: String, required: true, maxlength: 254 },
  phone: { type: String, maxlength: 40, default: "" },
  eventDate: { type: String, maxlength: 10, default: "" },
  venue: { type: String, maxlength: 180, default: "" },
  budget: { type: String, maxlength: 80, default: "" },
  eventType: { type: String, maxlength: 100, default: "" },
  message: { type: String, required: true, maxlength: 3000 },
  status: { type: String, enum: ["new", "contacted", "consultation", "booked", "closed"], default: "new" },
  internalNotes: { type: String, maxlength: 3000, default: "" },
  notificationSentAt: { type: Date, default: null },
}, {timestamps: true});
schema.index({shop: 1, createdAt: -1});
export default mongoose.models.BloomWeddingInquiry || mongoose.model("BloomWeddingInquiry", schema);
