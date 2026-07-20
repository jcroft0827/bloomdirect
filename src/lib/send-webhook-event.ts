// lib/send-webhook-event.ts

import Webhook from "@/models/Webhook";
import WebhookLog from "@/models/WebhookLog";
import { signPayload } from "./webhook-sign";
import { getNextRetryTime } from "./webhook-retry";
import Shop from "@/models/Shop";
import crypto from "crypto";
import { decryptWebhookSecret } from "./webhook-secret";

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
  const shop = await Shop.findById(shopId).select(
    "isPro isSuspended apiAccess.enabled",
  );

  if (!shop || !shop.isPro || shop.isSuspended || !shop.apiAccess?.enabled) {
    console.log(
      `Skipping POS webhook "${event}" for shop ${shopId}: POS API access is inactive`,
    );

    return;
  }

  const webhooks = await Webhook.find({
    shopId,
    isActive: true,
    events: event,
  }).select("+encryptedSecret +encryptionIv +encryptionAuthTag");

  await Promise.all(
    webhooks.map(async (hook) => {
      const deliveryId = crypto.randomUUID();

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
        deliveryId,
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
          deliveryId,
        },
      };

      const webhookSecret = decryptWebhookSecret({
        encryptedSecret: hook.encryptedSecret,
        encryptionIv: hook.encryptionIv,
        encryptionAuthTag: hook.encryptionAuthTag,
      });

      const signature = signPayload(payload, webhookSecret);

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
              "X-Webhook-Delivery-Id": deliveryId,
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
