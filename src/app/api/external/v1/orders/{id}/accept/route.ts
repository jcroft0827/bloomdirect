// /api/external/v1/orders/{id}/accept/route.ts

import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { OrderStatus } from "@/lib/order-status";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import Order from "@/models/Order";
import { connectToDB } from "@/lib/mongoose";
import { addOrderActivity, OrderActivityActions } from "@/lib/order-activity";
import { sendOrderEvent } from "@/lib/send-order-event";

export async function POST(req: Request, { params }: any) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

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

    // Idempotency
    if (order.status === OrderStatus.ACCEPTED_AWAITING_PAYMENT && order.acceptedAt) {
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
    
    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.ORDER_ACCEPTED,
      actorShopId: shop._id,
      message: "Order accepted via POS API",
    });

    await sendOrderEvent({
      event: "order.accepted",
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
