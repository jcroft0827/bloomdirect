// api/internal/webhooks/retry/route.ts

import WebhookLog from "@/models/WebhookLog";
import { connectToDB } from "@/lib/mongoose";
import { getNextRetryTime } from "@/lib/webhook-retry";
import Shop from "@/models/Shop";

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

  const staleBefore = new Date(now.getTime() - 15 * 60 * 1000);

  await WebhookLog.updateMany(
    {
      status: { $in: ["pending", "processing"] },
      updatedAt: { $lte: staleBefore },
      attempts: { $lt: 6 },
    },
    {
      $set: {
        status: "failed",
        nextRetryAt: now,
        lastError: "Webhook delivery became stale and was queued for retry.",
      },
    },
  );

  const failedLogs = await WebhookLog.find({
    status: "failed",
    nextRetryAt: { $lte: now },
    attempts: { $lt: 6 },
  })
    .sort({ nextRetryAt: 1 })
    .limit(50);

  for (const log of failedLogs) {
    const claimedLog = await WebhookLog.findOneAndUpdate(
      {
        _id: log._id,
        status: "failed",
        attempts: { $lt: 6 },
        nextRetryAt: { $lte: now },
      },
      {
        $set: {
          status: "processing",
          lastAttemptAt: new Date(),
        },
      },
      {
        new: true,
      },
    );

    if (!claimedLog) {
      continue;
    }

    try {
      const shop = await Shop.findById(claimedLog.shopId).select(
        "isPro isSuspended apiAccess.enabled",
      );

      if (
        !shop ||
        !shop.isPro ||
        shop.isSuspended ||
        !shop.apiAccess?.enabled
      ) {
        claimedLog.status = "failed";
        claimedLog.attempts = 6;
        claimedLog.lastError =
          "POS API access is inactive. Webhook retry skipped.";
        claimedLog.lastAttemptAt = new Date();

        await claimedLog.save();
        continue;
      }

      const res = await postWithTimeout(
        claimedLog.url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Webhook-Signature": claimedLog.signature,
            "X-Webhook-Event": claimedLog.event,
            "X-Webhook-Delivery-Id": claimedLog.deliveryId,
          },
          body: JSON.stringify(claimedLog.payload),
        },
        10000,
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      claimedLog.status = "success";
      claimedLog.deliveredAt = new Date();
      claimedLog.responseStatus = res.status;
      claimedLog.lastAttemptAt = new Date();
      claimedLog.lastError = undefined;

      await claimedLog.save();
    } catch (err: unknown) {
      claimedLog.attempts += 1;
      claimedLog.status = "failed";
      claimedLog.lastError =
        err instanceof Error ? err.message : "Unknown webhook delivery error";
      claimedLog.lastAttemptAt = new Date();

      if (claimedLog.attempts < 6) {
        claimedLog.nextRetryAt = getNextRetryTime(claimedLog.attempts);
      }

      await claimedLog.save();
    }
  }

  return Response.json({
    success: true,
    retried: failedLogs.length,
  });
}
