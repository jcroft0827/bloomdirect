import type Stripe from "stripe";

import type { BloomPaymentProvider } from "../BloomPaymentProvider";
import {
  BloomPaymentProviderError,
  type BloomPaymentStatus,
} from "../types";

function mapStripeStatus(
  status: Stripe.PaymentIntent.Status,
): BloomPaymentStatus {
  switch (status) {
    case "requires_payment_method":
      return "requires_payment_method";
    case "requires_action":
    case "requires_confirmation":
    case "requires_capture":
      return "requires_action";
    case "processing":
      return "processing";
    case "succeeded":
      return "succeeded";
    case "canceled":
      return "canceled";
    default:
      return "failed";
  }
}

async function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new BloomPaymentProviderError(
      "STRIPE_NOT_CONFIGURED",
      "Stripe payments are not configured on Bloom.",
      { status: 503 },
    );
  }

  const StripeSdk = (await import("stripe")).default;
  return new StripeSdk(secretKey);
}

export const bloomStripePaymentProvider: BloomPaymentProvider = {
  name: "stripe",

  async createPayment(input) {
    if (!input.merchant.providerAccountId) {
      throw new BloomPaymentProviderError(
        "STRIPE_ACCOUNT_MISSING",
        "This florist has not finished connecting Stripe.",
        { status: 409 },
      );
    }

    const stripe = await getStripe();

    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: input.amountCents,
          currency: input.currency.toLowerCase(),
          automatic_payment_methods: {
            enabled: true,
          },
          receipt_email: input.customerEmail || undefined,
          description: input.description,
          metadata: input.metadata,
        },
        {
          stripeAccount: input.merchant.providerAccountId,
          idempotencyKey: input.idempotencyKey,
        },
      );

      return {
        provider: "stripe",
        providerPaymentId: intent.id,
        status: mapStripeStatus(intent.status),
        clientSecret: intent.client_secret || undefined,
      };
    } catch (error: any) {
      throw new BloomPaymentProviderError(
        cleanStripeCode(error),
        cleanStripeMessage(error),
        {
          retryable:
            error?.type === "StripeAPIError" ||
            error?.type === "StripeConnectionError" ||
            error?.type === "StripeRateLimitError",
          status: 502,
        },
      );
    }
  },

  async retrievePayment(input) {
    if (!input.merchant.providerAccountId) {
      throw new BloomPaymentProviderError(
        "STRIPE_ACCOUNT_MISSING",
        "This florist has not finished connecting Stripe.",
        { status: 409 },
      );
    }

    const stripe = await getStripe();
    const intent = await stripe.paymentIntents.retrieve(
      input.providerPaymentId,
      {},
      {
        stripeAccount: input.merchant.providerAccountId,
      },
    );

    return {
      provider: "stripe",
      providerPaymentId: intent.id,
      status: mapStripeStatus(intent.status),
      amountCents:
        typeof intent.amount === "number" ? intent.amount : null,
      currency: intent.currency.toUpperCase(),
      clientSecret: intent.client_secret || undefined,
    };
  },

  async cancelPayment(input) {
    if (!input.merchant.providerAccountId) {
      throw new BloomPaymentProviderError(
        "STRIPE_ACCOUNT_MISSING",
        "This florist has not finished connecting Stripe.",
        { status: 409 },
      );
    }

    const stripe = await getStripe();

    try {
      const intent = await stripe.paymentIntents.cancel(
        input.providerPaymentId,
        {},
        {
          stripeAccount: input.merchant.providerAccountId,
        },
      );

      return {
        provider: "stripe",
        providerPaymentId: intent.id,
        status: mapStripeStatus(intent.status),
      };
    } catch (error: any) {
      throw new BloomPaymentProviderError(
        cleanStripeCode(error),
        cleanStripeMessage(error),
        {
          retryable:
            error?.type === "StripeAPIError" ||
            error?.type === "StripeConnectionError" ||
            error?.type === "StripeRateLimitError",
          status: 502,
        },
      );
    }
  },

async refundPayment(input) {
  if (!input.merchant.providerAccountId) {
    throw new BloomPaymentProviderError(
      "STRIPE_ACCOUNT_MISSING",
      "This florist has not finished connecting Stripe.",
      { status: 409 },
    );
  }

  const stripe = await getStripe();

  try {
    const refund = await stripe.refunds.create(
      {
        payment_intent: input.providerPaymentId,
        amount: input.amountCents,
        reason: "requested_by_customer",
        metadata: {
          bloomReason: input.reason.slice(0, 450),
        },
      },
      {
        stripeAccount: input.merchant.providerAccountId,
        idempotencyKey: input.idempotencyKey,
      },
    );

    return {
      provider: "stripe",
      providerRefundId: refund.id,
      status:
        refund.status === "succeeded"
          ? "succeeded"
          : refund.status === "failed"
            ? "failed"
            : refund.status === "canceled"
              ? "canceled"
              : "pending",
      amountCents: refund.amount,
    };
  } catch (error: any) {
    throw new BloomPaymentProviderError(
      cleanStripeCode(error),
      cleanStripeMessage(error),
      {
        retryable:
          error?.type === "StripeAPIError" ||
          error?.type === "StripeConnectionError" ||
          error?.type === "StripeRateLimitError",
        status: 502,
      },
    );
  }
},

  async verifyWebhook(rawBody, signature) {
    const webhookSecret =
      process.env.BLOOMWEBSITES_STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BloomPaymentProviderError(
        "STRIPE_WEBHOOK_NOT_CONFIGURED",
        "Stripe webhook verification is not configured.",
        { status: 503 },
      );
    }

    const stripe = await getStripe();

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch {
      throw new BloomPaymentProviderError(
        "STRIPE_WEBHOOK_SIGNATURE_INVALID",
        "Stripe webhook signature could not be verified.",
        { status: 400 },
      );
    }

    const object = event.data.object as any;
    const providerPaymentId =
      typeof object?.id === "string" &&
      object.id.startsWith("pi_")
        ? object.id
        : "";

    const providerAccountId =
      typeof object?.id === "string" &&
      object.id.startsWith("acct_")
        ? object.id
        : "";

    return {
      eventId: event.id,
      eventType: event.type,
      providerPaymentId,
      providerAccountId,
    };
  },
};

function cleanStripeCode(error: any) {
  const code =
    typeof error?.code === "string" && error.code.trim()
      ? error.code.trim()
      : "STRIPE_PAYMENT_ERROR";

  return code.slice(0, 120);
}

function cleanStripeMessage(error: any) {
  const message =
    typeof error?.message === "string" && error.message.trim()
      ? error.message.trim()
      : "Stripe could not start this payment.";

  return message.slice(0, 1000);
}
