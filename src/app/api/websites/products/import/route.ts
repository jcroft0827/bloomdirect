import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  type CatalogCsvMapping,
  type CatalogCsvRow,
  normalizeCatalogImportRow,
} from "@/lib/bloom-websites/catalogCsv";
import {
  type CatalogImageMigrationItem,
  isBloomHostedImageUrl,
} from "@/lib/bloom-websites/catalogImageMigration";
import { parseBloomWebsiteProductRecipe } from "@/lib/bloom-websites/productRecipes";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

const MAX_IMPORT_ROWS = 2500;

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function prepareImportedImage(
  sourceUrl: string,
  kind: CatalogImageMigrationItem["kind"],
  migrationItems: CatalogImageMigrationItem[],
) {
  const source = sourceUrl.trim();
  if (!source) return "";

  if (isBloomHostedImageUrl(source)) {
    return source;
  }

  migrationItems.push({
    kind,
    url: source,
    status: "pending",
  });

  return "";
}

function makeUniqueSlug(name: string, occupied: Set<string>) {
  const base = slugify(name) || "product";
  let slug = base;
  let suffix = 2;

  while (occupied.has(slug)) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  occupied.add(slug);
  return slug;
}

type ImportBody = {
  rows?: unknown;
  mapping?: unknown;
  skipInvalidRows?: unknown;
  skipExistingSkus?: unknown;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json()) as ImportBody;
    const rows = Array.isArray(body.rows) ? (body.rows as CatalogCsvRow[]) : [];
    const mapping =
      body.mapping && typeof body.mapping === "object"
        ? (body.mapping as CatalogCsvMapping)
        : {};

    if (rows.length === 0) {
      return NextResponse.json(
        { error: "There are no CSV rows to import." },
        { status: 400 },
      );
    }

    if (rows.length > MAX_IMPORT_ROWS) {
      return NextResponse.json(
        {
          error: `Import up to ${MAX_IMPORT_ROWS.toLocaleString()} products at a time.`,
        },
        { status: 400 },
      );
    }

    if (!mapping.name || !mapping.standardPrice) {
      return NextResponse.json(
        { error: "Map both Product Name and Standard Price before importing." },
        { status: 400 },
      );
    }

    const validations = rows.map((row, index) =>
      normalizeCatalogImportRow(row, mapping, index + 2),
    );

    const invalid = validations
      .map((validation, index) => ({ validation, index }))
      .filter(({ validation }) => !validation.valid);

    const skipInvalidRows = body.skipInvalidRows === true;

    if (invalid.length > 0 && !skipInvalidRows) {
      return NextResponse.json(
        {
          error: `${invalid.length} CSV row${invalid.length === 1 ? " needs" : "s need"} attention before import.`,
          invalidRows: invalid.slice(0, 50).map(({ validation, index }) => ({
            rowNumber: index + 2,
            errors: validation.errors,
          })),
        },
        { status: 400 },
      );
    }

    const normalizedRows = validations
      .filter((validation) => validation.valid && validation.normalized)
      .map((validation) => validation.normalized!);

    await connectToDB();

    const website = await BloomWebsite.findOne({
      shop: session.user.id,
    }).select("_id");

    if (!website) {
      return NextResponse.json(
        { error: "Create your BloomWebsite before importing products." },
        { status: 404 },
      );
    }

    const existingProducts = (await BloomWebsiteProduct.find({
      website: website._id,
      shop: session.user.id,
    })
      .select("slug sku sortOrder")
      .lean()) as unknown as Array<{
      slug?: string;
      sku?: string;
      sortOrder?: number;
    }>;

    const occupiedSlugs = new Set(
      existingProducts.map((product) => product.slug || "").filter(Boolean),
    );
    const existingSkus = new Set(
      existingProducts
        .map((product) => product.sku?.trim().toLowerCase() || "")
        .filter(Boolean),
    );

    const importSkus = new Set<string>();
    const skipExistingSkus = body.skipExistingSkus !== false;
    let skippedDuplicates = 0;

    const maxExistingSortOrder = existingProducts.reduce(
      (max, product) => Math.max(max, product.sortOrder ?? 0),
      0,
    );
    let nextSortOrder = maxExistingSortOrder + 1;

    const documents = [];
    let pendingImageCount = 0;

    for (const product of normalizedRows) {
      const normalizedSku = product.sku.trim().toLowerCase();

      if (
        skipExistingSkus &&
        normalizedSku &&
        (existingSkus.has(normalizedSku) || importSkus.has(normalizedSku))
      ) {
        skippedDuplicates += 1;
        continue;
      }

      if (normalizedSku) importSkus.add(normalizedSku);

      const imageMigrationItems: CatalogImageMigrationItem[] = [];
      const importedPrimaryImageUrl = prepareImportedImage(
        product.imageUrl,
        "primary",
        imageMigrationItems,
      );
      const importedGalleryImages = product.galleryImages
        .map((sourceUrl) =>
          prepareImportedImage(sourceUrl, "gallery", imageMigrationItems),
        )
        .filter(Boolean);
      const standardTierImageUrl = prepareImportedImage(
        product.standardTierImageUrl,
        "standardTier",
        imageMigrationItems,
      );
      const deluxeTierImageUrl =
        product.deluxePrice !== null
          ? prepareImportedImage(
              product.deluxeTierImageUrl,
              "deluxeTier",
              imageMigrationItems,
            )
          : "";
      const premiumTierImageUrl =
        product.premiumPrice !== null
          ? prepareImportedImage(
              product.premiumTierImageUrl,
              "premiumTier",
              imageMigrationItems,
            )
          : "";
      const socialImageUrl = prepareImportedImage(
        product.socialImageUrl,
        "social",
        imageMigrationItems,
      );

      pendingImageCount += imageMigrationItems.length;

      const pricingTiers = [
        {
          label: "standard",
          price: product.standardPrice,
          description: product.standardTierDescription,
          imageUrl: standardTierImageUrl,
          recipe: parseBloomWebsiteProductRecipe(product.standardRecipe),
          enabled: true,
        },
      ];

      if (product.deluxePrice !== null) {
        pricingTiers.push({
          label: "deluxe",
          price: product.deluxePrice,
          description: product.deluxeTierDescription,
          imageUrl: deluxeTierImageUrl,
          recipe: parseBloomWebsiteProductRecipe(product.deluxeRecipe),
          enabled: true,
        });
      }

      if (product.premiumPrice !== null) {
        pricingTiers.push({
          label: "premium",
          price: product.premiumPrice,
          description: product.premiumTierDescription,
          imageUrl: premiumTierImageUrl,
          recipe: parseBloomWebsiteProductRecipe(product.premiumRecipe),
          enabled: true,
        });
      }

      documents.push({
        shop: session.user.id,
        website: website._id,
        name: product.name,
        slug: makeUniqueSlug(product.name, occupiedSlugs),
        sku: product.sku,
        shortDescription: product.shortDescription,
        description: product.description,
        category: product.category,
        occasions: product.occasions,
        tags: product.tags,
        imageUrl: importedPrimaryImageUrl,
        galleryImages: importedGalleryImages,
        pricingTiers,
        taxable: product.taxable,
        taxRatePercent: product.taxRatePercent,
        inventory: {
          trackInventory: product.trackInventory,
          quantity: product.inventoryQuantity,
        },
        availability: {
          type: product.availabilityType,
          startDate: product.availabilityStartDate,
          endDate: product.availabilityEndDate,
        },
        seo: {
          title: product.seoTitle,
          description: product.seoDescription,
          imageAltText: product.imageAltText,
          allowIndexing: product.allowIndexing,
          canonicalUrl: product.canonicalUrl,
          socialTitle: product.socialTitle,
          socialDescription: product.socialDescription,
          socialImageUrl,
        },
        importImageMigration: {
          status: imageMigrationItems.length > 0 ? "pending" : "none",
          items: imageMigrationItems,
          migratedCount: 0,
          failedCount: 0,
          lastError: "",
          updatedAt: imageMigrationItems.length > 0 ? new Date() : null,
        },
        allowsSubstitutions: product.allowsSubstitutions,
        localOnly: product.localOnly,
        isActive: product.isActive,
        isFeatured: product.isFeatured,
        soldOut: product.soldOut,
        sortOrder:
          product.sortOrder !== null ? product.sortOrder : nextSortOrder++,
      });
    }

    if (documents.length > 0) {
      await BloomWebsiteProduct.insertMany(documents, { ordered: true });
    }

    return NextResponse.json({
      success: true,
      importedCount: documents.length,
      skippedDuplicateCount: skippedDuplicates,
      skippedInvalidCount: invalid.length,
      totalRows: rows.length,
      pendingImageCount,
    });
  } catch (error) {
    console.error("BloomWebsite catalog import failed:", error);

    return NextResponse.json(
      { error: "Unable to import the product catalog." },
      { status: 500 },
    );
  }
}
