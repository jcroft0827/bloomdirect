import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import Shop from "@/models/Shop";
import { randomUUID } from "crypto";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type BulkSpamArchiveRequestBody = {
  shopIds?: unknown;
};

const MAX_BULK_SHOPS = 250;

const SPAM_REASON = "Admin bulk spam cleanup: account identified as spam.";

type ShopSnapshot = {
  _id: mongoose.Types.ObjectId;
  businessName: string;
  email: string;
  isMarkedSpam: boolean;
  spamReviewReason: string | null;
  markedSpamAt: Date | null;
  markedSpamBy: mongoose.Types.ObjectId | null;
  isSuspended: boolean;
  suspensionReason: string | null;
  isArchived: boolean;
  archivedReason: string | null;
  archivedAt: Date | null;
  archivedBy: mongoose.Types.ObjectId | null;
  isPublic: boolean;
};

function normalizeShopIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const normalized = Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

  return normalized;
}

export async function PATCH(request: NextRequest) {
  let bulkOperationId: string | null = null;

  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as BulkSpamArchiveRequestBody;
    const shopIds = normalizeShopIds(body.shopIds);

    if (!shopIds) {
      return NextResponse.json(
        { error: "shopIds must be an array of shop IDs." },
        { status: 400 },
      );
    }

    if (shopIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one shop." },
        { status: 400 },
      );
    }

    if (shopIds.length > MAX_BULK_SHOPS) {
      return NextResponse.json(
        {
          error: `You can process at most ${MAX_BULK_SHOPS} shops at one time.`,
        },
        { status: 400 },
      );
    }

    const invalidShopIds = shopIds.filter(
      (shopId) => !mongoose.Types.ObjectId.isValid(shopId),
    );

    if (invalidShopIds.length > 0) {
      return NextResponse.json(
        {
          error: "One or more selected shop IDs are invalid.",
          invalidShopIds,
        },
        { status: 400 },
      );
    }

    if (shopIds.includes(session.user.id)) {
      return NextResponse.json(
        {
          error: "Your own admin account cannot be included in this action.",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const shops = await Shop.find({
      _id: { $in: shopIds },
    }).select(
      [
        "businessName",
        "email",
        "role",
        "isMarkedSpam",
        "spamReviewReason",
        "markedSpamAt",
        "markedSpamBy",
        "isSuspended",
        "suspensionReason",
        "isArchived",
        "archivedReason",
        "archivedAt",
        "archivedBy",
        "isPublic",
      ].join(" "),
    );

    if (shops.length !== shopIds.length) {
      const foundIds = new Set(shops.map((shop) => String(shop._id)));

      const missingShopIds = shopIds.filter((shopId) => !foundIds.has(shopId));

      return NextResponse.json(
        {
          error:
            "One or more selected shops could not be found. No accounts were changed.",
          missingShopIds,
        },
        { status: 404 },
      );
    }

    const adminAccounts = shops.filter((shop) => shop.role === "admin");

    if (adminAccounts.length > 0) {
      return NextResponse.json(
        {
          error: "Admin accounts cannot be processed by the bulk spam cleanup.",
          adminShopIds: adminAccounts.map((shop) => String(shop._id)),
        },
        { status: 400 },
      );
    }

    const snapshots: ShopSnapshot[] = shops.map((shop) => ({
      _id: shop._id as mongoose.Types.ObjectId,
      businessName: shop.businessName,
      email: shop.email,
      isMarkedSpam: shop.isMarkedSpam === true,
      spamReviewReason: shop.spamReviewReason ?? null,
      markedSpamAt: shop.markedSpamAt ?? null,
      markedSpamBy: shop.markedSpamBy ?? null,
      isSuspended: shop.isSuspended === true,
      suspensionReason: shop.suspensionReason ?? null,
      isArchived: shop.isArchived === true,
      archivedReason: shop.archivedReason ?? null,
      archivedAt: shop.archivedAt ?? null,
      archivedBy: shop.archivedBy ?? null,
      isPublic: shop.isPublic === true,
    }));

    const now = new Date();
    bulkOperationId = randomUUID();

    /*
     * Apply the entire spam/archive state in one database operation.
     *
     * We intentionally do not call the existing single-shop routes here.
     * The bulk endpoint owns the complete state transition so a shop cannot
     * be left marked as spam but still public, unsuspended, or unarchived.
     */
    const updateResult = await Shop.updateMany(
      {
        _id: { $in: shopIds },
        role: { $ne: "admin" },
      },
      {
        $set: {
          isMarkedSpam: true,
          spamReviewReason: SPAM_REASON,
          markedSpamAt: now,
          markedSpamBy: session.user.id,

          isSuspended: true,
          suspensionReason: SPAM_REASON,

          isPublic: false,

          isArchived: true,
          archivedReason: SPAM_REASON,
          archivedAt: now,
          archivedBy: session.user.id,
        },
      },
    );

    if (updateResult.matchedCount !== shopIds.length) {
      throw new Error(
        `Expected to update ${shopIds.length} shops but matched ${updateResult.matchedCount}.`,
      );
    }

    try {
      const auditEntries = snapshots.flatMap((shop) => [
        {
          adminShop: session.user.id,
          targetShop: shop._id,
          action: "SHOP_MARKED_SPAM",
          reason: SPAM_REASON,
          metadata: {
            bulkOperationId,
            bulkAction: "SPAM_AND_ARCHIVE",
            targetShopName: shop.businessName,
            targetShopEmail: shop.email,
            previousMarkedSpam: shop.isMarkedSpam,
            newMarkedSpam: true,
            previousSpamReviewReason: shop.spamReviewReason,
          },
        },
        {
          adminShop: session.user.id,
          targetShop: shop._id,
          action: "SHOP_SUSPENDED",
          reason: SPAM_REASON,
          metadata: {
            bulkOperationId,
            bulkAction: "SPAM_AND_ARCHIVE",
            targetShopName: shop.businessName,
            targetShopEmail: shop.email,
            previousSuspended: shop.isSuspended,
            newSuspended: true,
            previousSuspensionReason: shop.suspensionReason,
          },
        },
        {
          adminShop: session.user.id,
          targetShop: shop._id,
          action: "SHOP_ARCHIVED",
          reason: SPAM_REASON,
          metadata: {
            bulkOperationId,
            bulkAction: "SPAM_AND_ARCHIVE",
            targetShopName: shop.businessName,
            targetShopEmail: shop.email,
            previousArchived: shop.isArchived,
            newArchived: true,
            previousArchivedReason: shop.archivedReason,
            previousIsPublic: shop.isPublic,
            newIsPublic: false,
          },
        },
      ]);

      await AdminAuditLog.insertMany(auditEntries);
    } catch (auditError) {
      /*
       * If audit logging fails, remove any audit records that may have been
       * inserted for this operation and restore every affected shop to its
       * exact previous state.
       */
      try {
        await AdminAuditLog.deleteMany({
          "metadata.bulkOperationId": bulkOperationId,
        });
      } catch (auditCleanupError) {
        console.error(
          "Failed to clean up partial bulk spam audit records:",
          auditCleanupError,
        );
      }

      const rollbackOperations = snapshots.map((shop) => {
        const setFields: Record<string, unknown> = {
          isMarkedSpam: shop.isMarkedSpam,
          isSuspended: shop.isSuspended,
          isArchived: shop.isArchived,
          isPublic: shop.isPublic,
        };

        const unsetFields: Record<string, ""> = {};

        if (shop.spamReviewReason === null) {
          unsetFields.spamReviewReason = "";
        } else {
          setFields.spamReviewReason = shop.spamReviewReason;
        }

        if (shop.markedSpamAt === null) {
          unsetFields.markedSpamAt = "";
        } else {
          setFields.markedSpamAt = shop.markedSpamAt;
        }

        if (shop.markedSpamBy === null) {
          unsetFields.markedSpamBy = "";
        } else {
          setFields.markedSpamBy = shop.markedSpamBy;
        }

        if (shop.suspensionReason === null) {
          unsetFields.suspensionReason = "";
        } else {
          setFields.suspensionReason = shop.suspensionReason;
        }

        if (shop.archivedReason === null) {
          unsetFields.archivedReason = "";
        } else {
          setFields.archivedReason = shop.archivedReason;
        }

        if (shop.archivedAt === null) {
          unsetFields.archivedAt = "";
        } else {
          setFields.archivedAt = shop.archivedAt;
        }

        if (shop.archivedBy === null) {
          unsetFields.archivedBy = "";
        } else {
          setFields.archivedBy = shop.archivedBy;
        }

        return {
          updateOne: {
            filter: { _id: shop._id },
            update: {
              $set: setFields,
              ...(Object.keys(unsetFields).length > 0
                ? { $unset: unsetFields }
                : {}),
            },
          },
        };
      });

      await Shop.bulkWrite(rollbackOperations);

      console.error(
        "Failed to create bulk spam cleanup audit logs:",
        auditError,
      );

      return NextResponse.json(
        {
          error:
            "No accounts were changed because the audit log could not be completed.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      processedCount: shops.length,
      message:
        shops.length === 1
          ? "1 spam account was marked, suspended, hidden, and archived."
          : `${shops.length} spam accounts were marked, suspended, hidden, and archived.`,
    });
  } catch (error: unknown) {
    console.error("Failed to bulk archive spam accounts:", error);

    /*
     * If an unexpected error occurs after the operation ID was created,
     * report it clearly. Expected audit failures are already handled above.
     */
    return NextResponse.json(
      {
        error: "Failed to complete the bulk spam cleanup.",
      },
      { status: 500 },
    );
  }
}
