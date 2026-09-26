import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import { finalizeBloomWebsitePayment } from "./finalizeBloomWebsitePayment";

export async function reconcileBloomWebsitePaymentAttempts({
  limit = 25,
}: {
  limit?: number;
} = {}) {
  await connectToDB();

  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));

  const attempts = await BloomWebsiteCheckoutAttempt.find({
    status: { $in: ["payment_processing", "payment_succeeded"] },
    "payment.providerPaymentId": { $type: "string", $gt: "" },
  })
    .sort({ updatedAt: 1 })
    .limit(safeLimit)
    .select("attemptId")
    .lean<any[]>();

  const results = [];

  for (const attempt of attempts) {
    try {
      const result = await finalizeBloomWebsitePayment({
        attemptId: attempt.attemptId,
      });
      results.push({
        attemptId: attempt.attemptId,
        completed: result.completed,
        orderNumber: result.orderNumber,
      });
    } catch (error: any) {
      results.push({
        attemptId: attempt.attemptId,
        completed: false,
        code: typeof error?.code === "string" ? error.code : "RECONCILIATION_FAILED",
        retryable: error?.retryable === true,
      });
    }
  }

  return {
    checked: attempts.length,
    results,
  };
}
