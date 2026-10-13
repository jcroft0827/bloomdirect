import { randomUUID } from "node:crypto";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { checkBloomWebsiteRateLimit } from "@/lib/bloom-websites/checkBloomWebsiteRateLimit";
import { generateUploadUrl } from "@/lib/s3";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const shop = await Shop.findById(session.user.id)
      .select("_id isSuspended isArchived isMarkedSpam")
      .lean<{
        _id: unknown;
        isSuspended?: boolean;
        isArchived?: boolean;
        isMarkedSpam?: boolean;
      } | null>();

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (shop.isSuspended || shop.isArchived || shop.isMarkedSpam) {
      return NextResponse.json(
        { error: "This account cannot upload files right now." },
        { status: 403 },
      );
    }

    const rateLimit = await checkBloomWebsiteRateLimit({
      request: req,
      scope: "authenticated-s3-upload",
      subject: session.user.id,
      limit: 30,
      windowMs: 5 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many upload requests. Please wait and try again." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = await req.json().catch(() => null);
    const fileType =
      body && typeof body.fileType === "string" ? body.fileType.trim() : "";

    const extension = ALLOWED_IMAGE_TYPES[fileType];

    if (!extension) {
      return NextResponse.json(
        {
          error:
            "Unsupported image type. Use JPEG, PNG, WebP, GIF, or AVIF.",
        },
        { status: 400 },
      );
    }

    const fileKey = `shops/${session.user.id}/uploads/${randomUUID()}.${extension}`;

    const { uploadUrl, fileUrl } = await generateUploadUrl(fileKey, fileType);

    return NextResponse.json({ uploadUrl, fileUrl, fileKey });
  } catch (error) {
    console.error("S3 Upload URL Error:", error);

    return NextResponse.json(
      { error: "Failed to generate upload URL" },
      { status: 500 },
    );
  }
}
