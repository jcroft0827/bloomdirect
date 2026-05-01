// lib/send-webhook-event.ts

import Webhook from "@/models/Webhook";
import WebhookLog from "@/models/WebhookLog";
import { signPayload } from "./webhook-sign";
import { getNextRetryTime } from "./webhook-retry";

async function postWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 10000,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendWebhookEvent({
  event,
  shopId,
  data,
}: {
  event: string;
  shopId: string;
  data: any;
}) {
  const webhooks = await Webhook.find({
    shopId,
    isActive: true,
    events: event,
  });

  await Promise.all(
    webhooks.map(async (hook) => {
      const basePayload = {
        event,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          version: "1.0",
        },
      };

      const log = await WebhookLog.create({
        shopId,
        webhookId: hook._id,
        event,
        url: hook.url,
        payload: basePayload,
        attempts: 0,
        nextRetryAt: new Date(),
        status: "pending",
      });

      const payload = {
        ...basePayload,
        meta: {
          ...basePayload.meta,
          deliveryId: log._id.toString(),
        },
      };

      const signature = signPayload(payload, hook.secret);

      log.payload = payload;
      log.signature = signature;

      try {
        const res = await postWithTimeout(
          hook.url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Webhook-Signature": signature,
              "X-Webhook-Event": event,
              "X-Webhook-Delivery_Id": log._id.toString(),
            },
            body: JSON.stringify(payload),
          },
          10000,
        );

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        log.status = "success";
        log.deliveredAt = new Date();
        log.responseStatus = res.status;
        log.lastAttemptAt = new Date();
        await log.save();
      } catch (err: any) {
        log.status = "failed";
        log.lastError = err.message;
        log.attempts = 1;
        log.nextRetryAt = getNextRetryTime(1);
        log.lastAttemptAt = new Date();
        await log.save();
      }
    }),
  );
}
