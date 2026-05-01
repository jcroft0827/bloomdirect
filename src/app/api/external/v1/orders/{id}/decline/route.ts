// /api/external/v1/orders/{id}/decline/route.ts

import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { OrderStatus } from "@/lib/order-status";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import Order from "@/models/Order";
import { addOrderActivity, OrderActivityActions } from "@/lib/order-activity";
import { connectToDB } from "@/lib/mongoose";
import { sendOrderEvent } from "@/lib/send-order-event";

export async function POST(req: Request, { params }: any) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);
    const { declineReason, declineMessage } = await req.json();

    const order = await Order.findById(params.id);

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (order.fulfillingShop.toString() !== shop._id.toString()) {
      return apiError("UNAUTHORIZED", "Not authorized", 403);
    }

    if (shop.isApiReadOnly) {
      return apiError("READ_ONLY_MODE", "Upgrade to Pro to modify orders", 403);
    }

    if (!declineReason) {
      return apiError("MISSING_DECLINE_REASON", "Decline reason required", 400);
    }

    if (declineReason === "OTHER" && !declineMessage) {
      return apiError("MISSING_DECLINE_MESSAGE", "Message required", 400);
    }

    await assertOrderTransition({
      order,
      nextStatus: OrderStatus.DECLINED,
      actorShopId: shop._id,
    });

    order.status = OrderStatus.DECLINED;
    order.declineReason = declineReason;
    order.declineMessage = declineMessage?.trim() || "";
    order.declinedAt = new Date();
    order.declineCount = (order.declineCount || 0) + 1;

    order.declineHistory = [
      ...(order.declineHistory || []),
      {
        shop: shop._id,
        shopName: shop.businessName || "",
        reason: declineReason,
        message: declineMessage?.trim() || "",
        declinedAt: new Date(),
      },
    ];
    
    await order.save();

    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.ORDER_DECLINED,
      actorShopId: shop._id,
      message: "Order declined via POS API",
    });

    await sendOrderEvent({
      event: "order.declined",
      order,
      actorShopId: shop._id,
    });

    return apiSuccess({
      order: mapOrderForPOS(order),
    });
  } catch (err: any) {
    if (err instanceof Response) {
      return err;
    }

    return apiError("INVALID_REQUEST", "Something went wrong", 500);
  }
}
