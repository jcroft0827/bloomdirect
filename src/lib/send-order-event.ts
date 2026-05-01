// lib/send-order-event.ts

import { sendWebhookEvent } from "./send-webhook-event";
import { mapOrderForPOS } from "@/lib/map-order-for-pos";

export async function sendOrderEvent({
  event,
  order,
  actorShopId,
}: {
  event: string;
  order: any;
  actorShopId: string;
}) {
  const payload = {
    order: mapOrderForPOS(order),
    actorShopId,
  };

  await sendWebhookEvent({
    event,
    shopId: order.fulfillingShop.toString(),
    data: payload,
  });
}