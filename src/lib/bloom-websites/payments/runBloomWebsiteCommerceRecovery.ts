import { reconcileBloomWebsitePaymentAttempts } from "./reconcileBloomWebsitePaymentAttempts";
import { recoverExpiredBloomWebsiteInventoryReservations } from "./recoverExpiredBloomWebsiteInventoryReservations";

export async function runBloomWebsiteCommerceRecovery({
  passes = 3,
  batchSize = 25,
}: {
  passes?: number;
  batchSize?: number;
} = {}) {
  const safePasses = Math.max(1, Math.min(5, Math.round(passes)));
  const safeBatchSize = Math.max(
    1,
    Math.min(100, Math.round(batchSize)),
  );

  const startedAt = new Date();
  const passResults = [];

  for (let index = 0; index < safePasses; index += 1) {
    /*
     * Money recovery always runs before inventory expiry cleanup. If Stripe
     * succeeded while the browser disappeared, Bloom must commit that paid
     * order before considering any reservation old enough to release.
     */
    const payments = await reconcileBloomWebsitePaymentAttempts({
      limit: safeBatchSize,
    });

    const inventory =
      await recoverExpiredBloomWebsiteInventoryReservations({
        limit: safeBatchSize,
      });

    passResults.push({
      pass: index + 1,
      payments,
      inventory,
    });

    if (payments.checked === 0 && inventory.checked === 0) {
      break;
    }
  }

  const paymentResults = passResults.flatMap(
    (pass) => pass.payments.results,
  );
  const inventoryResults = passResults.flatMap(
    (pass) => pass.inventory.results,
  );

  return {
    success: true,
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    passes: passResults.length,
    payments: {
      checked: paymentResults.length,
      completed: paymentResults.filter(
        (result) => result.completed === true,
      ).length,
      retryableFailures: paymentResults.filter(
        (result) => result.retryable === true,
      ).length,
    },
    inventory: {
      checked: inventoryResults.length,
      released: inventoryResults.filter((result) =>
        String(result.action || "").startsWith("released"),
      ).length,
      canceledExpiredPayments: inventoryResults.filter(
        (result) => result.action === "canceled_expired_payment",
      ).length,
      extendedProcessingPayments: inventoryResults.filter(
        (result) => result.action === "extended_processing_payment",
      ).length,
      errors: inventoryResults.filter(
        (result) => result.action === "error",
      ).length,
    },
    detail: passResults,
  };
}
