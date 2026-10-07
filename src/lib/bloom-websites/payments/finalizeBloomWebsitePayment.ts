import { randomUUID } from "crypto";
import { isValidObjectId } from "mongoose";

import { connectToDB } from "@/lib/mongoose";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import {
  commitBloomWebsiteInventory,
  releaseBloomWebsiteInventory,
} from "@/lib/bloom-websites/bloomWebsiteInventoryReservations";
import { generateBloomWebsiteOrderNumber } from "@/lib/bloom-websites/generateBloomWebsiteOrderNumber";
import { bloomNativeTaxProvider } from "@/lib/bloom-websites/tax/bloomNativeTaxProvider";
import type { BloomTaxCalculationResult } from "@/lib/bloom-websites/tax/types";
import { getBloomPaymentProvider } from "./getBloomPaymentProvider";
import { getBloomWebsiteMerchantReadiness } from "./getBloomWebsiteMerchantReadiness";
import type { BloomPaymentProviderName } from "./types";
import {
  sendBloomWebsitePlacedNotifications,
} from "@/lib/bloom-websites/orders/sendBloomWebsiteOrderNotifications";
import { sendBloomWebsiteOrderToTfpos } from "@/lib/bloom-websites/pos/tfpos/sendBloomWebsiteOrderToTfpos";

export class BloomPaymentFinalizationError extends Error {
  code: string;
  status: number;
  retryable: boolean;

