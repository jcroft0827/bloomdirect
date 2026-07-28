import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import Shop from "@/models/Shop";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = { params: Promise<{ shopId: string }> };
function reasonFrom(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { shopId } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(shopId))
      return NextResponse.json({ error: "Invalid shop ID." }, { status: 400 });
    if (shopId === session.user.id)
      return NextResponse.json(
        { error: "You cannot archive your own admin account." },
        { status: 400 },
      );
    const body = (await request.json()) as {
      archived?: unknown;
      reason?: unknown;
    };
    if (typeof body.archived !== "boolean")
      return NextResponse.json(
        { error: "A valid archive status is required." },
        { status: 400 },
      );
    const reason = reasonFrom(body.reason);
    if (reason.length < 5 || reason.length > 500)
      return NextResponse.json(
        { error: "Reason must be between 5 and 500 characters." },
        { status: 400 },
      );
    await connectToDB();
    const shop = await Shop.findById(shopId).select(
      "businessName email role isSuspended isArchived archivedReason archivedAt archivedBy isPublic",
    );
    if (!shop)
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    if (shop.role === "admin")
      return NextResponse.json(
        { error: "Admin accounts cannot be archived here." },
        { status: 400 },
      );
    if (body.archived && shop.isSuspended !== true)
      return NextResponse.json(
        { error: "Suspend this account before archiving it." },
        { status: 400 },
      );
    const previous = {
      isArchived: shop.isArchived === true,
      archivedReason: shop.archivedReason ?? null,
      archivedAt: shop.archivedAt ?? null,
      archivedBy: shop.archivedBy ?? null,
      isPublic: shop.isPublic === true,
    };
    if (previous.isArchived === body.archived)
      return NextResponse.json(
        {
          error: body.archived
            ? "This account is already archived."
            : "This account is not archived.",
        },
        { status: 409 },
      );
    shop.isArchived = body.archived;
    shop.archivedReason = reason;
    shop.archivedAt = body.archived ? new Date() : undefined;
    shop.archivedBy = body.archived ? session.user.id : undefined;
    if (body.archived) shop.isPublic = false;
    await shop.save();
    try {
      await AdminAuditLog.create({
        adminShop: session.user.id,
        targetShop: shop._id,
        action: body.archived ? "SHOP_ARCHIVED" : "SHOP_RESTORED",
        reason,
        metadata: {
          targetShopName: shop.businessName,
          targetShopEmail: shop.email,
          previousArchived: previous.isArchived,
          newArchived: body.archived,
          previousArchivedReason: previous.archivedReason,
          previousIsPublic: previous.isPublic,
          newIsPublic: shop.isPublic === true,
        },
      });
    } catch (auditError) {
      shop.isArchived = previous.isArchived;
      shop.archivedReason = previous.archivedReason ?? undefined;
      shop.archivedAt = previous.archivedAt ?? undefined;
      shop.archivedBy = previous.archivedBy ?? undefined;
      shop.isPublic = previous.isPublic;
      await shop.save();
      return NextResponse.json(
        {
          error:
            "The archive status was not changed because the audit log could not be created.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      success: true,
      message: body.archived
        ? `${shop.businessName} was archived.`
        : `${shop.businessName} was restored from the archive.`,
      shop: {
        _id: String(shop._id),
        isArchived: shop.isArchived === true,
        archivedReason: shop.archivedReason ?? null,
        archivedAt: shop.archivedAt?.toISOString?.() ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to update shop archive status:", error);
    return NextResponse.json(
      { error: "Failed to update archive status." },
      { status: 500 },
    );
  }
}
