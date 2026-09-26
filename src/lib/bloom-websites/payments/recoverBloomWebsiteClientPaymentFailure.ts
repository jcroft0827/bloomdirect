import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";

import {
  BloomPaymentFinalizationError,
  finalizeBloomWebsitePayment,
} from "./finalizeBloomWebsitePayment";
import { getBloomPaymentProvider } from "./getBloomPaymentProvider";
import { getBloomWebsiteMerchantReadiness } from "./getBloomWebsiteMerchantReadiness";
import type { BloomPaymentProviderName } from "./types";

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function finalizeTerminalPayment(attemptId: string) {
  try {
    const finalized = await finalizeBloomWebsitePayment({ attemptId });

    return {
      reset: false,
      completed: finalized.completed,
      processing: false,
      orderId: finalized.orderId,
      orderNumber: finalized.orderNumber,
      providerStatus: "succeeded" as const,
    };
  } catch (error) {
    if (
      error instanceof BloomPaymentFinalizationError &&
      (error.code === "PAYMENT_FAILED" || error.code === "PAYMENT_CANCELED")
    ) {
      return {
        reset: true,
        completed: false,
        processing: false,
        providerStatus:
          error.code === "PAYMENT_CANCELED"
            ? ("canceled" as const)
            : ("failed" as const),
      };
    }

    throw error;
  }
}

/**
 * Reconcile an immediate browser-side card failure against the processor
 * before changing Bloom inventory.
 *
 * Stripe commonly returns a PaymentIntent to `requires_payment_method` after
 * a declined card. That state has not moved money, but the PaymentIntent can
 * still be confirmed again. Bloom therefore cancels that exact PaymentIntent
 * first, then lets the shared finalizer release the reservation and close the
 * checkout attempt. A fresh checkout attempt can safely reserve inventory
 * again when the customer retries.
 *
 * Ambiguous states never release inventory: succeeded payments are finalized,
 * processing payments remain reserved, and requires_action remains attached
 * to the existing attempt.
 */
export async function recoverBloomWebsiteClientPaymentFailure({
  attemptId,
}: {
  attemptId: string;
}) {
  await connectToDB();

  const attempt = await BloomWebsiteCheckoutAttempt.findOne({ attemptId });

  if (!attempt) {
    throw new BloomPaymentFinalizationError(
      "CHECKOUT_ATTEMPT_NOT_FOUND",
      "Checkout attempt could not be found.",
      { status: 404 },
    );
  }

  if (attempt.status === "order_committed" && attempt.order) {
    return finalizeBloomWebsitePayment({ attemptId });
  }

  const provider = attempt.payment?.provider as BloomPaymentProviderName;
  const providerPaymentId = clean(attempt.payment?.providerPaymentId);

  if (
    (provider !== "stripe" && provider !== "fiserv") ||
    !providerPaymentId
  ) {
    throw new BloomPaymentFinalizationError(
      "PAYMENT_REFERENCE_MISSING",
      "Checkout does not have a processor payment reference.",
    );
  }

  const readiness = await getBloomWebsiteMerchantReadiness({
    websiteId: String(attempt.website),
    provider,
    requireReady: false,
  });

  if (!readiness.connection || readiness.provider !== provider) {
    throw new BloomPaymentFinalizationError(
      "PAYMENT_MERCHANT_MISMATCH",
      "Bloom can no longer locate the merchant connection that owns this payment.",
      { status: 500, retryable: true },
    );
  }

  const paymentProvider = getBloomPaymentProvider(provider);
  let payment = await paymentProvider.retrievePayment({
    providerPaymentId,
    merchant: readiness.connection,
  });

  if (
    payment.status === "succeeded" ||
    payment.status === "failed" ||
    payment.status === "canceled"
  ) {
    return finalizeTerminalPayment(attemptId);
  }

  if (payment.status === "processing") {
    return {
      reset: false,
      completed: false,
      processing: true,
      providerStatus: payment.status,
    };
  }

  if (payment.status === "requires_action") {
    return {
      reset: false,
      completed: false,
      processing: false,
      providerStatus: payment.status,
    };
  }

  if (payment.status !== "requires_payment_method") {
    return {
      reset: false,
      completed: false,
      processing: false,
      providerStatus: payment.status,
    };
  }

  try {
    await paymentProvider.cancelPayment({
      providerPaymentId,
      merchant: readiness.connection,
    });
  } catch (cancelError) {
    /*
     * Cancellation can race a late processor state change. Re-read Stripe
     * before deciding whether inventory can be released. If money moved, the
     * paid-order finalizer owns the outcome. If the intent is still safely
     * cancelable, preserve the reservation and surface the cancellation error
     * rather than guessing.
     */
    payment = await paymentProvider.retrievePayment({
      providerPaymentId,
      merchant: readiness.connection,
    });

    if (
      payment.status === "succeeded" ||
      payment.status === "failed" ||
      payment.status === "canceled"
    ) {
      return finalizeTerminalPayment(attemptId);
    }

    if (payment.status === "processing") {
      return {
        reset: false,
        completed: false,
        processing: true,
        providerStatus: payment.status,
      };
    }

    throw cancelError;
  }

  return finalizeTerminalPayment(attemptId);
}
