import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteMerchantConnection from "@/models/BloomWebsiteMerchantConnection";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDB();

  const website = await BloomWebsite.findOne({ shop: session.user.id })
    .select("_id paymentSettings")
    .lean<any>();

  if (!website) {
    return NextResponse.json({ error: "BloomWebsite not found." }, { status: 404 });
  }

  const provider =
    website.paymentSettings?.provider === "fiserv" ? "fiserv" : "stripe";

  const connection = await BloomWebsiteMerchantConnection.findOne({
    website: website._id,
    shop: session.user.id,
    provider,
  })
    .select(
      "provider status providerMerchantId providerAccountId providerStoreId chargesEnabled payoutsEnabled detailsSubmitted lastSyncedAt lastError",
    )
    .lean<any>();

  return NextResponse.json({
    provider,
    connection: connection || null,
  });
}
