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
import mongoose from "mongoose";

const VALID_DECLINE_REASONS = [
  "OUT_OF_STOCK",
  "TOO_BUSY",
  "DELIVERY_TOO_FAR",
  "OTHER",
] as const;

export async function POST(req: Request, { params }: any) {
  let authenticatedShopId = "";
  let requestedDeclineReason = "";
  let requestedDeclineMessage = "";

  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

    authenticatedShopId = shop._id.toString();

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

    requestedDeclineReason = declineReason;
    requestedDeclineMessage = declineMessage;

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

    if (order.status === OrderStatus.DECLINED && order.declinedAt) {
      const existingReason = String(order.declineReason || "")
        .trim()
        .toUpperCase();

      const existingMessage = String(order.declineMessage || "").trim();

      if (
        existingReason === declineReason &&
        existingMessage === declineMessage
      ) {
        return apiSuccess({
          order: mapOrderForPOS(order),
        });
      }

      return apiError(
        "INVALID_TRANSITION",
        "This order has already been declined with different decline details.",
        409,
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

    if (err instanceof mongoose.Error.VersionError && authenticatedShopId) {
      try {
        const currentOrder = await Order.findById(params.id);

        if (
          currentOrder &&
          currentOrder.fulfillingShop.toString() === authenticatedShopId &&
          currentOrder.status === OrderStatus.DECLINED &&
          currentOrder.declinedAt
        ) {
          const existingReason = String(currentOrder.declineReason || "")
            .trim()
            .toUpperCase();

          const existingMessage = String(
            currentOrder.declineMessage || "",
          ).trim();

          if (
            existingReason === requestedDeclineReason &&
            existingMessage === requestedDeclineMessage
          ) {
            return apiSuccess({
              order: mapOrderForPOS(currentOrder),
            });
          }

          return apiError(
            "INVALID_TRANSITION",
            "This order has already been declined with different decline details.",
            409,
          );
        }
      } catch (recoveryError) {
        console.error(
          "Failed to reconcile concurrent POS decline request:",
          recoveryError,
        );
      }
    }

    console.error("External POS decline order failed:", err);

    return apiError("SERVER_ERROR", "Unable to decline the order.", 500);
  }
}
