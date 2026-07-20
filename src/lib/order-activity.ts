import type { Types } from "mongoose";
import Order from "@/models/Order";
import type { OrderActivityAction } from "@/lib/order-activity-actions";

type AddOrderActivityParams = {
  orderId: Types.ObjectId | string;
  action: OrderActivityAction;
  actorShopId?: Types.ObjectId | string;
  message?: string;
};

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
    { new: true },
  );
}