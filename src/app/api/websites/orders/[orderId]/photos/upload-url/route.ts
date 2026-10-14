import { randomUUID } from "crypto";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { generateUploadUrl } from "@/lib/s3";
import BloomWebsiteOrder from "@/models/BloomWebsiteOrder";
import Shop from "@/models/Shop";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const { orderId } = await params;
    const body = await request.json().catch(() => null);
    const fileType = typeof body?.fileType === "string" ? body.fileType.toLowerCase() : "";
    const fileSize = Number(body?.fileSize);

    if (!ALLOWED_IMAGE_TYPES.has(fileType)) {
      return NextResponse.json({ error: "Photos must be JPG, PNG, or WebP." }, { status: 400 });
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Photos must be smaller than 8 MB." }, { status: 400 });
    }

    await connectToDB();

    const [shop, order] = await Promise.all([
      Shop.findById(session.user.id).select("_id isSuspended").lean<any>(),
      BloomWebsiteOrder.findOne({ _id: orderId, shop: session.user.id })
        .select("_id")
        .lean<any>(),
    ]);

    if (!shop) return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    if (shop.isSuspended) {
      return NextResponse.json({ error: "Suspended shops cannot upload order photos." }, { status: 403 });
    }
    if (!order) {
      return NextResponse.json({ error: "Order not found." }, { status: 404 });
    }

    const extension = EXTENSION_BY_TYPE[fileType];
    const fileKey = [
      "bloom-websites",
      String(shop._id),
      "orders",
      String(order._id),
      "arrangements",
      `${randomUUID()}.${extension}`,
    ].join("/");

    const { uploadUrl } = await generateUploadUrl(fileKey, fileType);
    const cloudFrontBase = process.env.CLOUDFRONT_URL || process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

    if (!cloudFrontBase) {
      return NextResponse.json({ error: "Website image delivery is not configured." }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl,
      fileKey,
      publicUrl: `${cloudFrontBase.replace(/\/$/, "")}/${fileKey}`,
    });
  } catch (error) {
    console.error("Order photo upload URL error:", error);
    return NextResponse.json({ error: "Unable to prepare the photo upload." }, { status: 500 });
  }
}
