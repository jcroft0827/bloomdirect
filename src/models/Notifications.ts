import { model, models, Schema } from "mongoose";

const NotificationsSchema = new Schema({
    type: {
        type: String,
        enum: ["NewMessage", "NewOrder", "OrderAccepted", "OrderDeclined", "OrderPaid", "OrderComplete", "Rated", "Other"], // Extendable for future notification types
    },

    receivingShop: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true,
    },

    sendingShop: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true,
    },

    order: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        required: true,
        index: true,
    },

    message: {
        type: String,
        required: true,
        trim: true,
    },

    read: {
        type: Boolean,
        default: false,
    },

    readAt: {
        type: Date,
        default: null,
    },
}, {
    timestamps: true,
});

export default models.Notifications || model("Notifications", NotificationsSchema);