  constructor(
    code: string,
    message: string,
    options?: { status?: number; retryable?: boolean },
  ) {
    super(message);
    this.name = "BloomPaymentFinalizationError";
    this.code = code;
    this.status = options?.status ?? 409;
    this.retryable = options?.retryable ?? false;
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function integer(value: unknown) {
  return Number.isInteger(value) ? Number(value) : null;
}

function orderItemSnapshots(cart: any) {
  if (!Array.isArray(cart?.items) || cart.items.length === 0) {
    throw new BloomPaymentFinalizationError(
      "CHECKOUT_SNAPSHOT_INVALID",
      "The paid checkout snapshot is incomplete.",
      { status: 500, retryable: true },
    );
  }

  return cart.items.map((item: any) => ({
    productId: item.productId,
    slug: clean(item.slug),
    sku: clean(item.sku),
    name: clean(item.name),
    category: clean(item.category),
    imageUrl: clean(item.imageUrl),
    tier: item.tier,
    tierLabel: clean(item.tierLabel) || item.tier,
    recipe: item.recipe || {
      ingredients: [],
      designerInstructions: "",
    },
    quantity: item.quantity,
    taxable: item.taxable === true,
    localOnly: item.localOnly === true,
    allowsSubstitutions: item.allowsSubstitutions !== false,
    arrangementContainerNote: clean(item.arrangementContainerNote),
    unitPriceCents: item.unitPriceCents,
    productSubtotalCents: item.productSubtotalCents,
    addonSubtotalCents: item.addonSubtotalCents,
    lineTotalCents: item.lineTotalCents,
    addons: Array.isArray(item.addons)
      ? item.addons.map((addon: any) => ({
          addonId: addon.id,
          sku: clean(addon.sku),
          name: clean(addon.name),
          category: clean(addon.category),
          imageUrl: clean(addon.imageUrl),
          quantity: addon.quantity,
          taxable: addon.taxable === true,
          unitPriceCents: addon.unitPriceCents,
          lineTotalCents: addon.lineTotalCents,
        }))
      : [],
  }));
}

function fulfillmentSnapshot(snapshot: any) {
  const fulfillment = snapshot?.fulfillment;

  if (fulfillment?.type === "pickup") {
    return {
      type: "pickup",
      requestedDate: fulfillment.requestedDate,
      timezone: snapshot.timezone,
      window: { type: "anytime", from: "", to: "" },
      deliveryAddress: {},
      deliveryFeeCents: 0,
      pickupLocation: {
        businessName: clean(fulfillment.pickupLocation?.businessName),
        address: fulfillment.pickupLocation?.address || {},
        instructions: clean(fulfillment.pickupLocation?.instructions),
        preparationMinutes:
          integer(fulfillment.pickupLocation?.preparationMinutes) ?? 0,
      },
    };
  }

  if (fulfillment?.type === "delivery") {
    return {
      type: "delivery",
      requestedDate: fulfillment.requestedDate,
      timezone: snapshot.timezone,
      window: { type: "anytime", from: "", to: "" },
      deliveryAddress: fulfillment.deliveryAddress || {},
      deliveryFeeCents: fulfillment.feeCents || 0,
      pickupLocation: {
        businessName: "",
        address: {},
        instructions: "",
        preparationMinutes: 0,
      },
    };
  }

  throw new BloomPaymentFinalizationError(
    "CHECKOUT_FULFILLMENT_INVALID",
    "The paid checkout fulfillment snapshot is invalid.",
    { status: 500, retryable: true },
  );
}

function taxSnapshot(
  calculation: BloomTaxCalculationResult,
  providerTransactionId = "",
) {
  return {
    provider: calculation.provider,
    providerCalculationId: calculation.providerCalculationId,
    providerTransactionId,
    taxableSubtotalCents: calculation.taxableSubtotalCents,
    taxAmountCents: calculation.taxAmountCents,
    exemption: {
      applied: calculation.exemptionApplied,
      reason: calculation.exemptionReason || "",
      certificateReference: calculation.exemptionReference || "",
      providerReference: "",
    },
    lines: calculation.lines,
    jurisdictions: calculation.jurisdictions,
    jurisdiction: {
      country: "",
      state: "",
      county: "",
      city: "",
    },
  };
}

async function createOrderOnce(attempt: any) {
  const existing = await BloomWebsiteOrder.findOne({
    checkoutAttempt: attempt._id,
  });

  if (existing) return existing;

  const snapshot = attempt.checkoutSnapshot;
  const calculation = attempt.tax?.calculationSnapshot as
    | BloomTaxCalculationResult
    | undefined;

  if (!snapshot || !calculation) {
    throw new BloomPaymentFinalizationError(
      "CHECKOUT_RECOVERY_SNAPSHOT_MISSING",
      "Bloom has the payment but is missing part of the checkout recovery snapshot.",
      { status: 500, retryable: true },
    );
  }

  const finalTotalCents = integer(attempt.tax?.finalTotalCents);
  const taxAmountCents = integer(attempt.tax?.taxAmountCents);
  const taxableSubtotalCents = integer(attempt.tax?.taxableSubtotalCents);
  const tipCents = integer(attempt.tip?.amountCents) ?? 0;
  const paymentAmountCents = integer(attempt.payment?.amountCents);

  if (
    finalTotalCents === null ||
    taxAmountCents === null ||
    taxableSubtotalCents === null ||
    paymentAmountCents !== finalTotalCents
  ) {
    throw new BloomPaymentFinalizationError(
      "PAID_TOTALS_INVALID",
      "The paid checkout totals do not reconcile.",
      { status: 500, retryable: true },
    );
  }

  for (let attemptNumber = 0; attemptNumber < 5; attemptNumber += 1) {
    try {
      return await BloomWebsiteOrder.create({
        orderNumber: generateBloomWebsiteOrderNumber(),
        shop: attempt.shop,
        website: attempt.website,
        storefront: {
          siteName: clean(snapshot.website?.siteName) || "BloomWebsite",
          previewSlug: clean(snapshot.website?.previewSlug),
          customDomain: clean(snapshot.website?.customDomain),
        },
        idempotencyKey: attempt.idempotencyKey,
        checkoutAttempt: attempt._id,
        customer: snapshot.customer,
        recipient: {
          ...snapshot.recipient,
          address:
            snapshot.fulfillment?.type === "delivery"
              ? snapshot.fulfillment.deliveryAddress || {}
              : {},
          deliveryInstructions: clean(snapshot.deliveryInstructions),
        },
        cardMessage: clean(snapshot.cardMessage),
        fulfillment: fulfillmentSnapshot(snapshot),
        items: orderItemSnapshots(snapshot.cart),
        itemCount: snapshot.cart.itemCount,
        totals: {
          productSubtotalCents: snapshot.totals.productSubtotalCents,
          addonSubtotalCents: snapshot.totals.addonSubtotalCents,
          subtotalCents: snapshot.totals.subtotalCents,
          fulfillmentFeeCents: snapshot.totals.fulfillmentFeeCents,
          tipCents,
          taxableSubtotalCents,
          taxAmountCents,
          totalCents: finalTotalCents,
          currency: "USD",
        },
        tax: taxSnapshot(calculation),
        payment: {
          provider: attempt.payment.provider,
          merchantConnectionId: clean(attempt.payment.merchantConnectionId),
          providerPaymentId: clean(attempt.payment.providerPaymentId),
          providerCustomerId: "",
          status: "paid",
          amountCents: finalTotalCents,
          currency: "USD",
          paidAt: attempt.payment.paymentSucceededAt || new Date(),
          failureCode: "",
          failureMessage: "",
        },
        status: "placed",
        placedAt: new Date(),
        historyEvents: [
          {
            eventId: `BWH_${randomUUID()}`,
            kind: "order_placed",
            source: "storefront",
            actor: {
              type: "customer",
              id: "",
              label:
                clean(snapshot.customer?.email) || "Customer checkout",
            },
            summary: "Order placed and payment confirmed",
            reason: "",
            referenceType: "checkout_attempt",
            referenceId: String(attempt._id),
            amountCents: finalTotalCents,
            changes: [],
            financialReviewRequired: false,
            occurredAt:
              attempt.payment?.paymentSucceededAt || new Date(),
          },
        ],
      });
    } catch (error: any) {
      if (error?.code === 11000) {
        const recovered = await BloomWebsiteOrder.findOne({
          $or: [
            { checkoutAttempt: attempt._id },
            { idempotencyKey: attempt.idempotencyKey },
          ],
        });

        if (recovered) return recovered;

        continue;
      }

      throw error;
    }
  }

  throw new BloomPaymentFinalizationError(
    "ORDER_NUMBER_COLLISION",
    "Bloom could not allocate an order number.",
    { status: 500, retryable: true },
  );
}

export async function finalizeBloomWebsitePayment({
  attemptId,
}: {
  attemptId: string;
}) {
  await connectToDB();

  let attempt = await BloomWebsiteCheckoutAttempt.findOne({ attemptId });

  if (!attempt) {
    throw new BloomPaymentFinalizationError(
      "CHECKOUT_ATTEMPT_NOT_FOUND",
      "Checkout attempt could not be found.",
      { status: 404 },
    );
  }

  if (attempt.status === "order_committed" && attempt.order) {
    const existingOrder = await BloomWebsiteOrder.findById(attempt.order);
    if (existingOrder) {
      return {
        completed: true,
        recovered: true,
        orderId: String(existingOrder._id),
        orderNumber: existingOrder.orderNumber,
      };
    }
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

  /*
   * Finalization is recovery work for money that may already have moved.
   * Never require the merchant to still be launch-ready here: a florist can
   * become restricted, disable website payments, or switch processors after
   * the PaymentIntent was created. We must still reconcile the payment against
   * the historical provider/account that owns this checkout attempt.
   */
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
  const verifiedPayment = await paymentProvider.retrievePayment({
    providerPaymentId,
    merchant: readiness.connection,
  });

  const expectedAmount = integer(attempt.tax?.finalTotalCents);

  if (
    verifiedPayment.amountCents !== null &&
    expectedAmount !== verifiedPayment.amountCents
  ) {
    throw new BloomPaymentFinalizationError(
      "PAYMENT_AMOUNT_MISMATCH",
      "Processor payment amount does not match Bloom's authoritative total.",
      { status: 500 },
    );
  }

  if (verifiedPayment.status !== "succeeded") {
    const terminalPayment =
      verifiedPayment.status === "failed" ||
      verifiedPayment.status === "canceled";

    if (terminalPayment) {
      const reservationId = attempt.inventory?.reservation
        ? String(attempt.inventory.reservation)
        : "";

      if (
        attempt.inventory?.status === "reserved" &&
        reservationId &&
        isValidObjectId(reservationId)
      ) {
        try {
          await releaseBloomWebsiteInventory({
            reservationId,
            reason:
              verifiedPayment.status === "canceled"
                ? "Processor payment was canceled before order completion."
                : "Processor payment failed before order completion.",
          });
        } catch (error) {
          throw new BloomPaymentFinalizationError(
            "PAYMENT_TERMINAL_CLEANUP_FAILED",
            "The payment ended, but Bloom could not release its inventory reservation.",
            { status: 500, retryable: true },
          );
        }
      }

      const terminalCode =
        verifiedPayment.status === "canceled"
          ? "PAYMENT_CANCELED"
          : "PAYMENT_FAILED";

      await BloomWebsiteCheckoutAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            status: "failed",
            "payment.providerStatus": verifiedPayment.status,
            "lastError.code": terminalCode,
            "lastError.message":
              verifiedPayment.status === "canceled"
                ? "Processor payment was canceled."
                : "Processor payment failed.",
            "lastError.occurredAt": new Date(),
          },
        },
      );

      throw new BloomPaymentFinalizationError(
        terminalCode,
        verifiedPayment.status === "canceled"
          ? "Payment was canceled before the order was completed."
          : "Payment failed before the order was completed.",
        { status: 409, retryable: false },
      );
    }

    /*
     * requires_payment_method and requires_action are not terminal. Stripe can
     * reuse the same PaymentIntent after a declined card or customer action,
     * so keep the reservation alive until its normal reservation expiry.
     */
    await BloomWebsiteCheckoutAttempt.updateOne(
      { _id: attempt._id },
      {
        $set: {
          "payment.providerStatus": verifiedPayment.status,
          "lastError.code": "PAYMENT_NOT_SUCCEEDED",
          "lastError.message": "Processor has not confirmed successful payment.",
          "lastError.occurredAt": new Date(),
        },
      },
    );

    throw new BloomPaymentFinalizationError(
      "PAYMENT_NOT_SUCCEEDED",
      "Payment has not been confirmed by the processor yet.",
      { status: 409, retryable: verifiedPayment.status === "processing" },
    );
  }

