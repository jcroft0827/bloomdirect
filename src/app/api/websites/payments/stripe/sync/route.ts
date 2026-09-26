import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  getBloomWebsiteMerchantReadiness,
} from "@/lib/bloom-websites/payments/getBloomWebsiteMerchantReadiness";
import {
  syncBloomWebsiteStripeConnection,
} from "@/lib/bloom-websites/payments/stripeConnect";
import BloomWebsite from "@/models/BloomWebsite";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDB();

  const website = await BloomWebsite.findOne({ shop: session.user.id })
    .select("_id paymentSettings")
    .lean<any>();

  if (!website) {
    return NextResponse.json(
      { error: "BloomWebsite not found." },
      { status: 404 },
    );
  }

  if (website.paymentSettings?.provider !== "stripe") {
    return NextResponse.json(
      { error: "Stripe is not the selected payment processor." },
      { status: 409 },
    );
  }

  try {
    await syncBloomWebsiteStripeConnection({
      websiteId: String(website._id),
      shopId: session.user.id,
    });

    const readiness = await getBloomWebsiteMerchantReadiness({
      websiteId: String(website._id),
      provider: "stripe",
    });

    return NextResponse.json(readiness);
  } catch (error) {
    console.error("Unable to sync Stripe connection:", error);
    return NextResponse.json(
      { error: "Stripe connection status could not be refreshed." },
      { status: 502 },
    );
  }
}
