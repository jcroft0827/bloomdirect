// models/Order.ts

import mongoose, { Schema } from "mongoose";
import { OrderStatus } from "@/lib/order-status";
import { OrderActivityActions } from "@/lib/order-activity";

const moneyValidator = {
  validator: Number.isInteger,
  message: "{PATH} must be an integer number of cents.",
};

const percentageValidator = {
  validator: Number.isFinite,
  message: "{PATH} must be a valid number.",
};

const optionalTrimString = {
  type: String,
  trim: true,
  default: "",
};

const recipientSchema = new Schema(
  {
    firstName: optionalTrimString,
    lastName: optionalTrimString,
    fullName: optionalTrimString,
    address: optionalTrimString,
    apt: optionalTrimString,
    city: optionalTrimString,
    state: optionalTrimString,
    zip: optionalTrimString,
    phone: optionalTrimString,
    email: { ...optionalTrimString, lowercase: true },
    company: optionalTrimString,
    message: optionalTrimString,
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    firstName: optionalTrimString,
    lastName: optionalTrimString,
    fullName: optionalTrimString,
    email: { ...optionalTrimString, lowercase: true },
    phone: optionalTrimString,
  },
  { _id: false },
);

const logisticsSchema = new Schema(
  {
    deliveryDate: { type: Date, default: null },
    deliveryTimeOption: optionalTrimString,
    deliveryTimeFrom: optionalTrimString,
    deliveryTimeTo: optionalTrimString,
    specialInstructions: optionalTrimString,
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: optionalTrimString,
    photo: optionalTrimString,
    priceCents: {
      type: Number,
      required: true,
      min: 0,
      validate: moneyValidator,
    },
    qty: {
      type: Number,
      required: true,
      default: 1,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: "{PATH} must be an integer.",
      },
    },
    taxable: { type: Boolean, default: true },
  },
  { _id: false },
);

const originatingShopFeeSchema = new Schema(
  {
    feeType: { type: String, required: true, enum: ["%", "flat"] },
    feeValue: {
      type: Number,
      required: true,
      min: 0,
      validate: percentageValidator,
    },
  },
  { _id: false },
);

const pricingSchema = new Schema(
  {
    taxableSubtotalCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    productsTotalCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    deliveryFeeCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    taxPercentage: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: percentageValidator,
    },
    deliveryTaxed: { type: Boolean, default: false },
    feeTaxed: { type: Boolean, default: false },
    taxAmountCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    originatingShopFeeCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    customerPaysCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    orderTotalCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    fulfillingShopGetsCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
    originatingShopKeepsCents: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      validate: moneyValidator,
    },
  },
  { _id: false },
);

const paymentMethodsSchema = new Schema(
  {
    venmo: optionalTrimString,
    cashapp: optionalTrimString,
    zelle: optionalTrimString,
    paypal: optionalTrimString,
    default: {
      type: String,
      trim: true,
      default: "venmo",
      enum: ["venmo", "cashapp", "zelle", "paypal"],
    },
  },
  { _id: false },
);

const declineHistorySchema = new Schema(
  {
    shop: { type: Schema.Types.ObjectId, ref: "Shop", required: true },
    shopName: { type: String, trim: true, default: "" },
    reason: { type: String, trim: true, default: "" },
    message: { type: String, trim: true, default: "" },
    declinedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const activityLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: Object.values(OrderActivityActions),
    },
    message: { type: String, trim: true, default: "" },
    actorShop: { type: Schema.Types.ObjectId, ref: "Shop", default: null },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    originatingShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    originatingShopName: { type: String, trim: true, default: "" },

    fulfillingShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
      index: true,
    },
    fulfillingShopName: { type: String, trim: true, default: "" },

    originatingShopFee: {
      type: originatingShopFeeSchema,
      required: true,
      default: () => ({ feeType: "flat", feeValue: 0 }),
    },

    recipient: { type: recipientSchema, default: () => ({}), required: true },
    customer: { type: customerSchema, default: () => ({}), required: true },
    logistics: { type: logisticsSchema, default: () => ({}) },

    products: {
      type: [productSchema],
      required: true,
      validate: {
        validator: (value: unknown[]) =>
          Array.isArray(value) && value.length > 0,
        message: "products must contain at least one item.",
      },
    },

    pricing: { type: pricingSchema, required: true, default: () => ({}) },

    paymentMethods: { type: paymentMethodsSchema, default: () => ({}) },

    paymentMethodUsed: {
      type: String,
      trim: true,
      enum: ["venmo", "cashapp", "zelle", "paypal"],
      default: null,
    },

    status: {
      type: String,
      enum: Object.values(OrderStatus),
      default: OrderStatus.PENDING_ACCEPTANCE,
      index: true,
    },

    declineReason: { type: String, trim: true, default: "" },
    declineMessage: { type: String, trim: true, default: "" },
    declineCount: { type: Number, default: 0, min: 0 },

    declineHistory: { type: [declineHistorySchema], default: [] },
    activityLog: { type: [activityLogSchema], default: [] },

    acceptedAt: { type: Date, default: null },
    declinedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },

    lastUpdatedByShop: {
      type: Schema.Types.ObjectId,
      ref: "Shop",
      default: null,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
    minimize: false,
    strict: true,
    versionKey: "__v",
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete (ret as any).__v;
        return ret;
      },
    },
    toObject: { virtuals: true },
  },
);