  const paidAt = attempt.payment?.paymentSucceededAt || new Date();

  await BloomWebsiteCheckoutAttempt.updateOne(
    {
      _id: attempt._id,
      status: { $in: ["payment_processing", "payment_succeeded"] },
    },
    {
      $set: {
        status: "payment_succeeded",
        "payment.providerStatus": "succeeded",
        "payment.paymentSucceededAt": paidAt,
        "lastError.code": "",
        "lastError.message": "",
        "lastError.occurredAt": null,
      },
    },
  );

  attempt = await BloomWebsiteCheckoutAttempt.findById(attempt._id);
  if (!attempt) {
    throw new BloomPaymentFinalizationError(
      "CHECKOUT_ATTEMPT_LOST",
      "Checkout attempt could not be reloaded.",
      { status: 500, retryable: true },
    );
  }

  const order = await createOrderOnce(attempt);

  const calculation = attempt.tax?.calculationSnapshot as
    | BloomTaxCalculationResult
    | undefined;

  if (!calculation) {
    throw new BloomPaymentFinalizationError(
      "TAX_CALCULATION_SNAPSHOT_MISSING",
      "Tax calculation snapshot is missing during paid-order recovery.",
      { status: 500, retryable: true },
    );
  }

  let providerTransactionId = clean(attempt.tax?.providerTransactionId);

