// src/app/api/admin/bloom-catalogue/route.ts

import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectToDB } from "@/lib/mongoose";
import BloomCatalogueItem from "@/models/BloomCatalogueItem";

const MAX_ARRAY_ITEMS = 50;

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


function parseSuggestedProduct(value: unknown) {
  const suggested =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  return {
    name: cleanString(suggested.name, 160),
    shortDescription: cleanString(suggested.shortDescription, 240),
    description: cleanString(suggested.description, 3000),
    category: cleanString(suggested.category, 100),
    occasions: cleanStringArray(suggested.occasions),
    tags: cleanStringArray(suggested.tags),
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

export async function GET() {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    await connectToDB();

    const items = await BloomCatalogueItem.find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ success: true, items });
  } catch (error) {
    console.error("Failed to load Bloom catalogue items:", error);
    return NextResponse.json(
      { error: "Unable to load Bloom catalogue items." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const body = await request.json();
    const title = cleanString(body?.title, 160);
    const description = cleanString(body?.description, 1200);
    const image = parseImage(body?.image);

    if (!title) {
      return NextResponse.json({ error: "Catalogue title is required." }, { status: 400 });
    }

    if (!image) {
      return NextResponse.json(
        { error: "Upload both the original and optimized catalogue image before saving." },
        { status: 400 },
      );
    }

    await connectToDB();

    const item = await BloomCatalogueItem.create({
      title,
      description,
      flowers: cleanStringArray(body?.flowers),
      colors: cleanStringArray(body?.colors),
      occasions: cleanStringArray(body?.occasions),
      categories: cleanStringArray(body?.categories),
      tags: cleanStringArray(body?.tags),
      suggestedProduct: parseSuggestedProduct(body?.suggestedProduct),
      image,
      isDesignerChoice: body?.isDesignerChoice === true,
      isActive: body?.isActive !== false,
      sortOrder: Number.isFinite(Number(body?.sortOrder)) ? Number(body.sortOrder) : 0,
      createdBy: admin.adminShopId,
      updatedBy: admin.adminShopId,
    });

    return NextResponse.json({ success: true, item }, { status: 201 });
  } catch (error) {
    console.error("Failed to create Bloom catalogue item:", error);
    return NextResponse.json(
      { error: "Unable to create Bloom catalogue item." },
      { status: 500 },
    );
  }
}
