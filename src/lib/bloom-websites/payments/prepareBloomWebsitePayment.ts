import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import { couponSandboxEnvironmentReady, couponOwnerUiSandboxReady } from "@/lib/bloom-websites/coupons/authorizeCouponSandboxPreparation";
import BloomWebsiteCoupon from "@/models/BloomWebsiteCoupon";
import { evaluateCoupon, normalizeCouponCode } from "@/lib/bloom-websites/coupons/evaluateCoupon";
import { buildCouponPaymentSnapshot } from "@/lib/bloom-websites/coupons/buildCouponPaymentSnapshot";
import { reserveCouponUse, releaseCouponUse } from "@/lib/bloom-websites/coupons/reserveCouponUse";
import { connectToDB } from "@/lib/mongoose";
import {
  reserveBloomWebsiteInventory,
  releaseBloomWebsiteInventory,
} from "@/lib/bloom-websites/bloomWebsiteInventoryReservations";
import {
  calculateBloomWebsiteNativeCheckoutTax,
} from "@/lib/bloom-websites/tax/calculateBloomWebsiteNativeCheckoutTax";
import type { validateBloomWebsiteCheckoutPreflight } from "@/lib/bloom-websites/validateBloomWebsiteCheckoutPreflight";
import { getBloomWebsiteMerchantReadiness } from "./getBloomWebsiteMerchantReadiness";
import { getBloomPaymentProvider } from "./getBloomPaymentProvider";
import {
  BloomPaymentProviderError,
  type BloomCreatePaymentResult,
} from "./types";

type Preflight = Awaited<
  ReturnType<typeof validateBloomWebsiteCheckoutPreflight>
>;

export class BloomPreparePaymentError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 409) {
    super(message);
    this.name = "BloomPreparePaymentError";
    this.code = code;
    this.status = status;
  }
}

