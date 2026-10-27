import { NextResponse } from "next/server";
import { authorizeBloomWebsiteStorefrontAccess } from "@/lib/bloom-websites/authorizeBloomWebsiteStorefrontAccess";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { evaluateCoupon, normalizeCouponCode } from "@/lib/bloom-websites/coupons/evaluateCoupon";
import { BloomWebsiteCartValidationError, validateBloomWebsiteCart, type BloomWebsiteCartValidationItemInput } from "@/lib/bloom-websites/validateBloomWebsiteCart";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteCoupon from "@/models/BloomWebsiteCoupon";

export async function POST(request: Request, { params }: { params: Promise<{ previewSlug: string }> }) {
  const { previewSlug } = await params;
  const slug = previewSlug.trim().toLowerCase();
  if (!slug) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
  const body: unknown = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body))
    return NextResponse.json({ error: "Invalid coupon request." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const code = typeof input.code === "string" ? normalizeCouponCode(input.code) : null;
  if (!code || !Array.isArray(input.items) || input.items.length === 0 || input.items.length > 50)
    return NextResponse.json({ error: "Enter a valid coupon code and cart." }, { status: 400 });
  const items: BloomWebsiteCartValidationItemInput[] = [];
  for (const item of input.items) {
    if (!item || typeof item !== "object" || Array.isArray(item))
      return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
    const row = item as Record<string, unknown>;
    if (typeof row.productId !== "string" || !["standard", "deluxe", "premium"].includes(String(row.tier)) || typeof row.quantity !== "number" || !Number.isInteger(row.quantity) || row.quantity < 1 || row.quantity > 100)
      return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
    if (row.addonIds !== undefined && (!Array.isArray(row.addonIds) || row.addonIds.some((id: unknown) => typeof id !== "string")))
      return NextResponse.json({ error: "Invalid cart." }, { status: 400 });
    items.push({ productId: row.productId, tier: row.tier as "standard" | "deluxe" | "premium", quantity: Number(row.quantity), addonIds: (row.addonIds as string[] | undefined) ?? [] });
  }
  try {
    await connectToDB();
    const website = await BloomWebsite.findOne({ previewSlug: slug })
      .select("_id shop status customDomain domainVerified")
      .lean<{ _id: unknown; shop: unknown; status?: "preview" | "live" | "paused"; customDomain?: string; domainVerified?: boolean }>();
    if (!website) return NextResponse.json({ error: "Storefront not found." }, { status: 404 });
    const access = await authorizeBloomWebsiteStorefrontAccess(request, website);
    if (!access.allowed) return access.response;
    const rate = await checkBloomWebsiteRateLimit({ request, scope: "storefront-coupon-preview", subject: slug, limit: 15 });
    if (!rate.allowed) return NextResponse.json({ error: "Too many coupon checks. Try again shortly." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
    const cart = await validateBloomWebsiteCart({ previewSlug: slug, items, requestedDate: typeof input.requestedDate === "string" ? input.requestedDate : undefined });
    const coupon = await BloomWebsiteCoupon.findOne({ shop: website.shop, website: website._id, code }).lean<any>();
    if (!coupon) return NextResponse.json({ error: "This code is unavailable for this order." }, { status: 409 });
    const result = evaluateCoupon({ coupon, code, merchandiseSubtotalCents: cart.subtotalCents });
    if (!result.ok) return NextResponse.json({ error: "This code is unavailable for this order." }, { status: 409 });
    const activeReservations = Array.isArray(coupon.reservations) ? coupon.reservations.length : 0;
    if (coupon.usageLimit != null && coupon.redemptionCount + activeReservations >= coupon.usageLimit)
      return NextResponse.json({ error: "This code is currently unavailable." }, { status: 409 });
    return NextResponse.json({ valid: true, code: result.code, discountCents: result.discountCents, merchandiseAfterDiscountCents: result.merchandiseAfterDiscountCents, previewOnly: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof BloomWebsiteCartValidationError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Coupon preview failed:", error);
    return NextResponse.json({ error: "Unable to check coupon at this time." }, { status: 500 });
  }
}
