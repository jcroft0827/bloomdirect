import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { stripe } from "@/lib/stripe/stripe";
import Shop from "@/models/Shop";

type BillingPeriod = "monthly" | "annual";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();

    const billingPeriod: BillingPeriod =
      body?.billingPeriod === "annual" ? "annual" : "monthly";

    const priceId =
      billingPeriod === "annual"
        ? process.env.STRIPE_PRO_ANNUAL_PRICE_ID
        : process.env.STRIPE_PRO_MONTHLY_PRICE_ID;

    if (!priceId) {
      console.error(`Missing Stripe ${billingPeriod} Price ID.`);

      return NextResponse.json(
        {
          error: "Bloom Pro checkout is not configured.",
        },
        { status: 500 },
      );
    }

    const shop = await Shop.findById(session.user.id).select(
      "_id businessName email isPro isSuspended stripe",
    );

    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "This account cannot start checkout.",
        },
        { status: 403 },
      );
    }

    if (shop.isPro && shop.stripe?.subscriptionId) {
      return NextResponse.json(
        {
          error: "This shop already has an active Bloom Pro subscription.",
          code: "ALREADY_SUBSCRIBED",
        },
        { status: 409 },
      );
    }

    const appUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_URL
        : process.env.NEXT_PUBLIC_APP_URL;

    const normalizedAppUrl = appUrl?.replace(/\/$/, "");

    if (!normalizedAppUrl) {
      return NextResponse.json(
        {
          error: "The application URL is not configured.",
        },
        { status: 500 },
      );
    }

    let customerId = shop.stripe?.customerId || null;

    if (customerId) {
      try {
        const existingCustomer = await stripe.customers.retrieve(customerId);

        if (existingCustomer.deleted) {
          customerId = null;
        }
      } catch (error: any) {
        const customerMissing =
          error?.type === "StripeInvalidRequestError" &&
          error?.code === "resource_missing";

        if (!customerMissing) {
          throw error;
        }

        console.warn(
          `Stored Stripe customer ${customerId} was not found in the current Stripe environment. Creating a new customer.`,
        );

        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: shop.email,
        name: shop.businessName,
        metadata: {
          shopId: shop._id.toString(),
        },
      });

      customerId = customer.id;

      await Shop.findByIdAndUpdate(shop._id, {
        $set: {
          "stripe.customerId": customer.id,
          "stripe.subscriptionId": null,
          "stripe.status": null,
          "stripe.planId": null,
          "stripe.cancelAtPeriodEnd": false,
        },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "subscription",

      customer: customerId,

      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],

      client_reference_id: shop._id.toString(),

      metadata: {
        shopId: shop._id.toString(),
        billingPeriod,
      },

      subscription_data: {
        metadata: {
          shopId: shop._id.toString(),
          billingPeriod,
        },
      },

      success_url:
        `${normalizedAppUrl}/dashboard/upgrade` +
        "?checkout=success&session_id={CHECKOUT_SESSION_ID}",

      cancel_url:
        `${normalizedAppUrl}/dashboard/upgrade` + "?checkout=canceled",

      allow_promotion_codes: true,
    });

    if (!checkoutSession.url) {
      return NextResponse.json(
        {
          error: "Stripe did not return a checkout URL.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error("BLOOM PRO CHECKOUT ERROR:", error);

    return NextResponse.json(
      {
        error: "Unable to start Bloom Pro checkout.",
      },
      { status: 500 },
    );
  }
}
