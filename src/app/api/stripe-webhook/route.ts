// api/stripe-webhook/route.ts

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

import { connectToDB } from "@/lib/mongoose";
import { stripe } from "@/lib/stripe/stripe";
import Shop from "@/models/Shop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getStripeId(
  value:
    | string
    | { id: string }
    | null
    | undefined,
) {
  if (!value) return null;

  return typeof value === "string"
    ? value
    : value.id;
}

/*
 * Bloom Pro access policy:
 *
 * active   -> access
 * trialing -> access
 *
 * All other Stripe statuses do not grant paid Pro access.
 */
function subscriptionHasProAccess(
  status: Stripe.Subscription.Status,
) {
  return (
    status === "active" ||
    status === "trialing"
  );
}

async function syncSubscription(
  subscription: Stripe.Subscription,
) {
  const customerId = getStripeId(
    subscription.customer,
  );

  const shopId =
    subscription.metadata?.shopId || null;

  const priceId =
    subscription.items.data[0]?.price?.id ||
    null;

  const isPro = subscriptionHasProAccess(
    subscription.status,
  );

  /*
   * Prefer subscription metadata because it directly
   * identifies the GetBloomDirect shop.
   *
   * Fall back to the stored Stripe customer ID for
   * older subscriptions that lack metadata.
   */
  const shop = shopId
    ? await Shop.findById(shopId)
    : await Shop.findOne({
        "stripe.customerId": customerId,
      });

  if (!shop) {
    console.error(
      "No GetBloomDirect shop matched Stripe subscription:",
      {
        subscriptionId: subscription.id,
        shopId,
        customerId,
      },
    );

    return;
  }

  const update: Record<string, unknown> = {
    isPro,

    "stripe.customerId": customerId,
    "stripe.subscriptionId":
      subscription.id,
    "stripe.status": subscription.status,
    "stripe.planId": priceId,
    "stripe.cancelAtPeriodEnd":
      subscription.cancel_at_period_end,
  };

  /*
   * Record the first time the account gains Pro,
   * but do not reset proSince on every renewal or
   * subscription update.
   */
  if (isPro && !shop.proSince) {
    update.proSince = new Date();
  }

  await Shop.findByIdAndUpdate(shop._id, {
    $set: update,
  });
}

export async function POST(
  request: Request,
) {
  const signature = (
    await headers()
  ).get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      {
        error: "Missing Stripe signature.",
      },
      { status: 400 },
    );
  }

  const webhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error(
      "STRIPE_WEBHOOK_SECRET is not configured.",
    );

    return NextResponse.json(
      {
        error:
          "Stripe webhook is not configured.",
      },
      { status: 500 },
    );
  }

  const rawBody = await request.text();

  let event: Stripe.Event;

  try {
    event =
      stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
  } catch (error: any) {
    console.error(
      "Stripe webhook signature error:",
      error.message,
    );

    return new NextResponse(
      `Webhook Error: ${error.message}`,
      { status: 400 },
    );
  }

  try {
    await connectToDB();

    switch (event.type) {
      case "checkout.session.completed": {
        const checkoutSession =
          event.data
            .object as Stripe.Checkout.Session;

        const subscriptionId =
          getStripeId(
            checkoutSession.subscription,
          );

        if (!subscriptionId) {
          console.error(
            "Checkout completed without a subscription:",
            checkoutSession.id,
          );

          break;
        }

        /*
         * Retrieve the authoritative subscription
         * record instead of blindly granting Pro from
         * the Checkout Session alone.
         */
        const subscription =
          await stripe.subscriptions.retrieve(
            subscriptionId,
          );

        await syncSubscription(subscription);

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        await syncSubscription(
          event.data
            .object as Stripe.Subscription,
        );

        break;
      }

      case "invoice.paid": {
        /*
         * No separate entitlement update is required.
         * Stripe normally also emits subscription
         * lifecycle events when its status changes.
         *
         * We can later use this event for payment
         * history or customer notifications.
         */
        break;
      }

      case "invoice.payment_failed": {
        /*
         * Stripe may change the subscription status
         * depending on your retry settings.
         *
         * customer.subscription.updated will sync
         * that resulting status to GetBloomDirect.
         *
         * Later: create a billing notification/email.
         */
        break;
      }

      default:
        break;
    }

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error(
      "Stripe webhook processing error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Stripe webhook processing failed.",
      },
      { status: 500 },
    );
  }
}