import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  buildBloomWebsiteReportCsv,
  isBloomWebsiteReportCsvKind,
} from "@/lib/bloom-websites/reports/bloomWebsiteReportCsv";
import {
  getBloomWebsiteReport,
  normalizeBloomWebsiteReportRange,
} from "@/lib/bloom-websites/reports/getBloomWebsiteReport";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDB();

  const [shop, website] = await Promise.all([
    Shop.findById(session.user.id)
      .select("businessName isSuspended address.timezone")
      .lean<any>(),
    BloomWebsite.findOne({ shop: session.user.id }).select("_id").lean<any>(),
  ]);

  if (!shop) {
    return NextResponse.json({ error: "Shop not found." }, { status: 404 });
  }

  if (shop.isSuspended) {
    return NextResponse.json(
      { error: "This shop account is suspended." },
      { status: 403 },
    );
  }

  if (!website) {
    return NextResponse.json(
      { error: "Create a BloomWebsite before exporting website reports." },
      { status: 404 },
    );
  }

  const params = new URL(request.url).searchParams;
  const kind = params.get("report") || "";

  if (!isBloomWebsiteReportCsvKind(kind)) {
    return NextResponse.json({ error: "Unknown report export." }, { status: 400 });
  }

  let range;

  try {
    range = normalizeBloomWebsiteReportRange({
      startDate: params.get("startDate"),
      endDate: params.get("endDate"),
      timezone: shop?.address?.timezone,
    });
  } catch {
    return NextResponse.json(
      { error: "The report date range is invalid." },
      { status: 400 },
    );
  }

  const report = await getBloomWebsiteReport({
    shopId: session.user.id,
    range,
  });

  const csv = buildBloomWebsiteReportCsv(report, kind);
  const safeShopName = String(shop.businessName || "bloomwebsite")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "bloomwebsite";
  const rangeLabel = `${range.startDate || "all"}-${range.endDate || "all"}`;

  return new Response(`\uFEFF${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeShopName}-${kind}-${rangeLabel}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
