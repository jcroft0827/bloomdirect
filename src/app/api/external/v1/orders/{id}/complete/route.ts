// api/external/v1/orders/{id}/complete/route.ts
import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import { connectToDB } from "@/lib/mongoose";
import { addOrderActivity, OrderActivityActions } from "@/lib/order-activity";
import { OrderStatus } from "@/lib/order-status";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { sendOrderEvent } from "@/lib/send-order-event";
import Order from "@/models/Order";

export async function POST(req: Request, { params }: any) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

    const order = await Order.findById(params.id);

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (order.completedAt) {
      return apiSuccess({ order: mapOrderForPOS(order) });
    }

    if (order.fulfillingShop.toString() !== shop._id.toString()) {
      return apiError("UNAUTHORIZED", "Not authorized", 403);
    }

    if (shop.isApiReadOnly) {
      return apiError("READ_ONLY_MODE", "Upgrade to Pro to modify orders", 403);
    }

    await assertOrderTransition({
      order,
      nextStatus: OrderStatus.COMPLETED,
      actorShopId: shop._id,
    });

    order.status = OrderStatus.COMPLETED;
    order.completedAt = new Date();

    await order.save();

    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.ORDER_COMPLETED,
      actorShopId: shop._id,
      message: "Order marked as completed via POS API",
    });
    
    await sendOrderEvent({
        event: "order.completed",
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
