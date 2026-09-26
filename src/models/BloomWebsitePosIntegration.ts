import mongoose, { Schema } from "mongoose";

const optionalString = {
  type: String,
  trim: true,
  default: "",
};

const bloomWebsitePosIntegrationSchema = new Schema(
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
    provider: {
      type: String,
      required: true,
      enum: ["tfpos"],
      default: "tfpos",
      index: true,
    },
    enabled: {
      type: Boolean,
      default: false,
    },
    automaticExport: {
      type: Boolean,
      default: true,
    },
    transport: {
      protocol: {
        type: String,
        enum: ["ftp", "ftps", "sftp"],
        default: "sftp",
      },
      host: optionalString,
      port: {
        type: Number,
        min: 1,
        max: 65535,
        default: 22,
        validate: {
          validator: Number.isInteger,
          message: "{PATH} must be an integer.",
        },
      },
      folder: {
        type: String,
        trim: true,
        default: "/",
      },
      username: optionalString,
      encryptedPassword: {
        type: String,
        default: "",
        select: false,
      },
      passwordIv: {
        type: String,
        default: "",
        select: false,
      },
      passwordAuthTag: {
        type: String,
        default: "",
        select: false,
      },
    },
    payloadEncryption: {
      mode: {
        type: String,
        enum: ["none", "xor", "3des"],
        default: "none",
      },
      encryptedKey: {
        type: String,
        default: "",
        select: false,
      },
      keyIv: {
        type: String,
        default: "",
        select: false,
      },
      keyAuthTag: {
        type: String,
        default: "",
        select: false,
      },
    },
    sourceVendor: {
      type: String,
      trim: true,
      maxlength: 120,
      default: "BloomWebsites",
    },
    lastConnectionTest: {
      status: {
        type: String,
        enum: ["", "succeeded", "failed"],
        default: "",
      },
      testedAt: {
        type: Date,
        default: null,
      },
      message: {
        type: String,
        trim: true,
        maxlength: 1000,
        default: "",
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    minimize: false,
  },
);

bloomWebsitePosIntegrationSchema.index(
  { website: 1, provider: 1 },
  {
    unique: true,
    name: "uniq_bloomwebsite_pos_provider",
  },
);

bloomWebsitePosIntegrationSchema.index({ shop: 1, enabled: 1 });

export default
  mongoose.models.BloomWebsitePosIntegration ||
  mongoose.model(
    "BloomWebsitePosIntegration",
    bloomWebsitePosIntegrationSchema,
  );
