import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
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
        .select("_id billing.customerId")
        .lean<any>(),
      Shop.findById(session.user.id)
        .select("_id isSuspended stripe.customerId")
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

    const customerId =
      website.billing?.customerId ||
      shop.stripe?.customerId ||
      "";

    if (!customerId) {
      return NextResponse.json(
        { error: "No Stripe billing account was found." },
        { status: 400 },
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

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: customerId,
        ...(portalConfigurationId
          ? { configuration: portalConfigurationId }
          : {}),
        return_url:
          `${normalizedAppUrl}/dashboard/websites/launch` +
          `?website=${encodeURIComponent(websiteId)}`,
      });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error: any) {
    console.error(
      "BLOOMWEBSITES BILLING PORTAL ERROR:",
      error,
    );

    return NextResponse.json(
      { error: "Unable to open BloomWebsites billing." },
      { status: 500 },
    );
  }
}
