// src/app/api/websites/images/upload-url/route.ts

import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { generateUploadUrl } from "@/lib/s3";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

const MAX_FILE_SIZE = 8 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const ALLOWED_ASSET_TYPES = new Set([
  "product",
  "addon",
  "branding",
]);

type UploadRequestBody = {
  fileType?: unknown;
  fileSize?: unknown;
  assetType?: unknown;
};

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    const body =
      (await request.json()) as UploadRequestBody;

    const fileType =
      typeof body.fileType === "string"
        ? body.fileType.trim().toLowerCase()
        : "";

    const fileSize = Number(body.fileSize);

    const assetType =
      typeof body.assetType === "string"
        ? body.assetType.trim().toLowerCase()
        : "";

    if (!ALLOWED_IMAGE_TYPES.has(fileType)) {
      return NextResponse.json(
        {
          error:
            "Images must be JPG, PNG, or WebP.",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0 ||
      fileSize > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "Images must be smaller than 8 MB.",
        },
        { status: 400 },
      );
    }

    if (!ALLOWED_ASSET_TYPES.has(assetType)) {
      return NextResponse.json(
        {
          error: "Invalid website asset type.",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const shop = await Shop.findById(
      session.user.id,
    ).select("_id isSuspended");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error:
            "Suspended shops cannot upload website images.",
        },
        { status: 403 },
      );
    }

    const website = await BloomWebsite.findOne({
      shop: shop._id,
    }).select("_id");

    if (!website) {
      return NextResponse.json(
        {
          error:
            "Create your BloomWebsite before uploading images.",
        },
        { status: 404 },
      );
    }

    const extension =
      EXTENSION_BY_TYPE[fileType];

    const folderByAssetType: Record<
      string,
      string
    > = {
      product: "products",
      addon: "addons",
      branding: "branding",
    };

    const folder =
      folderByAssetType[assetType];

    const fileKey = [
      "bloom-websites",
      shop._id.toString(),
      folder,
      `${randomUUID()}.${extension}`,
    ].join("/");

    const { uploadUrl } =
      await generateUploadUrl(
        fileKey,
        fileType,
      );

    const cloudFrontBase =
      process.env.CLOUDFRONT_URL ||
      process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

    if (!cloudFrontBase) {
      console.error(
        "CloudFront URL is not configured.",
      );

      return NextResponse.json(
        {
          error:
            "Website image delivery is not configured.",
        },
        { status: 500 },
      );
    }

    const publicUrl = `${cloudFrontBase.replace(
      /\/$/,
      "",
    )}/${fileKey}`;

    return NextResponse.json({
      success: true,
      uploadUrl,
      fileKey,
      publicUrl,
    });
  } catch (error) {
    console.error(
      "BloomWebsite image upload URL error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to prepare website image upload.",
      },
      { status: 500 },
    );
  }
}