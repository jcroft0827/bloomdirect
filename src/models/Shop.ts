import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const shopSchema = new mongoose.Schema({
  shopName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  address: String,
  city: String,
  state: String,
  zip: String,
  phone: { type: String, required: true },
  deliveryRadius: { type: Number, default: 20 }, // miles
  isPro: Boolean,
  proSince: Date,
});

shopSchema.pre("save", function (next) {
  if (this.isModified("password")) {
    this.password = bcrypt.hashSync(this.password, 10);
  }
  next();
});

export default mongoose.models.Shop || mongoose.model("Shop", shopSchema);