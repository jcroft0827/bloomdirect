import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getBloomWebsiteMerchantReadiness } from "@/lib/bloom-websites/payments/getBloomWebsiteMerchantReadiness";
import BloomWebsite from "@/models/BloomWebsite";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDB();

  const website = await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id")
    .lean<any>();

  if (!website) {
    return NextResponse.json(
      { error: "BloomWebsite not found." },
      { status: 404 },
    );
  }

  const readiness = await getBloomWebsiteMerchantReadiness({
    websiteId: String(website._id),
  });

  return NextResponse.json(readiness);
}
