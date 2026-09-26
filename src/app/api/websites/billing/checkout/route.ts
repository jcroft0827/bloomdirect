import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  bloomWebsitePriceId,
  bloomWebsiteSubscriptionHasAccess,
  type BloomWebsiteBillingPeriod,
} from "@/lib/bloom-websites/billing/plans";
import { connectToDB } from "@/lib/mongoose";
import { stripe } from "@/lib/stripe/stripe";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const websiteId =
      typeof body?.websiteId === "string"
        ? body.websiteId.trim()
        : "";

    const billingPeriod: BloomWebsiteBillingPeriod =
      body?.billingPeriod === "annual"
        ? "annual"
        : "monthly";

    if (!websiteId) {
      return NextResponse.json(
        { error: "A BloomWebsite is required." },
        { status: 400 },
      );
    }

    const priceId = bloomWebsitePriceId(billingPeriod);

    if (!priceId) {
      return NextResponse.json(
        {
          error:
            billingPeriod === "annual"
              ? "BloomWebsites annual billing is not configured."
              : "BloomWebsites monthly billing is not configured.",
        },
        { status: 500 },
      );
    }

    await connectToDB();

    const [website, shop] = await Promise.all([
      BloomWebsite.findOne({
        _id: websiteId,
        shop: session.user.id,
      }),
      Shop.findById(session.user.id).select(
        "_id businessName email isSuspended stripe.customerId",
      ),
    ]);

    if (!website || !shop) {
      return NextResponse.json(
        { error: "BloomWebsite or shop could not be found." },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error:
            "Suspended shops cannot activate BloomWebsites billing.",
        },
        { status: 403 },
      );
    }

    if (
      bloomWebsiteSubscriptionHasAccess(
        website.billing?.status,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "This BloomWebsite already has an active subscription.",
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
        { error: "The application URL is not configured." },
        { status: 500 },
      );
    }

    let customerId =
      website.billing?.customerId ||
      shop.stripe?.customerId ||
      "";

    if (customerId) {
      try {
        const existingCustomer =
          await stripe.customers.retrieve(customerId);

        if (existingCustomer.deleted) {
          customerId = "";
        }
      } catch (error: any) {
        const missing =
          error?.type === "StripeInvalidRequestError" &&
          error?.code === "resource_missing";

        if (!missing) throw error;

        customerId = "";
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
          "stripe.customerId": customerId,
        },
      });
    }

    website.billing.customerId = customerId;
    await website.save();

    const checkoutSession =
      await stripe.checkout.sessions.create({
        mode: "subscription",
        customer: customerId,

        automatic_tax: {
          enabled: true,
        },

        billing_address_collection: "required",

        customer_update: {
          address: "auto",
        },

        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],

        client_reference_id: website._id.toString(),

        metadata: {
          product: "bloomwebsites",
          shopId: shop._id.toString(),
          websiteId: website._id.toString(),
          billingPeriod,
        },

        subscription_data: {
          metadata: {
            product: "bloomwebsites",
            shopId: shop._id.toString(),
            websiteId: website._id.toString(),
            billingPeriod,
          },
        },

        success_url:
          `${normalizedAppUrl}/dashboard/websites/launch` +
          `?website=${encodeURIComponent(
            website._id.toString(),
          )}&billing=success&session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${normalizedAppUrl}/dashboard/websites/launch` +
          `?website=${encodeURIComponent(
            website._id.toString(),
          )}&billing=canceled`,

        allow_promotion_codes: false,
      });

    if (!checkoutSession.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      url: checkoutSession.url,
    });
  } catch (error) {
    console.error(
      "BLOOMWEBSITES SUBSCRIPTION CHECKOUT ERROR:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to start BloomWebsites checkout." },
      { status: 500 },
    );
  }
}
