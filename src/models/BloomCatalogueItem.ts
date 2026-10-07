// src/models/BloomCatalogueItem.ts

import mongoose, { Schema } from "mongoose";

const catalogueAssetSchema = new Schema(
  {
    originalKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    originalUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    originalMimeType: {
      type: String,
      trim: true,
      maxlength: 100,
      default: "",
    },
    originalFileSize: {
      type: Number,
      min: 0,
      default: 0,
    },
    optimizedKey: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    optimizedUrl: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2048,
    },
    optimizedFileSize: {
      type: Number,
      min: 0,
      default: 0,
    },
    width: {
      type: Number,
      min: 1,
      default: null,
    },
    height: {
      type: Number,
      min: 1,
      default: null,
    },
  },
  { _id: false },
);

const bloomCatalogueItemSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 160,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1200,
      default: "",
    },
    flowers: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      default: [],
    },
    occasions: {
      type: [String],
      default: [],
    },
    categories: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    image: {
      type: catalogueAssetSchema,
      required: true,
    },
    isDesignerChoice: {
      type: Boolean,
      default: false,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
  },
  { timestamps: true },
);

bloomCatalogueItemSchema.index({ isActive: 1, sortOrder: 1, title: 1 });
bloomCatalogueItemSchema.index({ categories: 1, isActive: 1 });
bloomCatalogueItemSchema.index({ occasions: 1, isActive: 1 });

export default mongoose.models.BloomCatalogueItem ||
  mongoose.model("BloomCatalogueItem", bloomCatalogueItemSchema);
