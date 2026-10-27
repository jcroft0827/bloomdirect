import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";

export async function GET(
  request: Request,
  context: { params: Promise<{ previewSlug: string }> },
) {
  const { previewSlug } = await context.params;
  const slug = previewSlug.trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });

  await connectToDB();
  const website = await BloomWebsite.findOne({ previewSlug: slug })
    .select("shop status customDomain domainVerified taxSettings.tipsEnabled taxSettings.suggestedTipPercentages")
    .lean<{
      shop: unknown;
      status?: "preview" | "live" | "paused";
      customDomain?: string;
      domainVerified?: boolean;
      taxSettings?: { tipsEnabled?: boolean; suggestedTipPercentages?: number[] };
    }>();

  if (!website) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
  const access = await authorizeBloomWebsiteStorefrontAccess(request, website);
  if (!access.allowed) return access.response;

  const suggestedPercentages = Array.isArray(website.taxSettings?.suggestedTipPercentages)
    ? website.taxSettings.suggestedTipPercentages
        .filter((value): value is number => Number.isFinite(value) && value > 0 && value <= 100)
        .slice(0, 5)
    : [10, 15, 20];

  return NextResponse.json(
    {
      enabled: website.taxSettings?.tipsEnabled !== false,
      suggestedPercentages,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
