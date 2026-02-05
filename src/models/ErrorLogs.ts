import mongoose, { models, Schema } from "mongoose";

const ErrorLogsSchema = new Schema(
    {
        // Who triggered the error
        actorId: {
            type: Schema.Types.ObjectId,
            required: true,
            index: true,
        },

        // Where did the error come from in the system
        eventType: {
            type: String,
            required: true,
            index: true,
        },

        // Optional - If error is related to an order
        orderId: {
            type: Schema.Types.ObjectId,
            required: false,
            index: true,
        },

        // The error message string
        errorMessage: {
            type: String,
            required: true,
            index: true,
        },

        // Side notes from dev
        devMessage: {
            type: String,
            required: false,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

export default models.ErrorLogs || mongoose.model("ErrorLogs", ErrorLogsSchema);