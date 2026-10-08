// src/app/api/admin/bloom-catalogue/[itemId]/route.ts

import mongoose from "mongoose";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectToDB } from "@/lib/mongoose";
import BloomCatalogueItem from "@/models/BloomCatalogueItem";

const MAX_ARRAY_ITEMS = 50;

type RouteContext = {
  params: Promise<{ itemId: string }>;
};

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function cleanStringArray(value: unknown, maxItemLength = 100) {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, maxItemLength))
        .filter(Boolean),
    ),
  ].slice(0, MAX_ARRAY_ITEMS);
}

function parseSuggestedSeo(value: unknown) {
  const seo =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    title: cleanString(seo.title, 70),
    description: cleanString(seo.description, 170),
    imageAltText: cleanString(seo.imageAltText, 250),
    socialTitle: cleanString(seo.socialTitle, 100),
    socialDescription: cleanString(seo.socialDescription, 250),
  };
}

function parseImage(value: unknown) {
  if (!value || typeof value !== "object") return null;

  const image = value as Record<string, unknown>;
  const originalKey = cleanString(image.originalKey, 1000);
  const originalUrl = cleanString(image.originalUrl, 2048);
  const optimizedKey = cleanString(image.optimizedKey, 1000);
  const optimizedUrl = cleanString(image.optimizedUrl, 2048);

  if (
    !originalKey.startsWith("bloom-catalogue/originals/") ||
    !optimizedKey.startsWith("bloom-catalogue/optimized/") ||
    !originalUrl ||
    !optimizedUrl
  ) {
    return null;
  }

  return {
    originalKey,
    originalUrl,
    originalMimeType: cleanString(image.originalMimeType, 100),
    originalFileSize: Math.max(0, Number(image.originalFileSize) || 0),
    optimizedKey,
    optimizedUrl,
    optimizedFileSize: Math.max(0, Number(image.optimizedFileSize) || 0),
    width: Number.isFinite(Number(image.width)) ? Math.max(1, Number(image.width)) : null,
    height: Number.isFinite(Number(image.height)) ? Math.max(1, Number(image.height)) : null,
  };
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { itemId } = await params;
    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid catalogue item." }, { status: 400 });
    }

    const body = await request.json();
    const title = cleanString(body?.title, 160);

    if (!title) {
      return NextResponse.json({ error: "Catalogue title is required." }, { status: 400 });
    }

    await connectToDB();

    const item = await BloomCatalogueItem.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Catalogue item not found." }, { status: 404 });
    }

    const nextImage = body?.image ? parseImage(body.image) : null;
    if (body?.image && !nextImage) {
      return NextResponse.json({ error: "The replacement catalogue image is invalid." }, { status: 400 });
    }

    const shortDescription = cleanString(body?.shortDescription, 240);
    const description = cleanString(body?.description, 3000);
    const category = cleanString(body?.category, 100);
    const occasions = cleanStringArray(body?.occasions);
    const tags = cleanStringArray(body?.tags);

    item.title = title;
    item.shortDescription = shortDescription;
    item.description = description;
    item.flowers = cleanStringArray(body?.flowers);
    item.colors = cleanStringArray(body?.colors);
    item.occasions = occasions;
    item.categories = category ? [category] : [];
    item.tags = tags;
    item.suggestedProduct = {
      name: title,
      shortDescription,
      description,
      category,
      occasions,
      tags,
    };
    item.suggestedSeo = parseSuggestedSeo(body?.suggestedSeo);
    item.isDesignerChoice = body?.isDesignerChoice === true;
    item.isActive = body?.isActive !== false;
    item.sortOrder = Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0;
    item.updatedBy = admin.adminShopId;

    if (nextImage) {
      item.image = nextImage;
    }

    await item.save();

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error("Failed to update Bloom catalogue item:", error);
    return NextResponse.json(
      { error: "Unable to update Bloom catalogue item." },
      { status: 500 },
    );
  }
}
