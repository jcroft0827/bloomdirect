import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  createBloomWebsiteStripeOnboardingLink,
  resolveBloomStripeReturnOrigin,
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
    const result = await createBloomWebsiteStripeOnboardingLink({
      websiteId: String(website._id),
      shopId: session.user.id,
      origin,
    });

    return NextResponse.redirect(result.url);
  } catch (error) {
    console.error("Unable to refresh Stripe Connect link:", error);

    return NextResponse.redirect(
      new URL(
        "/dashboard/settings?stripe=error#website-payments",
        origin,
      ),
    );
  }
}
