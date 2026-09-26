import { NextResponse } from "next/server";

import { connectToDB } from "@/lib/mongoose";
import { bloomStripePaymentProvider } from "@/lib/bloom-websites/payments/providers/stripe";
import { finalizeBloomWebsitePayment } from "@/lib/bloom-websites/payments/finalizeBloomWebsitePayment";
import { BloomPaymentProviderError } from "@/lib/bloom-websites/payments/types";
import BloomWebsiteCheckoutAttempt from "@/models/BloomWebsiteCheckoutAttempt";
import {
  syncBloomWebsiteStripeConnectionByAccountId,
} from "@/lib/bloom-websites/payments/stripeConnect";

const FINALIZABLE_EVENTS = new Set([
  "payment_intent.succeeded",
  "payment_intent.processing",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
]);

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  try {
    const event = await bloomStripePaymentProvider.verifyWebhook!(
      rawBody,
      signature,
    );

    if (
      event.eventType === "account.updated" &&
      event.providerAccountId
    ) {
      await syncBloomWebsiteStripeConnectionByAccountId(
        event.providerAccountId,
      );

      return NextResponse.json({ received: true });
    }

    if (
      !FINALIZABLE_EVENTS.has(event.eventType) ||
      !event.providerPaymentId
    ) {
      return NextResponse.json({ received: true });
    }

    await connectToDB();

    const attempt = await BloomWebsiteCheckoutAttempt.findOne({
      "payment.provider": "stripe",
      "payment.providerPaymentId": event.providerPaymentId,
    })
      .select("attemptId")
      .lean<any>();

    if (!attempt) {
      // A valid Stripe event can arrive for payments unrelated to
      // BloomWebsites. Acknowledge it without leaking identifiers.
      return NextResponse.json({ received: true });
    }

    try {
      await finalizeBloomWebsitePayment({
        attemptId: attempt.attemptId,
      });
    } catch (error: any) {
      /*
       * Processing/failed/canceled events are expected not to finalize.
       * For a succeeded event, return 500 on retryable reconciliation
       * failures so Stripe retries delivery.
       */
      if (
        (event.eventType === "payment_intent.succeeded" &&
          error?.retryable === true) ||
        error?.code === "PAYMENT_TERMINAL_CLEANUP_FAILED"
      ) {
        console.error("Retryable Stripe reconciliation failure:", error);
        return NextResponse.json(
          { error: "Reconciliation retry required." },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof BloomPaymentProviderError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("Stripe webhook failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
