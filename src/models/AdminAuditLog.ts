import mongoose, { Schema } from "mongoose";

const AdminAuditLogSchema = new Schema(
  {
    adminShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    targetShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    action: {
      type: String,
      enum: [
        "SHOP_SUSPENDED",
        "SHOP_UNSUSPENDED",
        "SHOP_MARKED_SPAM",
        "SHOP_MARKED_LEGITIMATE",
        "SHOP_ARCHIVED",
        "SHOP_RESTORED",
        "SHOP_DELETED",
        "SHOP_READINESS_REMINDER_SENT",
        "INVITATION_SENT",
        "SUPPORT_NOTE_ADDED",
        "BILLING_ACTION", 
      ],
      required: true,
      index: true,
    },
    reason: { type: String, required: true, trim: true, maxlength: 500 },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: { type: String, }
  },
  { timestamps: true },
);

AdminAuditLogSchema.index({ targetShop: 1, createdAt: -1 });
AdminAuditLogSchema.index({ adminShop: 1, createdAt: -1 });
AdminAuditLogSchema.index({ action: 1, createdAt: -1 });

export const AdminAuditLog =
  mongoose.models.AdminAuditLog ||
  mongoose.model("AdminAuditLog", AdminAuditLogSchema);