  if (!providerTransactionId) {
    if (calculation.provider !== "bloom_native") {
      throw new BloomPaymentFinalizationError(
        "TAX_PROVIDER_COMMIT_UNSUPPORTED",
        "This V1 checkout has an unsupported tax provider.",
        { status: 500, retryable: true },
      );
    }

    const committedTax = await bloomNativeTaxProvider.commit({
      calculation,
      orderNumber: order.orderNumber,
      providerPaymentId,
    });

    providerTransactionId = committedTax.providerTransactionId;

    await Promise.all([
      BloomWebsiteCheckoutAttempt.updateOne(
        { _id: attempt._id },
        {
          $set: {
            "tax.status": "committed",
            "tax.providerTransactionId": providerTransactionId,
            "tax.committedAt": committedTax.committedAt,
          },
        },
      ),
      BloomWebsiteOrder.updateOne(
        { _id: order._id },
        {
          $set: {
            "tax.providerTransactionId": providerTransactionId,
          },
        },
      ),
    ]);
  }

  const reservationId = attempt.inventory?.reservation
    ? String(attempt.inventory.reservation)
    : "";

  if (!reservationId || !isValidObjectId(reservationId)) {
    throw new BloomPaymentFinalizationError(
      "INVENTORY_RESERVATION_MISSING",
      "Paid checkout is missing its inventory reservation.",
      { status: 500, retryable: true },
    );
  }

  await commitBloomWebsiteInventory({ reservationId });

  await BloomWebsiteCheckoutAttempt.updateOne(
    { _id: attempt._id },
    {
      $set: {
        status: "order_committed",
        order: order._id,
        orderNumber: order.orderNumber,
        "lastError.code": "",
        "lastError.message": "",
        "lastError.occurredAt": null,
      },
    },
  );

  await sendBloomWebsitePlacedNotifications(String(order._id)).catch(
    (error) => {
      console.error("BloomWebsite placed-order notifications failed:", error);
    },
  );

  await sendBloomWebsiteOrderToTfpos({
    orderId: String(order._id),
    trigger: "automatic",
  }).catch((error) => {
    // POS delivery must never turn a successfully paid customer checkout into
    // a storefront error. Failed transfers are persisted and visible on the
    // order so the florist can resend them manually.
    console.error("BloomWebsite automatic TFPOS export failed:", error);
  });

  return {
    completed: true,
    recovered: false,
    orderId: String(order._id),
    orderNumber: order.orderNumber,
  };
}
