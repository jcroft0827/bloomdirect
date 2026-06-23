import mongoose from "mongoose";

const zipDemandSchema = new mongoose.Schema(
    {
        zip: { type: String, required: true, unique: true },
        demandScore: { type: Number, default: 0, required: true },
        lastUpdated: { type: Date, default: Date.now },
    },
    { timestamps: true }
);

export default mongoose.models.ZipDemand || mongoose.model("ZipDemand", zipDemandSchema);