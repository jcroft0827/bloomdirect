import { model, models, Schema } from "mongoose";

const OrderMessagesSchema = new Schema({
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 2000,
    },

    sendingShop: {
        type: Schema.Types.ObjectId,
        ref: "Shop",
        required: true,
        index: true,
    },

    receivingShop: {
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

export default models.OrderMessages || model("OrderMessages", OrderMessagesSchema);