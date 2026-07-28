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
        { error: "You cannot review your own admin account." },
        { status: 400 },
      );
    const body = (await request.json()) as {
      markedSpam?: unknown;
      reason?: unknown;
    };
    if (typeof body.markedSpam !== "boolean")
      return NextResponse.json(
        { error: "A valid spam-review status is required." },
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
      "businessName email role isMarkedSpam spamReviewReason markedSpamAt markedSpamBy",
    );
    if (!shop)
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    if (shop.role === "admin")
      return NextResponse.json(
        { error: "Admin accounts cannot be reviewed here." },
        { status: 400 },
      );
    const previous = {
      isMarkedSpam: shop.isMarkedSpam === true,
      spamReviewReason: shop.spamReviewReason ?? null,
      markedSpamAt: shop.markedSpamAt ?? null,
      markedSpamBy: shop.markedSpamBy ?? null,
    };
    if (previous.isMarkedSpam === body.markedSpam)
      return NextResponse.json(
        {
          error: body.markedSpam
            ? "This account is already marked as spam."
            : "This account is not marked as spam.",
        },
        { status: 409 },
      );
    shop.isMarkedSpam = body.markedSpam;
    shop.spamReviewReason = reason;
    shop.markedSpamAt = body.markedSpam ? new Date() : undefined;
    shop.markedSpamBy = body.markedSpam ? session.user.id : undefined;
    await shop.save();
    try {
      await AdminAuditLog.create({
        adminShop: session.user.id,
        targetShop: shop._id,
        action: body.markedSpam ? "SHOP_MARKED_SPAM" : "SHOP_MARKED_LEGITIMATE",
        reason,
        metadata: {
          targetShopName: shop.businessName,
          targetShopEmail: shop.email,
          previousMarkedSpam: previous.isMarkedSpam,
          newMarkedSpam: body.markedSpam,
          previousSpamReviewReason: previous.spamReviewReason,
        },
      });
    } catch (auditError) {
      shop.isMarkedSpam = previous.isMarkedSpam;
      shop.spamReviewReason = previous.spamReviewReason ?? undefined;
      shop.markedSpamAt = previous.markedSpamAt ?? undefined;
      shop.markedSpamBy = previous.markedSpamBy ?? undefined;
      await shop.save();
      return NextResponse.json(
        {
          error:
            "The review status was not changed because the audit log could not be created.",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({
      success: true,
      message: body.markedSpam
        ? `${shop.businessName} was marked as spam.`
        : `${shop.businessName} was marked as legitimate.`,
      shop: {
        _id: String(shop._id),
        isMarkedSpam: shop.isMarkedSpam === true,
        spamReviewReason: shop.spamReviewReason ?? null,
        markedSpamAt: shop.markedSpamAt?.toISOString?.() ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to update shop review status:", error);
    return NextResponse.json(
      { error: "Failed to update review status." },
      { status: 500 },
    );
  }
}
