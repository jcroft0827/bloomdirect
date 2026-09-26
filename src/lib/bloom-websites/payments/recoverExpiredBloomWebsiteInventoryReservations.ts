import { Types } from "mongoose";

import { connectToDB } from "@/lib/mongoose";
import {
  commitBloomWebsiteInventory,
  releaseBloomWebsiteInventory,
} from "@/lib/bloom-websites/bloomWebsiteInventoryReservations";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import BloomWebsiteInventoryReservation from "@/models/BloomWebsiteInventoryReservation";

import { finalizeBloomWebsitePayment } from "./finalizeBloomWebsitePayment";
import { getBloomPaymentProvider } from "./getBloomPaymentProvider";
import { getBloomWebsiteMerchantReadiness } from "./getBloomWebsiteMerchantReadiness";
import type { BloomPaymentProviderName } from "./types";

const PROCESSING_EXTENSION_MINUTES = 15;

function providerName(value: unknown): BloomPaymentProviderName | null {
  return value === "stripe" || value === "fiserv" ? value : null;
}

function id(value: unknown) {
  return value ? String(value) : "";
}

function processingExtensionFromNow() {
  return new Date(
    Date.now() + PROCESSING_EXTENSION_MINUTES * 60 * 1000,
  );
}

export async function recoverExpiredBloomWebsiteInventoryReservations({
  limit = 25,
  websiteId,
}: {
  limit?: number;
  websiteId?: string;
} = {}) {
  await connectToDB();

  const safeLimit = Math.max(1, Math.min(100, Math.round(limit)));
  const reservationQuery: Record<string, unknown> = {
    status: "active",
    expiresAt: { $lte: new Date() },
  };

  if (websiteId && Types.ObjectId.isValid(websiteId)) {
    reservationQuery.website = websiteId;
  }

  const reservations = await BloomWebsiteInventoryReservation.find(
    reservationQuery,
  )
    .sort({ expiresAt: 1 })
    .limit(safeLimit)
    .select("_id checkoutAttempt attemptId website expiresAt")
    .lean<any[]>();

  const results: Array<Record<string, unknown>> = [];

  for (const reservation of reservations) {
    const reservationId = id(reservation._id);
    const attempt = await BloomWebsiteCheckoutAttempt.findById(
      reservation.checkoutAttempt,
    )
      .select(
        "attemptId website status order payment inventory lastError",
      )
      .lean<any>();

    if (!attempt) {
      const released = await releaseBloomWebsiteInventory({
        reservationId,
        reason:
          "Expired inventory reservation no longer had a checkout attempt.",
      });

      results.push({
        attemptId: reservation.attemptId || "",
        action: released.released ? "released_orphan" : "no_change",
      });
      continue;
    }

    if (attempt.status === "order_committed") {
      try {
        const committed = await commitBloomWebsiteInventory({
          reservationId,
        });

        results.push({
          attemptId: attempt.attemptId,
          action:
            committed.committed || committed.alreadyCommitted
              ? "committed_recovered_order"
              : "no_change",
        });
      } catch (error: any) {
        results.push({
          attemptId: attempt.attemptId,
          action: "error",
          code:
            typeof error?.code === "string"
              ? error.code
              : "INVENTORY_COMMIT_RECOVERY_FAILED",
        });
      }

      continue;
    }

    if (attempt.status === "payment_succeeded") {
      try {
        const finalized = await finalizeBloomWebsitePayment({
          attemptId: attempt.attemptId,
        });

        results.push({
          attemptId: attempt.attemptId,
          action: finalized.completed
            ? "finalized_paid_order"
            : "no_change",
        });
      } catch (error: any) {
        results.push({
          attemptId: attempt.attemptId,
          action: "error",
          code:
            typeof error?.code === "string"
              ? error.code
              : "PAYMENT_FINALIZATION_FAILED",
          retryable: error?.retryable === true,
        });
      }

      continue;
    }

    const provider = providerName(attempt.payment?.provider);
    const providerPaymentId =
      typeof attempt.payment?.providerPaymentId === "string"
        ? attempt.payment.providerPaymentId.trim()
        : "";

    if (
      attempt.status === "payment_processing" &&
      provider &&
      providerPaymentId
    ) {
      try {
        const readiness = await getBloomWebsiteMerchantReadiness({
          websiteId: id(attempt.website),
          provider,
          requireReady: false,
        });

        if (!readiness.connection) {
          results.push({
            attemptId: attempt.attemptId,
            action: "error",
            code: "MERCHANT_CONNECTION_MISSING",
          });
          continue;
        }

        const providerClient = getBloomPaymentProvider(provider);
        const payment = await providerClient.retrievePayment({
          providerPaymentId,
          merchant: readiness.connection,
        });

        if (
          payment.status === "succeeded" ||
          payment.status === "failed" ||
          payment.status === "canceled"
        ) {
          try {
            const finalized = await finalizeBloomWebsitePayment({
              attemptId: attempt.attemptId,
            });

            results.push({
              attemptId: attempt.attemptId,
              action: finalized.completed
                ? "finalized_paid_order"
                : "reconciled_terminal_payment",
            });
          } catch (error: any) {
            /*
             * Terminal failed/canceled payments intentionally cause the shared
             * finalizer to throw after it releases inventory and marks the
             * attempt failed. That is a successful cleanup outcome.
             */
            if (
              error?.code === "PAYMENT_FAILED" ||
              error?.code === "PAYMENT_CANCELED"
            ) {
              results.push({
                attemptId: attempt.attemptId,
                action: "released_terminal_payment",
                code: error.code,
              });
            } else {
              results.push({
                attemptId: attempt.attemptId,
                action: "error",
                code:
                  typeof error?.code === "string"
                    ? error.code
                    : "PAYMENT_RECONCILIATION_FAILED",
                retryable: error?.retryable === true,
              });
            }
          }

          continue;
        }

        if (payment.status === "processing") {
          const extendedTo = processingExtensionFromNow();

          await BloomWebsiteInventoryReservation.updateOne(
            {
              _id: reservation._id,
              status: "active",
            },
            {
              $set: {
                expiresAt: extendedTo,
              },
            },
          );

          results.push({
            attemptId: attempt.attemptId,
            action: "extended_processing_payment",
            expiresAt: extendedTo.toISOString(),
          });
          continue;
        }

        /*
         * An expired reservation must not simply be returned to inventory while
         * its PaymentIntent remains confirmable. Cancel the processor payment
         * first, then let the shared finalizer observe `canceled`, release the
         * reservation, and close the checkout attempt.
         */
        if (
          payment.status === "requires_payment_method" ||
          payment.status === "requires_action"
        ) {
          await providerClient.cancelPayment({
            providerPaymentId,
            merchant: readiness.connection,
          });

          try {
            await finalizeBloomWebsitePayment({
              attemptId: attempt.attemptId,
            });
          } catch (error: any) {
            if (error?.code !== "PAYMENT_CANCELED") {
              throw error;
            }
          }

          results.push({
            attemptId: attempt.attemptId,
            action: "canceled_expired_payment",
          });
          continue;
        }
      } catch (error: any) {
        results.push({
          attemptId: attempt.attemptId,
          action: "error",
          code:
            typeof error?.code === "string"
              ? error.code
              : "EXPIRED_PAYMENT_RECOVERY_FAILED",
          retryable: error?.retryable === true,
        });
        continue;
      }
    }

    /*
     * No live processor payment exists. It is safe to return the reserved
     * inventory and close the stale checkout attempt.
     */
    const released = await releaseBloomWebsiteInventory({
      reservationId,
      reason: "Checkout inventory reservation expired before payment completed.",
    });

    if (
      released.released &&
      attempt.status !== "failed" &&
      attempt.status !== "order_committed"
    ) {
      await BloomWebsiteCheckoutAttempt.updateOne(
        {
          _id: attempt._id,
          status: {
            $in: ["created", "validated", "payment_processing"],
          },
        },
        {
          $set: {
            status: "failed",
            "lastError.code": "CHECKOUT_EXPIRED",
            "lastError.message":
              "Checkout expired before payment completed.",
            "lastError.occurredAt": new Date(),
          },
        },
      );
    }

    results.push({
      attemptId: attempt.attemptId,
      action: released.released ? "released_expired_checkout" : "no_change",
    });
  }

  return {
    checked: reservations.length,
    results,
  };
}
