import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteCoupon from "@/models/BloomWebsiteCoupon";

type Payload = Record<string, unknown>;

const error = (message: string, status = 400) => NextResponse.json({ error: message }, { status });
const codePattern = /^[A-Z0-9][A-Z0-9_-]{2,31}$/;

function dateOrNull(value: unknown): Date | null | "invalid" {
  if (value === null || value === "") return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "invalid";
  const result = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0,10) !== value) return "invalid";
  return result;
}

function serialize(coupon: any) {
  return {
    id: coupon._id.toString(), code: coupon.code, description: coupon.description || "",
    discountType: coupon.discountType, amount: coupon.amount,
    minimumMerchandiseCents: coupon.minimumMerchandiseCents || 0,
    startsAt: coupon.startsAt ? new Date(coupon.startsAt).toISOString().slice(0, 10) : "",
    expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 10) : "",
    usageLimit: coupon.usageLimit ?? null, redemptionCount: coupon.redemptionCount || 0,
    isActive: coupon.isActive === true,
  };
}

async function tenant() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  await connectToDB();
  const website = await BloomWebsite.findOne({ shop: session.user.id }).select("_id").lean<{_id: {toString(): string}}>();
  if (!website) return null;
  return { shop: session.user.id, website: website._id };
}

function validate(body: Payload) {
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!codePattern.test(code)) return { error: "Use a 3–32 character code with letters, numbers, underscores, or hyphens." } as const;
  if (description.length > 240) return { error: "Description is too long." } as const;
  if (body.discountType !== "percentage" && body.discountType !== "fixed") return { error: "Choose a discount type." } as const;
  const amount = body.amount;
  if (typeof amount !== "number" || !Number.isSafeInteger(amount) || amount < 1 ||
      (body.discountType === "percentage" && amount > 10000) ||
      (body.discountType === "fixed" && amount > 100000000)) return { error: "Discount amount is invalid." } as const;
  const minimum = body.minimumMerchandiseCents;
  if (typeof minimum !== "number" || !Number.isSafeInteger(minimum) || minimum < 0 || minimum > 100000000) return { error: "Minimum merchandise amount is invalid." } as const;
  const startsAt = dateOrNull(body.startsAt);
  const expiresAt = dateOrNull(body.expiresAt);
  if (startsAt === "invalid" || expiresAt === "invalid" ||
      (startsAt && expiresAt && expiresAt.getTime() < startsAt.getTime())) return { error: "Promotion dates are invalid." } as const;
  const usageLimit = body.usageLimit === null ? null : body.usageLimit;
  if (usageLimit !== null && (typeof usageLimit !== "number" || !Number.isSafeInteger(usageLimit) || usageLimit < 1 || usageLimit > 10000000)) return { error: "Usage limit is invalid." } as const;
  if (typeof body.isActive !== "boolean") return { error: "Active status is invalid." } as const;
  return { data: { code, description, discountType: body.discountType, amount, minimumMerchandiseCents: minimum, startsAt, expiresAt, usageLimit, isActive: body.isActive } } as const;
}

export async function GET() {
  const owner = await tenant();
  if (!owner) return error("Unauthorized or website not found.", 401);
  const coupons = await BloomWebsiteCoupon.find(owner).sort({ createdAt: -1 }).limit(250).lean();
  return NextResponse.json({ coupons: coupons.map(serialize), checkoutEnabled: false });
}

export async function POST(request: Request) {
  const owner = await tenant();
  if (!owner) return error("Unauthorized or website not found.", 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("Invalid request.");
  const parsed = validate(body as Payload);
  if (parsed.data === undefined) return error(parsed.error ?? "Invalid coupon settings.");
  try {
    const count = await BloomWebsiteCoupon.countDocuments(owner);
    if (count >= 250) return error("Coupon limit reached.");
    const coupon = await BloomWebsiteCoupon.create({ ...owner, ...parsed.data });
    return NextResponse.json({ coupon: serialize(coupon) }, { status: 201 });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && e.code === 11000) return error("This code already exists for your website.", 409);
    return error("Could not create coupon.", 500);
  }
}

export async function PATCH(request: Request) {
  const owner = await tenant();
  if (!owner) return error("Unauthorized or website not found.", 401);
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) return error("Invalid request.");
  const record = body as Payload;
  if (typeof record.id !== "string" || !/^[0-9a-fA-F]{24}$/.test(record.id)) return error("Invalid coupon ID.");
  const parsed = validate(record);
  if (parsed.data === undefined) return error(parsed.error ?? "Invalid coupon settings.");
  const existing = await BloomWebsiteCoupon.findOne({ ...owner, _id: record.id });
  if (!existing) return error("Coupon not found.", 404);
  if (existing.redemptionCount > 0 && (existing.code !== parsed.data.code || existing.discountType !== parsed.data.discountType || existing.amount !== parsed.data.amount)) {
    return error("Used coupons cannot change their code, discount type, or amount.");
  }
  if (parsed.data.usageLimit !== null && existing.redemptionCount > parsed.data.usageLimit) return error("Limit cannot be below existing uses.");
  try {
    Object.assign(existing, parsed.data);
    await existing.save();
    return NextResponse.json({ coupon: serialize(existing) });
  } catch (e: unknown) {
    if (typeof e === "object" && e && "code" in e && e.code === 11000) return error("This code already exists for your website.", 409);
    return error("Could not update coupon.", 500);
  }
}

export async function DELETE(request: Request) {
  const owner = await tenant();
  if (!owner) return error("Unauthorized or website not found.", 401);
  const body = await request.json().catch(() => null);
  const id = body && typeof body.id === "string" ? body.id : "";
  if (!/^[0-9a-fA-F]{24}$/.test(id)) return error("Invalid coupon ID.");
  const coupon = await BloomWebsiteCoupon.findOne({ ...owner, _id: id });
  if (!coupon) return error("Coupon not found.", 404);
  if (coupon.redemptionCount > 0) return error("Used coupons must be deactivated, not deleted.");
  await BloomWebsiteCoupon.deleteOne({ ...owner, _id: id, redemptionCount: 0 });
  return NextResponse.json({ ok: true });
}
