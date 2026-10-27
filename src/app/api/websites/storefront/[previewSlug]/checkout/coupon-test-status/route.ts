import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { couponOwnerSandboxDatabaseReady } from "@/lib/bloom-websites/coupons/authorizeCouponSandboxPreparation";

/** A capability indicator, not a credential. Preparation rechecks access and test safety. */
export async function GET(request: Request, { params }: { params: Promise<{ previewSlug: string }> }) {
  const { previewSlug } = await params;
  await connectToDB();
  const website = await BloomWebsite.findOne({ previewSlug: previewSlug.trim().toLowerCase() })
    .select("_id shop status customDomain domainVerified paymentSettings.provider")
    .lean<any>();
  if (!website) return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  const access = await authorizeBloomWebsiteStorefrontAccess(request, website);
  // Do not expose whether a private test configuration exists to public users.
  if (!access.allowed || access.mode !== "owner_preview")
    return NextResponse.json({ enabled: false }, { headers: { "Cache-Control": "no-store" } });
  const checks = {
    developmentMode: process.env.NODE_ENV === "development",
    stripeTestKey: /^sk_test_[A-Za-z0-9]+$/.test(process.env.STRIPE_SECRET_KEY ?? ""),
    developmentDatabase: couponOwnerSandboxDatabaseReady(),
    stripeProvider: website.paymentSettings?.provider !== "fiserv",
  };
  return NextResponse.json({
    enabled: Object.values(checks).every(Boolean),
    checks,
  }, { headers: { "Cache-Control": "no-store" } });
}
