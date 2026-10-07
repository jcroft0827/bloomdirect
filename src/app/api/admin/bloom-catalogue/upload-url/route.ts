// src/app/api/admin/bloom-catalogue/upload-url/route.ts

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { generateUploadUrl } from "@/lib/s3";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_ORIGINAL_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type UploadRequestBody = {
  fileType?: unknown;
  fileSize?: unknown;
  variant?: unknown;
};

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();

    if (!admin.authorized) {
      return NextResponse.json(
        { error: admin.error },
        { status: admin.status },
      );
    }

    const body = (await request.json()) as UploadRequestBody;
    const fileType =
      typeof body.fileType === "string"
        ? body.fileType.trim().toLowerCase()
        : "";
    const fileSize = Number(body.fileSize);
    const variant =
      body.variant === "optimized" ? "optimized" : "original";

    if (variant === "original" && !ALLOWED_ORIGINAL_TYPES.has(fileType)) {
      return NextResponse.json(
        { error: "Catalogue originals must be JPG, PNG, or WebP." },
        { status: 400 },
      );
    }

    if (variant === "optimized" && fileType !== "image/webp") {
      return NextResponse.json(
        { error: "Optimized catalogue images must be WebP." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Catalogue images must be smaller than 8 MB." },
        { status: 400 },
      );
    }

    const extension = EXTENSION_BY_TYPE[fileType] || "webp";
    const fileKey = [
      "bloom-catalogue",
      variant === "optimized" ? "optimized" : "originals",
      `${randomUUID()}.${extension}`,
    ].join("/");

    const { uploadUrl } = await generateUploadUrl(fileKey, fileType);
    const cloudFrontBase =
      process.env.CLOUDFRONT_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

    if (!cloudFrontBase) {
      console.error("CloudFront URL is not configured for Bloom catalogue assets.");
      return NextResponse.json(
        { error: "Catalogue image delivery is not configured." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      uploadUrl,
      fileKey,
      publicUrl: `${cloudFrontBase.replace(/\/$/, "")}/${fileKey}`,
    });
  } catch (error) {
    console.error("Bloom catalogue upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to prepare catalogue image upload." },
      { status: 500 },
    );
  }
}
