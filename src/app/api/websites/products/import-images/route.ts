import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import {
  type CatalogImageMigrationKind,
  migrateCatalogImageToBloom,
} from "@/lib/bloom-websites/catalogImageMigration";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

export const runtime = "nodejs";

const MAX_IMAGES_PER_BATCH = 4;
const PRODUCT_SCAN_LIMIT = 20;

type StoredMigrationItem = {
  kind: CatalogImageMigrationKind;
  url: string;
  status: "pending" | "failed";
  error?: string;
};

type MigrationStatus = {
  pendingImageCount: number;
  failedImageCount: number;
  pendingProductCount: number;
  failedProductCount: number;
  failedExamples: Array<{
    productName: string;
    error: string;
  }>;
};

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Image migration failed.";
  return message.trim().slice(0, 500) || "Image migration failed.";
}

async function getOwnedWebsite(shopId: string) {
  return await BloomWebsite.findOne({ shop: shopId }).select("_id");
}

async function getMigrationStatus(
  shopId: string,
  websiteId: unknown,
): Promise<MigrationStatus> {
  const products = (await BloomWebsiteProduct.find({
    shop: shopId,
    website: websiteId,
    "importImageMigration.items.0": { $exists: true },
  })
    .select("name importImageMigration.items")
    .lean()) as unknown as Array<{
    name?: string;
    importImageMigration?: {
      items?: StoredMigrationItem[];
    };
  }>;

  let pendingImageCount = 0;
  let failedImageCount = 0;
  let pendingProductCount = 0;
  let failedProductCount = 0;
  const failedExamples: MigrationStatus["failedExamples"] = [];

  for (const product of products) {
    const items = Array.isArray(product.importImageMigration?.items)
      ? product.importImageMigration!.items!
      : [];
    const pending = items.filter((item) => item.status === "pending").length;
    const failed = items.filter((item) => item.status === "failed").length;

    pendingImageCount += pending;
    failedImageCount += failed;
    if (pending > 0) pendingProductCount += 1;
    if (failed > 0) failedProductCount += 1;

    if (failedExamples.length < 5) {
      for (const item of items) {
        if (item.status !== "failed") continue;
        failedExamples.push({
          productName: String(product.name || "Product").trim() || "Product",
          error: String(item.error || "Image could not be copied.").trim(),
        });
        if (failedExamples.length >= 5) break;
      }
    }
  }

  return {
    pendingImageCount,
    failedImageCount,
    pendingProductCount,
    failedProductCount,
    failedExamples,
  };
}

