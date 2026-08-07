// /api/external/v1/orders/{id}/accept/route.ts

import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { OrderStatus } from "@/lib/order-status";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import Order from "@/models/Order";
import { connectToDB } from "@/lib/mongoose";
import { addOrderActivity } from "@/lib/order-activity";
import { OrderActivityActions } from "@/lib/order-activity-actions";
import { sendOrderEvent } from "@/lib/send-order-event";
import { ApiError } from "@/lib/api-error";
import { checkPosApiRateLimit } from "@/lib/pos-api-rate-limit";
import { getShopReadiness } from "@/lib/shops/getShopReadiness";
import mongoose from "mongoose";

export async function POST(req: Request, { params }: any) {
  let authenticatedShopId = "";

  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

    authenticatedShopId = shop._id.toString();

    const rateLimit = checkPosApiRateLimit({
      key: `pos-accept:${shop._id.toString()}`,
      limit: 20,
    });

    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        "Too many accept requests. Please wait before trying again.",
        429,
      );
    }

    const order = await Order.findById(params.id);

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (order.fulfillingShop.toString() !== shop._id.toString()) {
      return apiError(
        "FORBIDDEN",
        "This order is assigned to a different fulfilling shop.",
        403,
      );
    }

    const readiness = getShopReadiness(shop.toObject());

    if (!readiness.capabilities.canAcceptOrders) {
      return apiError(
        "SHOP_NOT_READY_TO_ACCEPT",
        "Your shop must verify its email and configure at least one payment method before accepting an order.",
        403,
      );
    }

    if (
      [OrderStatus.ACCEPTED, OrderStatus.ACCEPTED_AWAITING_PAYMENT].includes(
        order.status,
      ) &&
      order.acceptedAt
    ) {
      return apiSuccess({ order: mapOrderForPOS(order) });
    }

    await assertOrderTransition({
      order,
      nextStatus: OrderStatus.ACCEPTED,
      actorShopId: shop._id,
    });

    order.status = OrderStatus.ACCEPTED;
    order.acceptedAt = new Date();

    await order.save();

    const sideEffects = await Promise.allSettled([
      addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_ACCEPTED,
        actorShopId: shop._id,
        message: "Order accepted via POS API",
      }),
      sendOrderEvent({
        event: "order.accepted",
        order,
        actorShopId: shop._id,
      }),
    ]);

    for (const result of sideEffects) {
      if (result.status === "rejected") {
        console.error(
          "Accept-order side effect failed after order was saved:",
          result.reason,
        );
      }
    }

    return apiSuccess({
      order: mapOrderForPOS(order),
    });
  } catch (err: unknown) {
    if (err instanceof Response) {
      return err;
    }

    if (err instanceof ApiError) {
      return apiError(err.code, err.message, err.status);
    }

    if (err instanceof mongoose.Error.VersionError && authenticatedShopId) {
      try {
        const currentOrder = await Order.findById(params.id);

        if (
          currentOrder &&
          currentOrder.fulfillingShop.toString() === authenticatedShopId &&
          [
            OrderStatus.ACCEPTED,
            OrderStatus.ACCEPTED_AWAITING_PAYMENT,
          ].includes(currentOrder.status) &&
          currentOrder.acceptedAt
        ) {
          return apiSuccess({
            order: mapOrderForPOS(currentOrder),
          });
        }
      } catch (recoveryError) {
        console.error(
          "Failed to reconcile concurrent POS accept request:",
          recoveryError,
        );
      }
    }

    console.error("External POS accept order failed:", err);

    return apiError("SERVER_ERROR", "Unable to accept the order.", 500);
  }
}
