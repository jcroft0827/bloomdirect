import mongoose, { Schema } from "mongoose";

const optionalString = {
  type: String,
  trim: true,
  default: "",
};

const exportAttemptSchema = new Schema(
  {
    attemptNumber: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be an integer.",
      },
    },
    trigger: {
      type: String,
      enum: ["automatic", "manual", "retry", "system"],
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "uploaded", "failed"],
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    errorCode: optionalString,
    errorMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  { _id: false },
);

const bloomWebsitePosExportSchema = new Schema(
  {
    shop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    website: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsite",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsiteOrder",
      required: true,
      index: true,
    },
    integration: {
      type: Schema.Types.ObjectId,
      ref: "BloomWebsitePosIntegration",
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ["tfpos"],
      required: true,
      default: "tfpos",
    },
    format: {
      type: String,
      enum: ["xml"],
      required: true,
      default: "xml",
    },
    transportProtocol: {
      type: String,
      enum: ["ftp", "ftps", "sftp"],
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "processing", "uploaded", "failed"],
      required: true,
      default: "pending",
      index: true,
    },
    remoteFilename: {
      type: String,
      required: true,
      trim: true,
      maxlength: 240,
    },
    payloadSha256: {
      type: String,
      required: true,
      trim: true,
      minlength: 64,
      maxlength: 64,
    },
    /*
     * Store the exact XML sent to the POS so a manual resend can replay the
     * original order snapshot instead of regenerating from later-edited data.
     * This contains order PII, but never PAN/CVV or raw processor secrets.
     */
    payloadXml: {
      type: String,
      required: true,
    },
    attempts: {
      type: [exportAttemptSchema],
      default: [],
    },
    firstUploadedAt: {
      type: Date,
      default: null,
    },
    lastUploadedAt: {
      type: Date,
      default: null,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    lastErrorCode: optionalString,
    lastErrorMessage: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
  },
);

bloomWebsitePosExportSchema.index(
  { order: 1, integration: 1 },
  {
    unique: true,
    name: "uniq_bloomwebsite_order_pos_export",
  },
);

bloomWebsitePosExportSchema.index({
  website: 1,
  status: 1,
  updatedAt: -1,
});

export default
  mongoose.models.BloomWebsitePosExport ||
  mongoose.model("BloomWebsitePosExport", bloomWebsitePosExportSchema);
