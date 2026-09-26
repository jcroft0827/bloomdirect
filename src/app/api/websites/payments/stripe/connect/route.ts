import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  createBloomWebsiteStripeOnboardingLink,
  resolveBloomStripeReturnOrigin,
} from "@/lib/bloom-websites/payments/stripeConnect";
import { BloomMerchantReadinessError } from "@/lib/bloom-websites/payments/getBloomWebsiteMerchantReadiness";
import BloomWebsite from "@/models/BloomWebsite";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await connectToDB();

    const website = await BloomWebsite.findOne({ shop: session.user.id })
      .select("_id")
      .lean<any>();

    if (!website) {
      return NextResponse.json(
        { error: "BloomWebsite not found." },
        { status: 404 },
      );
    }

    const result = await createBloomWebsiteStripeOnboardingLink({
      websiteId: String(website._id),
      shopId: session.user.id,
      origin: resolveBloomStripeReturnOrigin(request),
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof BloomMerchantReadinessError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    console.error("Unable to start Stripe Connect onboarding:", error);
    return NextResponse.json(
      { error: "Stripe onboarding could not be started." },
      { status: 500 },
    );
  }
}
