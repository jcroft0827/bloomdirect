import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  bloomWebsitePriceId,
  type BloomWebsiteBillingPeriod,
} from "@/lib/bloom-websites/billing/plans";
import {
  isBloomWebsiteSubscription,
} from "@/lib/bloom-websites/billing/syncBloomWebsiteSubscription";
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

    const targetBillingPeriod: BloomWebsiteBillingPeriod =
      body?.targetBillingPeriod === "annual"
        ? "annual"
        : "monthly";

    if (!websiteId) {
      return NextResponse.json(
        { error: "A BloomWebsite is required." },
        { status: 400 },
      );
    }

    await connectToDB();

    const [website, shop] = await Promise.all([
      BloomWebsite.findOne({
        _id: websiteId,
        shop: session.user.id,
      })
        .select(
          "_id billing.customerId billing.subscriptionId billing.billingPeriod billing.status",
        )
        .lean<any>(),
      Shop.findById(session.user.id)
        .select("_id isSuspended")
        .lean<any>(),
    ]);

    if (!website || !shop) {
      return NextResponse.json(
        { error: "BloomWebsite or shop could not be found." },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "This account cannot manage billing." },
        { status: 403 },
      );
    }

    const subscriptionId =
      website.billing?.subscriptionId || "";

    const customerId =
      website.billing?.customerId || "";

    if (!subscriptionId || !customerId) {
      return NextResponse.json(
        {
          error:
            "An active BloomWebsites subscription could not be found.",
        },
        { status: 409 },
      );
    }

    if (
      website.billing?.billingPeriod === targetBillingPeriod
    ) {
      return NextResponse.json(
        {
          error:
            targetBillingPeriod === "annual"
              ? "This BloomWebsite is already billed annually."
              : "This BloomWebsite is already billed monthly.",
        },
        { status: 409 },
      );
    }

    const targetPriceId = bloomWebsitePriceId(
      targetBillingPeriod,
    );

    if (!targetPriceId) {
      return NextResponse.json(
        {
          error:
            targetBillingPeriod === "annual"
              ? "BloomWebsites annual billing is not configured."
              : "BloomWebsites monthly billing is not configured.",
        },
        { status: 500 },
      );
    }

    const subscription =
      await stripe.subscriptions.retrieve(subscriptionId);

    if (!isBloomWebsiteSubscription(subscription)) {
      return NextResponse.json(
        {
          error:
            "The stored Stripe subscription does not belong to BloomWebsites.",
        },
        { status: 409 },
      );
    }

    if (
      typeof subscription.customer === "string" &&
      subscription.customer !== customerId
    ) {
      return NextResponse.json(
        {
          error:
            "The Stripe customer no longer matches this BloomWebsite subscription.",
        },
        { status: 409 },
      );
    }

    if (subscription.items.data.length !== 1) {
      return NextResponse.json(
        {
          error:
            "This subscription cannot be changed automatically. Please use Manage Billing.",
        },
        { status: 409 },
      );
    }

    const item = subscription.items.data[0];

    if (item.price.id === targetPriceId) {
      return NextResponse.json(
        {
          error:
            targetBillingPeriod === "annual"
              ? "This BloomWebsite is already billed annually."
              : "This BloomWebsite is already billed monthly.",
        },
        { status: 409 },
      );
    }

    const appUrl =
      process.env.NODE_ENV === "production"
        ? process.env.NEXT_PUBLIC_URL
        : process.env.NEXT_PUBLIC_APP_URL;

    const normalizedAppUrl = appUrl?.replace(/\/$/, "");

    const portalConfigurationId =
      process.env.BLOOMWEBSITES_STRIPE_PORTAL_CONFIGURATION_ID?.trim() ||
      "";

    if (process.env.NODE_ENV === "production" && !portalConfigurationId) {
      return NextResponse.json(
        {
          error:
            "BloomWebsites Stripe Customer Portal is not configured.",
        },
        { status: 500 },
      );
    }

    if (!normalizedAppUrl) {
      return NextResponse.json(
        { error: "The application URL is not configured." },
        { status: 500 },
      );
    }

    const returnUrl =
      `${normalizedAppUrl}/dashboard/websites/launch` +
      `?website=${encodeURIComponent(websiteId)}` +
      `&billing=plan-updated`;

    /*
     * Stripe's subscription_update_confirm portal flow is intentional here.
     * Stripe shows the customer the exact upcoming invoice / proration impact
     * before the change is confirmed and also handles payment failures and
     * 3D Secure if the plan change generates a charge.
     *
     * The target Price must be allowed by the active Stripe Customer Portal
     * subscription-update configuration.
     */
    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: customerId,
        ...(portalConfigurationId
          ? { configuration: portalConfigurationId }
          : {}),
        return_url: returnUrl,
        flow_data: {
          type: "subscription_update_confirm",
          after_completion: {
            type: "redirect",
            redirect: {
              return_url: returnUrl,
            },
          },
          subscription_update_confirm: {
            subscription: subscription.id,
            items: [
              {
                id: item.id,
                price: targetPriceId,
                quantity: 1,
              },
            ],
          },
        },
      });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error(
      "BLOOMWEBSITES PLAN CHANGE ERROR:",
      error,
    );

    const stripeMessage =
      typeof error?.message === "string"
        ? error.message
        : "";

    if (
      stripeMessage.includes("portal") ||
      stripeMessage.includes("price") ||
      stripeMessage.includes("configuration")
    ) {
      return NextResponse.json(
        {
          error:
            "Stripe Customer Portal is not yet configured to allow this BloomWebsites price change.",
          code: "PORTAL_PLAN_CHANGE_NOT_CONFIGURED",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Unable to open the BloomWebsites plan change.",
      },
      { status: 500 },
    );
  }
}
