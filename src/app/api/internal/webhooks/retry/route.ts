// api/internal/webhooks/retry/route.ts

import WebhookLog from "@/models/WebhookLog";
import { connectToDB } from "@/lib/mongoose";
import { getNextRetryTime } from "@/lib/webhook-retry";

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

export async function GET(req: Request) {
  const cronSecret = process.env.INTERNAL_CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDB();

  const now = new Date();

  const failedLogs = await WebhookLog.find({
    status: "failed",
    nextRetryAt: { $lte: now },
    attempts: { $lt: 5 },
  });

  for (const log of failedLogs) {
    try {
      const res = await postWithTimeout(
        log.url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": log.signature,
            "X-Webhook-Event": log.event,
            "X-Webhook-Delivery-Id": log._id.toString(),
          },
          body: JSON.stringify(log.payload),
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
      log.attempts += 1;
      log.lastError = err.message;
      log.lastAttemptAt = new Date();
      log.nextRetryAt = getNextRetryTime(log.attempts);

      if (log.attempts >= 5) {
        log.status = "failed";
      }

      await log.save();
    }
  }

  return Response.json({
    success: true,
    retried: failedLogs.length,
  });
}
