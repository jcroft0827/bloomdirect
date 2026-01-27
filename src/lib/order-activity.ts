// src/lib/order-activity.ts

import type { Types } from "mongoose";
import Order from "@/models/Order";

type AddOrderActivityParams = {
    orderId: Types.ObjectId | string;
    action: OrderActivityAction;
    actorShopId?: Types.ObjectId | string;
    message?: string;
};

export type OrderActivityAction = 
    (typeof OrderActivityActions)[keyof typeof OrderActivityActions];

export async function addOrderActivity({
    orderId,
    action,
    actorShopId,
    message,
}: AddOrderActivityParams) {
    await Order.findByIdAndUpdate(
        orderId,
        {
            $push: {
                activityLog: {
                    action,
                    actorShop: actorShopId,
                    message,
                    createdAt: new Date(),
                },
            },
        },
        { new: true }
    );
}

export const OrderActivityActions = {
    ORDER_CREATED: "ORDER_CREATED",
    ORDER_ACCEPTED: "ORDER_ACCEPTED",
    ORDER_DECLINED: "ORDER_DECLINED",
    PAYMENT_MARKED: "PAYMENT_MARKED",
    ORDER_REASSIGNED: "ORDER_REASSIGNED",
    ORDER_COMPLETED: "ORDER_COMPLETED",
} as const;

