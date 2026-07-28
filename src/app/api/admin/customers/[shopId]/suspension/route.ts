import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import Shop from "@/models/Shop";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    shopId: string;
  }>;
};

type SuspensionRequestBody = {
  suspended?: unknown;
  reason?: unknown;
};

function normalizeReason(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { shopId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID." }, { status: 400 });
    }

    if (shopId === session.user.id) {
      return NextResponse.json(
        {
          error: "You cannot change the suspension status of your own account.",
        },
        { status: 400 },
      );
    }

    const body = (await request.json()) as SuspensionRequestBody;

    if (typeof body.suspended !== "boolean") {
      return NextResponse.json(
        { error: "A valid suspension status is required." },
        { status: 400 },
      );
    }

    const reason = normalizeReason(body.reason);

    if (reason.length < 5) {
      return NextResponse.json(
        { error: "Please provide a reason of at least 5 characters." },
        { status: 400 },
      );
    }

    if (reason.length > 500) {
      return NextResponse.json(
        { error: "The reason cannot exceed 500 characters." },
        { status: 400 },
      );
    }

    await connectToDB();

    const targetShop = await Shop.findById(shopId).select(
      "businessName email role isSuspended suspensionReason",
    );

    if (!targetShop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    if (targetShop.role === "admin") {
      return NextResponse.json(
        { error: "Admin accounts cannot be suspended from Shop Management." },
        { status: 400 },
      );
    }

    const previousSuspended = targetShop.isSuspended === true;
    const previousSuspensionReason = targetShop.suspensionReason;

    if (previousSuspended === body.suspended) {
      return NextResponse.json(
        {
          error: body.suspended
            ? "This shop is already suspended."
            : "This shop is not currently suspended.",
        },
        { status: 409 },
      );
    }

    targetShop.isSuspended = body.suspended;
    targetShop.suspensionReason = body.suspended ? reason : undefined;

    await targetShop.save();

    const action = body.suspended ? "SHOP_SUSPENDED" : "SHOP_UNSUSPENDED";

    try {
      await AdminAuditLog.create({
        adminShop: session.user.id,
        targetShop: targetShop._id,
        action,
        reason,
        metadata: {
          targetShopName: targetShop.businessName,
          targetShopEmail: targetShop.email,
          previousSuspended,
          newSuspended: body.suspended,
          previousSuspensionReason: previousSuspensionReason ?? null,
        },
      });
    } catch (auditError) {
      // Roll the account state back if the audit record cannot be written.
      targetShop.isSuspended = previousSuspended;
      targetShop.suspensionReason = previousSuspended
        ? previousSuspensionReason
        : undefined;
      await targetShop.save();

      console.error("Failed to create suspension audit log:", auditError);

      return NextResponse.json(
        {
          error:
            "The account status was not changed because the audit log could not be created.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: body.suspended
        ? `${targetShop.businessName} has been suspended.`
        : `${targetShop.businessName} has been restored.`,
      shop: {
        _id: String(targetShop._id),
        isSuspended: targetShop.isSuspended === true,
        suspensionReason: targetShop.suspensionReason ?? null,
      },
    });
  } catch (error: unknown) {
    console.error("Failed to update shop suspension:", error);

    return NextResponse.json(
      { error: "Failed to update the shop account." },
      { status: 500 },
    );
  }
}