orderSchema.index({ fulfillingShop: 1, status: 1, updatedAt: -1 });
orderSchema.index({ originatingShop: 1, status: 1, updatedAt: -1 });
orderSchema.index({ status: 1, updatedAt: -1 });

orderSchema.pre("validate", function (next) {
  const order = this as mongoose.HydratedDocument<any>;

  if (!Array.isArray(order.products) || order.products.length === 0) {
    return next(new Error("An order must contain at least one product."));
  }

  if (!order.originatingShopFee || !order.originatingShopFee.feeType) {
    return next(new Error("originatingShopFee is required."));
  }

  if (order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT) {
    if (!order.acceptedAt) order.acceptedAt = new Date();
  }

  if (order.status === OrderStatus.PAID_AWAITING_FULFILLMENT) {
    if (!order.acceptedAt) {
      return next(
        new Error("acceptedAt is required before an order can be marked paid."),
      );
    }
    if (!order.paidAt) order.paidAt = new Date();
    if (!order.paymentMethodUsed) {
      return next(
        new Error("paymentMethodUsed is required when the order is paid."),
      );
    }
  }

  if (order.status === OrderStatus.DECLINED) {
    if (!order.declinedAt) order.declinedAt = new Date();
    if (!order.declineReason?.trim()) {
      return next(
        new Error("declineReason is required when the order is declined."),
      );
    }
  }

  if (order.status === OrderStatus.COMPLETED) {
    if (!order.paidAt) {
      return next(
        new Error("paidAt is required before an order can be completed."),
      );
    }
    if (!order.completedAt) order.completedAt = new Date();
  }

  next();
});

export default mongoose.models.Order || mongoose.model("Order", orderSchema);

// // models/Order.ts

// import mongoose, { Schema } from "mongoose";
// import { OrderStatus } from "@/lib/order-status";
// import { OrderActivityActions } from "@/lib/order-activity";

// const orderSchema = new mongoose.Schema(
//   {
//     orderNumber: { type: String, required: true, unique: true },

//     // Flow Participants
//     originatingShop: {
//       type: Schema.Types.ObjectId,
//       ref: "Shop",
//       required: true,
//     },
//     originatingShopName: String,
//     fulfillingShop: {
//       type: Schema.Types.ObjectId,
//       ref: "Shop",
//       required: true,
//     },
//     fulfillingShopName: String,

//     // Recipient (Updated with apt/company)
//     recipient: {
//       firstName: String,
//       lastName: String,
//       fullName: String,
//       address: String,
//       apt: String,
//       city: String,
//       state: String,
//       zip: String,
//       phone: String,
//       email: String,
//       company: String,
//       message: String,
//     },

//     // Customer
//     customer: {
//       firstName: String,
//       lastName: String,
//       fullName: String,
//       email: String,
//       phone: String,
//     },

//     // Logistics
//     logistics: {
//       deliveryDate: Date,
//       deliveryTimeOption: String, // Matches frontend 'deliveryTimeOption'
//       deliveryTimeFrom: String, // Matches frontend 'deliveryTimeFrom'
//       deliveryTimeTo: String, // Matches frontend 'deliveryTimeTo'
//       specialInstructions: String,
//     },

//     // Products Array
//     products: [
//       {
//         name: { type: String, required: true },
//         description: String,
//         photo: String,
//         price: Number,
//         qty: { type: Number, default: 1 },
//         taxable: { type: Boolean, default: true },
//       },
//     ],

//     // Pricing (Aligned exactly with Frontend keys)
//     pricing: {
//       productsTotal: Number,
//       deliveryFee: Number,
//       taxAmount: Number,
//       customerPays: Number,
//       orderTotal: Number,
//       fulfillingShopGets: Number,
//       feeCharge: Number,
//     },

//     // Payment (Pluralized to match Frontend)
//     paymentMethods: {
//       venmo: String,
//       cashapp: String,
//       zelle: String,
//       paypal: String,
//       default: String,
//     },

//     paymentMethodUsed: {
//       type: String,
//       enum: ["venmo", "cashapp", "zelle", "paypal"],
//     },

//     status: {
//       type: String,
//       enum: Object.values(OrderStatus),
//       default: OrderStatus.PENDING_ACCEPTANCE,
//     },

//     declineReason: String,
//     declineMessage: String,
//     declineCount: { type: Number, default: 0 },
//     declineHistory: [
//       {
//         shop: { type: Schema.Types.ObjectId, ref: "Shop" },
//         shopName: String,
//         reason: String,
//         message: String,
//         declinedAt: { type: Date, default: Date.now },
//       },
//     ],

//     activityLog: [
//       {
//         action: {
//           type: String,
//           enum: Object.values(OrderActivityActions),
//         },
//         message: String,
//         actorShop: { type: Schema.Types.ObjectId, ref: "Shop" },
//         createdAt: { type: Date, default: Date.now },
//       },
//     ],

//     acceptedAt: Date,
//     declinedAt: Date,
//     paidAt: Date,
//     completedAt: Date,

//     lastUpdatedByShop: {
//       type: Schema.Types.ObjectId,
//       ref: "Shop",
//     },
//   },
//   { timestamps: true },
// );

// orderSchema.index({ fulfillingShop: 1, updatedAt: -1 });
// orderSchema.index({ originatingShop: 1, updatedAt: -1 });
// orderSchema.index({ status: 1 });

// export default mongoose.models.Order || mongoose.model("Order", orderSchema);