export async function prepareBloomWebsitePayment({
  attemptId,
  preflight,
  tipCents,
  couponCode,
  checkoutSnapshot,
}: {
  attemptId: string;
  preflight: Preflight;
  tipCents: number;
  /** Server-side integration point. Unavailable to checkout until atomic reservations ship. */
  couponCode?: string;
  checkoutSnapshot: {
    pickupDetails?: { person:string; firstName:string; lastName:string; phone:string; instructions:string; timeFrom:string; timeTo:string };
    recipientEmail?: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    recipient: {
      firstName: string;
      lastName: string;
      phone: string;
    };
    deliveryInstructions: string;
    cardMessage: string;
    cardSignature: string;
  };
}) {
  await connectToDB();

  const attempt = await BloomWebsiteCheckoutAttempt.findOne({
    attemptId,
    website: preflight.website._id,
    shop: preflight.shop._id,
  });

  if (!attempt) {
    throw new BloomPreparePaymentError(
      "CHECKOUT_ATTEMPT_NOT_FOUND",
      "Checkout attempt could not be found.",
      404,
    );
  }

  if (
    attempt.status === "payment_processing" &&
    attempt.payment?.providerPaymentId
  ) {
    const existingProvider =
      attempt.payment.provider === "fiserv" ? "fiserv" : "stripe";

    const readiness = await getBloomWebsiteMerchantReadiness({
      websiteId: String(preflight.website._id),
      provider: existingProvider,
      requireReady: true,
    });

    if (!readiness.connection) {
      throw new BloomPreparePaymentError(
        "MERCHANT_CONNECTION_MISSING",
        "The florist payment connection could not be found.",
      );
    }

    const providerClient = getBloomPaymentProvider(existingProvider);
    const existingPayment = await providerClient.retrievePayment({
      providerPaymentId: attempt.payment.providerPaymentId,
      merchant: readiness.connection,
    });

    return {
      attemptId: attempt.attemptId,
      provider: existingProvider,
      providerPaymentId: attempt.payment.providerPaymentId,
      providerStatus: existingPayment.status,
      amountCents: attempt.payment.amountCents,
      clientSecret: existingPayment.clientSecret,
      stripeAccountId:
        existingProvider === "stripe"
          ? readiness.connection.providerAccountId
          : undefined,
      totals: {
        subtotalCents: attempt.tax?.subtotalCents ?? preflight.totals.subtotalCents,
        fulfillmentFeeCents:
          attempt.tax?.fulfillmentFeeCents ??
          preflight.totals.fulfillmentFeeCents,
        taxAmountCents: attempt.tax?.taxAmountCents ?? 0,
        tipCents: attempt.tip?.amountCents ?? 0,
        totalCents: attempt.tax?.finalTotalCents ?? attempt.payment.amountCents,
      },
      existing: true,
    };
  }

  if (attempt.status === "payment_processing") {
    throw new BloomPreparePaymentError(
      "PAYMENT_PREPARATION_IN_PROGRESS",
      "Secure payment is already being prepared. Please try again in a moment.",
    );
  }

  if (attempt.status === "failed") {
    throw new BloomPreparePaymentError(
      "CHECKOUT_ATTEMPT_FAILED",
      "This checkout attempt can no longer be used. Please start a new checkout attempt.",
    );
  }

  if (attempt.status !== "validated") {
    throw new BloomPreparePaymentError(
      "CHECKOUT_ATTEMPT_NOT_READY",
      "Checkout is not ready to start payment.",
    );
  }

  // A direct caller cannot activate coupon payments in production. The API
  // additionally requires a private sandbox token before passing couponCode.
  if (couponCode && !(couponSandboxEnvironmentReady() || couponOwnerUiSandboxReady())) {
    throw new BloomPreparePaymentError(
      "COUPON_REDEMPTION_UNAVAILABLE",
      "Coupon redemption is not available yet.",
      409,
    );
  }

  let evaluatedCoupon: { id: string; code: string; discountCents: number } | null = null;
  if (couponCode) {
    const code = normalizeCouponCode(couponCode);
    if (!code) {
      throw new BloomPreparePaymentError("INVALID_COUPON", "Invalid coupon code.", 400);
    }
    const coupon = await BloomWebsiteCoupon.findOne({
      shop: preflight.shop._id,
      website: preflight.website._id,
      code,
    }).lean<any>();
    if (!coupon) {
      throw new BloomPreparePaymentError("INVALID_COUPON", "Coupon is unavailable.");
    }
    const result = evaluateCoupon({
      coupon,
      code,
      merchandiseSubtotalCents: preflight.totals.subtotalCents,
    });
    if (!result.ok) {
      throw new BloomPreparePaymentError("COUPON_NOT_ELIGIBLE", "Coupon is not eligible for this order.");
    }
    evaluatedCoupon = { id: String(coupon._id), code: result.code, discountCents: result.discountCents };
  }

  const tax = await calculateBloomWebsiteNativeCheckoutTax({
    attemptId,
    preflight,
    tipCents,
    merchandiseDiscountCents: evaluatedCoupon?.discountCents ?? 0,
  });
  const couponSnapshot = evaluatedCoupon
    ? buildCouponPaymentSnapshot({
        couponId: evaluatedCoupon.id,
        code: evaluatedCoupon.code,
        checkoutAttemptId: attemptId,
        merchandiseSubtotalCents: preflight.totals.subtotalCents,
        merchandiseDiscountCents: evaluatedCoupon.discountCents,
        fulfillmentFeeCents: preflight.totals.fulfillmentFeeCents,
        tipCents: tax.tipCents,
        taxAmountCents: tax.taxAmountCents,
        chargedTotalCents: tax.finalTotalCents,
      })
    : null;

  await BloomWebsiteCheckoutAttempt.updateOne(
    { _id: attempt._id, status: "validated" },
    {
      $set: {
        checkoutSnapshot: {
          website: {
            id: String(preflight.website._id),
            shopId: String(preflight.shop._id),
            siteName:
              preflight.website.siteName ||
              preflight.shop.businessName ||
              "BloomWebsite",
            previewSlug: preflight.website.previewSlug || "",
            customDomain: preflight.website.customDomain || "",
          },
          customer: checkoutSnapshot.customer,
          pickupDetails: checkoutSnapshot.pickupDetails,
          recipientEmail: checkoutSnapshot.recipientEmail,
          recipient: checkoutSnapshot.recipient,
          cardMessage: checkoutSnapshot.cardMessage,
          cardSignature: checkoutSnapshot.cardSignature,
          deliveryInstructions: checkoutSnapshot.deliveryInstructions,
          timezone: preflight.timezone,
          fulfillment: preflight.fulfillment,
          cart: preflight.cart,
          totals: preflight.totals,
        },
      },
    },
  );

  const readiness = await getBloomWebsiteMerchantReadiness({
    websiteId: String(preflight.website._id),
    requireReady: true,
  });

  if (!readiness.connection) {
    throw new BloomPreparePaymentError(
      "MERCHANT_CONNECTION_MISSING",
      "The florist payment connection could not be found.",
    );
  }
  if (couponCode && readiness.provider !== "stripe") {
    throw new BloomPreparePaymentError("COUPON_SANDBOX_STRIPE_ONLY", "Coupon testing requires Stripe sandbox.", 409);
  }

  const reservation = await reserveBloomWebsiteInventory({
    checkoutAttemptId: String(attempt._id),
    cart: preflight.cart,
  });

  const paymentProvider = getBloomPaymentProvider(readiness.provider);
  const paymentIdempotencyKey = `bloom-payment:${attempt.attemptId}`;
  const paymentStartedAt = new Date();

  /*
   * Claim processor preparation before making the external API call.
   * Inventory reservation itself is idempotent, so concurrent requests may
   * both reach this point, but only one request may own PaymentIntent creation.
   * This prevents a losing request from releasing inventory underneath a
   * successful processor handoff.
   */
  const claimedAttempt = await BloomWebsiteCheckoutAttempt.findOneAndUpdate(
    {
      _id: attempt._id,
      status: "validated",
      "inventory.reservation": reservation.reservationId,
    },
    {
      $set: {
        status: "payment_processing",
        "payment.provider": readiness.provider,
        "payment.merchantConnectionId": readiness.connection.id,
        "payment.providerPaymentId": "",
        "payment.providerStatus": "",
        "payment.idempotencyKey": paymentIdempotencyKey,
        "payment.amountCents": tax.finalTotalCents,
        "payment.paymentStartedAt": paymentStartedAt,
        couponSnapshot,
        "lastError.code": "",
        "lastError.message": "",
        "lastError.occurredAt": null,
      },
    },
    { new: true },
  );

  if (!claimedAttempt) {
    /*
     * Another request won the preparation claim. Never release the shared
     * reservation here; the winning request owns it and may already be talking
     * to Stripe. The browser can retry and reuse the resulting PaymentIntent.
     */
    throw new BloomPreparePaymentError(
      "PAYMENT_PREPARATION_IN_PROGRESS",
      "Secure payment is already being prepared. Please try again in a moment.",
    );
  }

  let couponProviderRequestStarted = false;
  try {
    // Claim the checkout attempt before reserving the coupon. The losing
    // concurrent request must never release the winning request's hold.
    // No processor request is allowed until this atomic reservation succeeds.
    if (evaluatedCoupon) {
      const couponReservation = await reserveCouponUse({
        couponId: evaluatedCoupon.id,
        shopId: String(preflight.shop._id),
        websiteId: String(preflight.website._id),
        attemptId: attempt.attemptId,
        holdUntil: new Date(Date.now() + 30 * 60 * 1000),
      });
      if (couponReservation === "unavailable") {
        throw new BloomPreparePaymentError(
          "COUPON_CAPACITY_UNAVAILABLE",
          "This coupon is no longer available. Please start a new checkout.",
          409,
        );
      }
    }

    // From this point the provider may have accepted an idempotent payment
    // even if our request times out before receiving or saving its ID.
    couponProviderRequestStarted = evaluatedCoupon !== null;
    const payment: BloomCreatePaymentResult =
      await paymentProvider.createPayment({
        attemptId: attempt.attemptId,
        idempotencyKey: paymentIdempotencyKey,
        amountCents: tax.finalTotalCents,
        currency: "USD",
        customerEmail: checkoutSnapshot.customer.email,
        description: `BloomWebsite checkout ${attempt.attemptId}`,
        merchant: readiness.connection,
        metadata: {
          bloomAttemptId: attempt.attemptId,
          bloomWebsiteId: String(preflight.website._id),
          bloomShopId: String(preflight.shop._id),
        },
      });

    await BloomWebsiteCheckoutAttempt.updateOne(
      {
        _id: attempt._id,
        status: "payment_processing",
        "payment.idempotencyKey": paymentIdempotencyKey,
      },
      {
        $set: {
          "payment.provider": payment.provider,
          "payment.merchantConnectionId": readiness.connection.id,
          "payment.providerPaymentId": payment.providerPaymentId,
          "payment.providerStatus": payment.status,
          "payment.amountCents": tax.finalTotalCents,
          "lastError.code": "",
          "lastError.message": "",
          "lastError.occurredAt": null,
        },
      },
    );

    return {
      attemptId: attempt.attemptId,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId,
      providerStatus: payment.status,
      amountCents: tax.finalTotalCents,
      clientSecret: payment.clientSecret,
      redirectUrl: payment.redirectUrl,
      stripeAccountId:
        payment.provider === "stripe"
          ? readiness.connection.providerAccountId
          : undefined,
      totals: {
        subtotalCents: preflight.totals.subtotalCents,
        fulfillmentFeeCents: preflight.totals.fulfillmentFeeCents,
        taxAmountCents: tax.taxAmountCents,
        tipCents: tax.tipCents,
        totalCents: tax.finalTotalCents,
      },
      reservationId: reservation.reservationId,
      existing: false,
    };
  } catch (error) {
    const providerError =
      error instanceof BloomPaymentProviderError ? error : null;

    /*
     * A database/network error can be ambiguous: the provider reference may
     * have been persisted even if this request saw an exception. Re-read the
     * attempt before releasing stock. If Bloom has a processor payment ID, keep
     * the reservation intact so a retry/recovery path can reconcile it safely.
     */
    const persistedAttempt = await BloomWebsiteCheckoutAttempt.findById(
      attempt._id,
    )
      .select("status payment.providerPaymentId")
      .lean<any>()
      .catch(() => null);

    if (
      persistedAttempt?.status === "payment_processing" &&
      typeof persistedAttempt?.payment?.providerPaymentId === "string" &&
      persistedAttempt.payment.providerPaymentId.trim()
    ) {
      await BloomWebsiteCheckoutAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            "lastError.code":
              providerError?.code || "PAYMENT_PREPARATION_RETRY_REQUIRED",
            "lastError.message":
              providerError?.message ||
              "Secure payment preparation needs to be retried.",
            "lastError.occurredAt": new Date(),
          },
        },
      ).catch(() => null);

      throw error;
    }

    // A missing local provider ID does NOT prove the provider never created a
    // payment. If we reached the create call, retain BOTH the coupon and
    // inventory reservations and leave the attempt processing for reconciliation.
    // Releasing only inventory here could oversell a paid coupon checkout.
    if (evaluatedCoupon && couponProviderRequestStarted) {
      await BloomWebsiteCheckoutAttempt.updateOne(
        { _id: attempt._id, status: "payment_processing" },
        { $set: {
          "lastError.code": providerError?.code || "PAYMENT_PROVIDER_OUTCOME_UNKNOWN",
          "lastError.message": "Payment creation outcome is uncertain; reservations held for reconciliation.",
          "lastError.occurredAt": new Date(),
        } },
      ).catch(() => null);
      throw new BloomPreparePaymentError(
        "PAYMENT_RECONCILIATION_REQUIRED",
        "Payment status is being checked. Please do not submit a new checkout yet.",
        409,
      );
    }

    // Provider creation was never invoked. It is safe to release the coupon
    // reservation, if any, along with the inventory reservation below.
    if (evaluatedCoupon) {
      await releaseCouponUse({
        couponId: evaluatedCoupon.id,
        shopId: String(preflight.shop._id),
        websiteId: String(preflight.website._id),
        attemptId: attempt.attemptId,
      });
    }

    await releaseBloomWebsiteInventory({
      reservationId: reservation.reservationId,
      reason: "Payment provider could not start checkout.",
    });

    const failureMessage =
      providerError?.message || "Payment could not be started.";

    await BloomWebsiteCheckoutAttempt.updateOne(
      {
        _id: attempt._id,
        status: "payment_processing",
        "payment.providerPaymentId": { $in: ["", null] },
      },
      {
        $set: {
          status: "failed",
          "lastError.code":
            providerError?.code || "PAYMENT_PREPARATION_FAILED",
          "lastError.message": failureMessage,
          "lastError.occurredAt": new Date(),
        },
      },
    );

    if (error instanceof BloomPreparePaymentError) {
      throw error;
    }
    throw new BloomPreparePaymentError(
      "CHECKOUT_ATTEMPT_FAILED",
      `${failureMessage} Please try again.`,
      providerError?.status || 502,
    );
  }
}
