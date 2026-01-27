// /models/Invite.ts

import mongoose, { model, models, Schema } from "mongoose";

const InviteSchema = new Schema(
  {
    token: { type: String, required: true, unique: true },
    invitedByShopId: { type: Schema.Types.ObjectId, ref: "Shop" },
    invitedByUserId: { type: Schema.Types.ObjectId, ref: "User" },
    uses: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default models.Invite || model("Invite", InviteSchema);