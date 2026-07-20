// /api/external/v1/orders/{id}/decline/route.ts

import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { OrderStatus } from "@/lib/order-status";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import Order from "@/models/Order";
import { addOrderActivity } from "@/lib/order-activity";
import { OrderActivityActions } from "@/lib/order-activity-actions";
import { connectToDB } from "@/lib/mongoose";
import { sendOrderEvent } from "@/lib/send-order-event";
import { ApiError } from "@/lib/api-error";
import { checkPosApiRateLimit } from "@/lib/pos-api-rate-limit";

const VALID_DECLINE_REASONS = [
  "OUT_OF_STOCK",
  "TOO_BUSY",
  "DELIVERY_TOO_FAR",
  "OTHER",
] as const;

export async function POST(req: Request, { params }: any) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);
    
    const rateLimit = checkPosApiRateLimit({
      key: `pos-decline:${shop._id.toString()}`,
      limit: 20,
    });

    if (!rateLimit.allowed) {
      return apiError(
        "RATE_LIMIT_EXCEEDED",
        "Too many decline requests. Please wait before trying again.",
        429,
      );
    }

    let body: any;

    try {
      body = await req.json();
    } catch (error) {
      return apiError(
        "INVALID_REQUEST",
        "Request body must contain valid JSON.",
        400,
      );
    }

    const declineReason =
      typeof body?.declineReason === "string"
        ? body.declineReason.trim().toUpperCase()
        : "";

    const declineMessage =
      typeof body?.declineMessage === "string"
        ? body.declineMessage.trim()
        : "";

    const order = await Order.findById(params.id);

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (order.fulfillingShop.toString() !== shop._id.toString()) {
      return apiError("UNAUTHORIZED", "Not authorized", 403);
    }

    if (!declineReason) {
      return apiError("MISSING_DECLINE_REASON", "Decline reason required", 400);
    }

    if (
      !VALID_DECLINE_REASONS.includes(
        declineReason as (typeof VALID_DECLINE_REASONS)[number],
      )
    ) {
      return apiError(
        "INVALID_DECLINE_REASON",
        "Decline reason must be OUT_OF_STOCK, TOO_BUSY, DELIVERY_TOO_FAR, or OTHER.",
        400,
      );
    }

    if (declineReason === "OTHER" && !declineMessage) {
      return apiError(
        "MISSING_DECLINE_MESSAGE",
        "Message required when decline reason is OTHER.",
        400,
      );
    }

    if (declineMessage.length > 1000) {
      return apiError(
        "DECLINE_MESSAGE_TOO_LONG",
        "Decline message cannot exceed 1,000 characters.",
      );
    }

    await assertOrderTransition({
      order,
      nextStatus: OrderStatus.DECLINED,
      actorShopId: shop._id,
    });

    order.status = OrderStatus.DECLINED;
    order.declineReason = declineReason;
    order.declineMessage = declineMessage;
    order.declinedAt = new Date();
    order.declineCount = (order.declineCount || 0) + 1;

    order.declineHistory = [
      ...(order.declineHistory || []),
      {
        shop: shop._id,
        shopName: shop.businessName || "",
        reason: declineReason,
        message: declineMessage,
        declinedAt: new Date(),
      },
    ];

    await order.save();

    const sideEffects = await Promise.allSettled([
      addOrderActivity({
        orderId: order._id,
        action: OrderActivityActions.ORDER_DECLINED,
        actorShopId: shop._id,
        message: "Order declined via POS API",
      }),
      sendOrderEvent({
        event: "order.declined",
        order,
        actorShopId: shop._id,
      }),
    ]);

    for (const result of sideEffects) {
      if (result.status === "rejected") {
        console.error(
          "Decline-order side effect failed after order was saved:",
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
