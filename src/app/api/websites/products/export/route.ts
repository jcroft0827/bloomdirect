import { getServerSession } from "next-auth";

import authOptions from "@/lib/auth";
import {
  BLOOM_CATALOG_EXPORT_HEADERS,
  csvEscape,
} from "@/lib/bloom-websites/catalogCsv";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

function dateOnly(value: unknown) {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function safeFilename(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "bloomwebsite"
  );
}

function yesNo(value: unknown) {
  return value === true ? "Yes" : "No";
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const url = new URL(request.url);
  const templateOnly = url.searchParams.get("template") === "1";

  if (templateOnly) {
    const csv = `${BLOOM_CATALOG_EXPORT_HEADERS.map(csvEscape).join(",")}\r\n`;

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="bloomwebsites-product-import-template.csv"',
        "Cache-Control": "no-store",
      },
    });
  }

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id siteName")
    .lean()) as { _id: unknown; siteName?: string } | null;

  if (!website) {
    return new Response("BloomWebsite not found.", { status: 404 });
  }

  const products = (await BloomWebsiteProduct.find({
    website: website._id,
    shop: session.user.id,
  })
    .sort({ sortOrder: 1, createdAt: 1 })
    .lean()) as unknown as Array<Record<string, any>>;

  const lines = [BLOOM_CATALOG_EXPORT_HEADERS.map(csvEscape).join(",")];

  for (const product of products) {
    const tiers = new Map(
      (Array.isArray(product.pricingTiers) ? product.pricingTiers : []).map(
        (tier: Record<string, any>) => [tier.label, tier],
      ),
    );

    const standard = tiers.get("standard") || {};
    const deluxe = tiers.get("deluxe") || {};
    const premium = tiers.get("premium") || {};

    const values = [
      product.name || "",
      product.sku || "",
      product.category || "",
      product.shortDescription || "",
      product.description || "",
      typeof standard.price === "number" ? standard.price.toFixed(2) : "",
      deluxe.enabled !== false && typeof deluxe.price === "number"
        ? deluxe.price.toFixed(2)
        : "",
      premium.enabled !== false && typeof premium.price === "number"
        ? premium.price.toFixed(2)
        : "",
      standard.description || "",
      deluxe.description || "",
      premium.description || "",
      standard.imageUrl || "",
      deluxe.imageUrl || "",
      premium.imageUrl || "",
      standard.recipe ? JSON.stringify(standard.recipe) : "",
      deluxe.recipe ? JSON.stringify(deluxe.recipe) : "",
      premium.recipe ? JSON.stringify(premium.recipe) : "",
      product.imageUrl || "",
      Array.isArray(product.galleryImages) ? product.galleryImages.join(" | ") : "",
      yesNo(product.taxable !== false),
      typeof product.taxRatePercent === "number" ? product.taxRatePercent : "",
      yesNo(product.inventory?.trackInventory === true),
      product.inventory?.trackInventory === true
        ? product.inventory?.quantity ?? 0
        : "",
      product.availability?.type || "always",
      dateOnly(product.availability?.startDate),
      dateOnly(product.availability?.endDate),
      Array.isArray(product.occasions) ? product.occasions.join(" | ") : "",
      Array.isArray(product.tags) ? product.tags.join(" | ") : "",
      yesNo(product.allowsSubstitutions !== false),
      yesNo(product.localOnly !== false),
      yesNo(product.isActive !== false),
      yesNo(product.isFeatured === true),
      yesNo(product.soldOut === true),
      typeof product.sortOrder === "number" ? product.sortOrder : "",
      product.seo?.title || "",
      product.seo?.description || "",
      product.seo?.imageAltText || "",
      yesNo(product.seo?.allowIndexing !== false),
      product.seo?.canonicalUrl || "",
      product.seo?.socialTitle || "",
      product.seo?.socialDescription || "",
      product.seo?.socialImageUrl || "",
    ];

    lines.push(values.map(csvEscape).join(","));
  }

  const siteName = website.siteName || "BloomWebsite";
  const today = new Date().toISOString().slice(0, 10);
  const filename = `${safeFilename(siteName)}-catalog-${today}.csv`;
  const csv = `\uFEFF${lines.join("\r\n")}\r\n`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
