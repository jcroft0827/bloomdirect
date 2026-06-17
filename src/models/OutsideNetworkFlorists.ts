import { model, models, Schema } from "mongoose";

const OutsideNetworkFloristSchema = new Schema(
    {
        businessName: {
            type: String,
            required: true,
            trim: true,
        },

        phone: {
            type: String,
            default: "",
            trim: true,
        },

        email: {
            type: String,
            default: "",
            lowercase: true,
            trim: true,
        },

        address: {
            type: String,
            default: "",
            trim: true,
        },

        city: {
            type: String,
            default: "",
            trim: true,
        },

        state: {
            type: String,
            default: "",
            trim: true,
        },

        zip: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },

        googlePlaceId: {
            type: String,
            default: "",
            index: true,
        },

        source: {
            type: String,
            enum: ["google", "manual"],
            required: true,
            default: "manual",
        },

        timesUsed: {
            type: Number,
            default: 0,
        },

        firstUsedAt: {
            type: Date,
            default: Date.now,
        },

        lastUsedAt: {
            type: Date,
            default: Date.now,
        },
    },
    { timestamps: true },
);

OutsideNetworkFloristSchema.index({
    zip: 1,
    businessName: 1,
});

export default models.OutsideNetworkFlorist || model("OutsideNetworkFlorist", OutsideNetworkFloristSchema);