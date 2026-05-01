// /app/api/external/v1/orders/{id}/pay/route.ts

import { getShopFromApiKey } from "@/lib/api-auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";
import { connectToDB } from "@/lib/mongoose";
import { addOrderActivity, OrderActivityActions } from "@/lib/order-activity";
import { PAYMENT_METHODS, PaymentMethod } from "@/lib/order-payment-methods";
import { OrderStatus } from "@/lib/order-status";
import { assertOrderTransition } from "@/lib/order-transition-guard";
import { sendOrderEvent } from "@/lib/send-order-event";
import Order from "@/models/Order";

export async function POST(req: Request, { params }: any) {
  try {
    await connectToDB();

    const shop = await getShopFromApiKey(req);

    const { paymentMethodUsed: rawMethod } = await req.json();
    const paymentMethod = rawMethod?.toLowerCase()?.trim();

    const order = await Order.findById(params.id);

    if (!order) {
      return apiError("ORDER_NOT_FOUND", "Order not found", 404);
    }

    if (order.originatingShop.toString() !== shop._id.toString()) {
      return apiError("UNAUTHORIZED", "Not authorized", 403);
    }

    if (shop.isApiReadOnly) {
      return apiError("READ_ONLY_MODE", "Upgrade to Pro to modify orders", 403);
    }

    if (!paymentMethod) {
      return apiError("MISSING_FIELDS", "Payment method is required", 400);
    }

    const paymentValue = order.paymentMethods?.[paymentMethod];

    if (typeof paymentValue !== "string" || paymentValue.trim() === "") {
      return apiError(
        "PAYMENT_METHOD_NOT_AVAILABLE",
        "That payment method is not available for this order",
        400,
      );
    }

    const allowedMethods = ["venmo", "cashapp", "zelle", "paypal"];

    if (!allowedMethods.includes(paymentMethod)) {
      return apiError("INVALID_PAYMENT_METHOD", "Invalid payment method", 400);
    }

    await assertOrderTransition({
      order,
      nextStatus: OrderStatus.PAID_AWAITING_FULFILLMENT,
      actorShopId: shop._id,
    });

    order.paymentMethodUsed = paymentMethod;
    order.paidAt = new Date();
    order.status = OrderStatus.PAID_AWAITING_FULFILLMENT;

    await order.save();

    await addOrderActivity({
      orderId: order._id,
      action: OrderActivityActions.PAYMENT_MARKED,
      actorShopId: shop._id,
      message: `Payment marked as received via ${paymentMethod.toUpperCase()}`,
    });

    await sendOrderEvent({
      event: "order.paid",
      order,
      actorShopId: shop._id,
    });

    return apiSuccess({
      order: mapOrderForPOS(order),
    });
  } catch (err: any) {
    if (err instanceof Response) return err;

    return apiError("INVALID_REQUEST", "Something went wrong", 500);
  }
}
