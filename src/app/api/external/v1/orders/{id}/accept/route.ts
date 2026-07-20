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

export async function POST(req: Request, { params }: any) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

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
      return apiError("UNAUTHORIZED", "Not authorized", 403);
    }

    // Idempotency
    if (
      order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT &&
      order.acceptedAt
    ) {
      return apiSuccess({ order: mapOrderForPOS(order) });
    }

    await assertOrderTransition({
      order,
      nextStatus: OrderStatus.ACCEPTED_AWAITING_PAYMENT,
      actorShopId: shop._id,
    });

    order.status = OrderStatus.ACCEPTED_AWAITING_PAYMENT;
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

    console.error("External POS order action failed:", err);

    return apiError("INVALID_REQUEST", "Something went wrong", 500);
  }
}
