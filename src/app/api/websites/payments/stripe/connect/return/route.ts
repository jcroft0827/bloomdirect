import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  resolveBloomStripeReturnOrigin,
  syncBloomWebsiteStripeConnection,
} from "@/lib/bloom-websites/payments/stripeConnect";
import BloomWebsite from "@/models/BloomWebsite";

export async function GET(request: Request) {
  const origin = resolveBloomStripeReturnOrigin(request);
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", origin));
  }

  await connectToDB();

  const website = await BloomWebsite.findOne({ shop: session.user.id })
    .select("_id")
    .lean<any>();

  if (!website) {
    return NextResponse.redirect(
      new URL("/dashboard/settings?stripe=missing", origin),
    );
  }

  try {
    const connection = await syncBloomWebsiteStripeConnection({
      websiteId: String(website._id),
      shopId: session.user.id,
    });

    const state =
      connection?.status === "active" ? "connected" : "incomplete";

    return NextResponse.redirect(
      new URL(
        `/dashboard/settings?stripe=${state}#website-payments`,
        origin,
      ),
    );
  } catch (error) {
    console.error("Unable to sync Stripe after onboarding:", error);

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?stripe=error#website-payments",
        origin,
      ),
    );
  }
}