function applyMigratedUrl(
  product: any,
  kind: CatalogImageMigrationKind,
  migratedUrl: string,
) {
  if (kind === "primary") {
    if (!String(product.imageUrl || "").trim()) {
      product.imageUrl = migratedUrl;
    }
    return;
  }

  if (kind === "gallery") {
    const current = Array.isArray(product.galleryImages)
      ? product.galleryImages.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!current.includes(migratedUrl)) {
      current.push(migratedUrl);
      const maxGalleryImages = String(product.imageUrl || "").trim() ? 7 : 8;
      product.galleryImages = current.slice(0, maxGalleryImages);
    }
    return;
  }

  if (kind === "social") {
    if (!String(product.seo?.socialImageUrl || "").trim()) {
      product.seo = product.seo || {};
      product.seo.socialImageUrl = migratedUrl;
    }
    return;
  }

  const labelByKind: Partial<Record<CatalogImageMigrationKind, string>> = {
    standardTier: "standard",
    deluxeTier: "deluxe",
    premiumTier: "premium",
  };
  const label = labelByKind[kind];
  if (!label || !Array.isArray(product.pricingTiers)) return;

  const tier = product.pricingTiers.find(
    (entry: { label?: string }) => entry.label === label,
  );

  if (tier && !String(tier.imageUrl || "").trim()) {
    tier.imageUrl = migratedUrl;
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDB();
    const website = await getOwnedWebsite(session.user.id);

    if (!website) {
      return NextResponse.json(
        { error: "Create your BloomWebsite before migrating images." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      ...(await getMigrationStatus(session.user.id, website._id)),
    });
  } catch (error) {
    console.error("BloomWebsite catalog image migration status failed:", error);
    return NextResponse.json(
      { error: "Unable to check catalog image migration status." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as {
      action?: unknown;
    };
    const action = body.action === "retryFailed" ? "retryFailed" : "process";

    await connectToDB();
    const website = await getOwnedWebsite(session.user.id);

    if (!website) {
      return NextResponse.json(
        { error: "Create your BloomWebsite before migrating images." },
        { status: 404 },
      );
    }

    if (action === "retryFailed") {
      await BloomWebsiteProduct.updateMany(
        {
          shop: session.user.id,
          website: website._id,
          "importImageMigration.items.status": "failed",
        },
        {
          $set: {
            "importImageMigration.items.$[item].status": "pending",
            "importImageMigration.items.$[item].error": "",
            "importImageMigration.status": "pending",
            "importImageMigration.failedCount": 0,
            "importImageMigration.lastError": "",
            "importImageMigration.updatedAt": new Date(),
          },
        },
        {
          arrayFilters: [{ "item.status": "failed" }],
        },
      );

      return NextResponse.json({
        success: true,
        retried: true,
        ...(await getMigrationStatus(session.user.id, website._id)),
      });
    }

    const products = await BloomWebsiteProduct.find({
      shop: session.user.id,
      website: website._id,
      "importImageMigration.items.status": "pending",
    })
      .sort({ createdAt: 1, _id: 1 })
      .limit(PRODUCT_SCAN_LIMIT);

    type WorkItem = {
      product: any;
      itemIndex: number;
      item: StoredMigrationItem;
    };

    const work: WorkItem[] = [];

    for (const product of products) {
      const items = Array.isArray(product.importImageMigration?.items)
        ? (product.importImageMigration.items as StoredMigrationItem[])
        : [];

      for (let index = 0; index < items.length; index += 1) {
        if (items[index]?.status !== "pending") continue;
        work.push({ product, itemIndex: index, item: items[index] });
        if (work.length >= MAX_IMAGES_PER_BATCH) break;
      }

      if (work.length >= MAX_IMAGES_PER_BATCH) break;
    }

    if (work.length === 0) {
      return NextResponse.json({
        success: true,
        processedImageCount: 0,
        migratedThisBatch: 0,
        failedThisBatch: 0,
        ...(await getMigrationStatus(session.user.id, website._id)),
      });
    }

    const migrationCache = new Map<string, Promise<string>>();
    const migrate = (sourceUrl: string) => {
      const cached = migrationCache.get(sourceUrl);
      if (cached) return cached;

      const pending = migrateCatalogImageToBloom({
        sourceUrl,
        shopId: session.user.id,
      });
      migrationCache.set(sourceUrl, pending);
      return pending;
    };

    const results = await Promise.all(
      work.map(async (entry) => {
        try {
          return {
            ...entry,
            ok: true as const,
            migratedUrl: await migrate(entry.item.url),
          };
        } catch (error) {
          return {
            ...entry,
            ok: false as const,
            error: safeErrorMessage(error),
          };
        }
      }),
    );

    const resultsByProduct = new Map<string, typeof results>();

    for (const result of results) {
      const productId = String(result.product._id);
      const current = resultsByProduct.get(productId) || [];
      current.push(result);
      resultsByProduct.set(productId, current);
    }

    let migratedThisBatch = 0;
    let failedThisBatch = 0;

    for (const product of products) {
      const productResults = resultsByProduct.get(String(product._id));
      if (!productResults?.length) continue;

      const successfulIndexes = new Set<number>();

      for (const result of productResults) {
        const storedItem = product.importImageMigration.items[result.itemIndex];
        if (!storedItem || storedItem.status !== "pending") continue;

        if (result.ok) {
          applyMigratedUrl(product, result.item.kind, result.migratedUrl);
          successfulIndexes.add(result.itemIndex);
          product.importImageMigration.migratedCount =
            Number(product.importImageMigration.migratedCount || 0) + 1;
          migratedThisBatch += 1;
        } else {
          storedItem.status = "failed";
          storedItem.error = result.error;
          failedThisBatch += 1;
        }
      }

      product.importImageMigration.items = product.importImageMigration.items.filter(
        (_item: StoredMigrationItem, index: number) => !successfulIndexes.has(index),
      );

      const remaining = product.importImageMigration.items as StoredMigrationItem[];
      const pendingCount = remaining.filter((item) => item.status === "pending").length;
      const failedItems = remaining.filter((item) => item.status === "failed");

      product.importImageMigration.failedCount = failedItems.length;
      product.importImageMigration.lastError = failedItems[0]?.error || "";
      product.importImageMigration.updatedAt = new Date();

      if (pendingCount > 0) {
        product.importImageMigration.status = "pending";
      } else if (failedItems.length > 0) {
        product.importImageMigration.status =
          Number(product.importImageMigration.migratedCount || 0) > 0
            ? "partial"
            : "failed";
      } else {
        product.importImageMigration.status = "complete";
      }

      await product.save();
    }

    return NextResponse.json({
      success: true,
      processedImageCount: work.length,
      migratedThisBatch,
      failedThisBatch,
      ...(await getMigrationStatus(session.user.id, website._id)),
    });
  } catch (error) {
    console.error("BloomWebsite catalog image migration failed:", error);
    return NextResponse.json(
      { error: "Unable to migrate catalog images right now." },
      { status: 500 },
    );
  }
}
