import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { stripe } from "@/lib/stripe/stripe";
import Shop from "@/models/Shop";

export async function POST() {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const shop = await Shop.findById(session.user.id).select(
      "_id isSuspended stripe.customerId",
    );

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "This account cannot manage billing.",
        },
        { status: 403 },
      );
    }

    if (!shop.stripe?.customerId) {
      return NextResponse.json(
        {
          error: "No Stripe billing account was found.",
        },
        { status: 400 },
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

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: shop.stripe.customerId,
        return_url: `${normalizedAppUrl}/dashboard/upgrade`,
      });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error("BILLING PORTAL ERROR:", error);

    if (
      error?.type === "StripeInvalidRequestError" &&
      error?.code === "resource_missing"
    ) {
      return NextResponse.json(
        {
          error:
            "The saved Stripe customer could not be found in the current Stripe environment.",
          code: "STRIPE_CUSTOMER_NOT_FOUND",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error: "Unable to open billing management.",
      },
      { status: 500 },
    );
  }
}