import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import FulfillmentOffering from "@/models/FulfillmentOffering";
import InvitedFlorist from "@/models/InvitedFlorist";
import Notifications from "@/models/Notifications";
import Order from "@/models/Order";
import OrderMessages from "@/models/OrderMessages";
import Shop from "@/models/Shop";
import Webhook from "@/models/Webhook";
import WebhookLog from "@/models/WebhookLog";
import WebsiteVerificationRequest from "@/models/WebsiteVerificationRequest";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type BulkDeleteRequestBody = {
  shopIds?: unknown;
};

type RefusedShop = {
  shopId: string;
  businessName: string;
  email: string;
  reasons: string[];
};

const MAX_BULK_SHOPS = 50;

const DELETE_REASON =
  "Permanent deletion of archived spam account after server-side safety verification.";

function normalizeShopIds(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

async function getDeletionBlockers(
  shop: any,
): Promise<string[]> {
  const reasons: string[] = [];
  const shopId = shop._id;

  // ---------------------------------------------------------
  // Account-state requirements
  // ---------------------------------------------------------

  if (shop.role === "admin") {
    reasons.push("Admin accounts cannot be permanently deleted.");
  }

  if (shop.isArchived !== true) {
    reasons.push("Account is not archived.");
  }

  if (shop.isMarkedSpam !== true) {
    reasons.push("Account is not marked as spam.");
  }

  if (shop.isSuspended !== true) {
    reasons.push("Account is not suspended.");
  }

  if (shop.verification?.emailVerified === true) {
    reasons.push("Email address has been verified.");
  }

  if (shop.verification?.phoneVerified === true) {
    reasons.push("Phone number has been verified.");
  }

  if (shop.verification?.websiteVerified === true) {
    reasons.push("Website has been verified.");
  }

  if (shop.isVerified === true) {
    reasons.push("Account has verified status.");
  }

  if (shop.verifiedFlorist === true) {
    reasons.push("Account is a verified florist.");
  }

  if (shop.onboardingComplete === true) {
    reasons.push("Account completed onboarding.");
  }

  // ---------------------------------------------------------
  // Billing / Pro protection
  // ---------------------------------------------------------

  if (shop.isPro === true) {
    reasons.push("Account has Bloom Pro enabled.");
  }

  if (shop.stripe?.customerId) {
    reasons.push("Account has a Stripe customer.");
  }

  if (shop.stripe?.subscriptionId) {
    reasons.push("Account has a Stripe subscription.");
  }

  if (shop.stripe?.planId) {
    reasons.push("Account has Stripe plan history.");
  }

  if (shop.stripe?.status) {
    reasons.push("Account has Stripe subscription status.");
  }

  // ---------------------------------------------------------
  // POS/API protection
  // ---------------------------------------------------------

  if (shop.apiAccess?.enabled === true) {
    reasons.push("Account has POS API access enabled.");
  }

  if (
    shop.apiAccess?.keyPrefix ||
    shop.apiAccess?.keyLastFour ||
    shop.apiAccess?.keyCreatedAt ||
    shop.apiAccess?.lastUsedAt
  ) {
    reasons.push("Account has POS API key history.");
  }

  // ---------------------------------------------------------
  // Internal stats protection
  // ---------------------------------------------------------

  if (
    Number(shop.stats?.ordersSent ?? 0) > 0 ||
    Number(shop.stats?.ordersReceived ?? 0) > 0 ||
    Number(shop.stats?.ordersCompleted ?? 0) > 0 ||
    Number(shop.stats?.ordersDeclined ?? 0) > 0
  ) {
    reasons.push("Account has order statistics.");
  }

  if (
    Array.isArray(shop.reviews) &&
    shop.reviews.length > 0
  ) {
    reasons.push("Account has received reviews.");
  }

  /*
   * If the basic account-state checks already prove this shop unsafe,
   * we still run the relationship checks below so the admin gets a
   * complete explanation of why deletion was refused.
   */

  const [
    orderCount,
    messageCount,
    authoredReviewCount,
    convertedInvitationCount,
    approvedWebsiteVerificationCount,
  ] = await Promise.all([
    Order.countDocuments({
      $or: [
        { originatingShop: shopId },
        { fulfillingShop: shopId },
        { "declineHistory.shop": shopId },
        { "activityLog.actorShop": shopId },
        { "reviews.reviewerShop": shopId },
        { "reviews.reviewedShop": shopId },
        { "refunds.createdByShop": shopId },
        { "refunds.voidedByShop": shopId },
        { lastUpdatedByShop: shopId },
      ],
    }),

    OrderMessages.countDocuments({
      $or: [
        { sendingShop: shopId },
        { receivingShop: shopId },
      ],
    }),

    Shop.countDocuments({
      _id: { $ne: shopId },
      "reviews.reviewerShop": shopId,
    }),

    InvitedFlorist.countDocuments({
      registeredShop: shopId,
    }),

    WebsiteVerificationRequest.countDocuments({
      shop: shopId,
      status: "approved",
    }),
  ]);

  if (orderCount > 0) {
    reasons.push(
      `Account is referenced by ${orderCount} order${
        orderCount === 1 ? "" : "s"
      }.`,
    );
  }

  if (messageCount > 0) {
    reasons.push(
      `Account is referenced by ${messageCount} message${
        messageCount === 1 ? "" : "s"
      }.`,
    );
  }

  if (authoredReviewCount > 0) {
    reasons.push(
      `Account authored reviews on ${authoredReviewCount} shop account${
        authoredReviewCount === 1 ? "" : "s"
      }.`,
    );
  }

  if (convertedInvitationCount > 0) {
    reasons.push(
      "Account is linked to a converted florist invitation.",
    );
  }

  if (approvedWebsiteVerificationCount > 0) {
    reasons.push(
      "Account has an approved website verification request.",
    );
  }

  return reasons;
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as BulkDeleteRequestBody;
    const shopIds = normalizeShopIds(body.shopIds);

    if (!shopIds) {
      return NextResponse.json(
        {
          error: "shopIds must be an array of shop IDs.",
        },
        { status: 400 },
      );
    }

    if (shopIds.length === 0) {
      return NextResponse.json(
        {
          error: "Select at least one archived spam account.",
        },
        { status: 400 },
      );
    }

    if (shopIds.length > MAX_BULK_SHOPS) {
      return NextResponse.json(
        {
          error: `You can permanently delete at most ${MAX_BULK_SHOPS} accounts at one time.`,
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
          error:
            "Your own admin account cannot be permanently deleted.",
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
        "isArchived",
        "isMarkedSpam",
        "isSuspended",
        "isVerified",
        "verifiedFlorist",
        "onboardingComplete",
        "isPro",
        "verification.emailVerified",
        "verification.phoneVerified",
        "verification.websiteVerified",
        "stripe.customerId",
        "stripe.subscriptionId",
        "stripe.status",
        "stripe.planId",
        "apiAccess.enabled",
        "apiAccess.keyPrefix",
        "apiAccess.keyLastFour",
        "apiAccess.keyCreatedAt",
        "apiAccess.lastUsedAt",
        "stats",
        "reviews",
        "createdAt",
        "archivedAt",
        "markedSpamAt",
      ].join(" "),
    );

    const foundShopIds = new Set(
      shops.map((shop) => String(shop._id)),
    );

    const missingShopIds = shopIds.filter(
      (shopId) => !foundShopIds.has(shopId),
    );

    const refused: RefusedShop[] = missingShopIds.map(
      (shopId) => ({
        shopId,
        businessName: "Unknown",
        email: "",
        reasons: ["Shop could not be found."],
      }),
    );

    const eligibleShops: any[] = [];

    /*
     * We deliberately validate each account independently.
     *
     * If 48 accounts are safe and 2 contain real activity, the 48
     * disposable accounts may still be deleted while the 2 protected
     * accounts are explicitly refused.
     */
    for (const shop of shops) {
      const reasons = await getDeletionBlockers(shop);

      if (reasons.length > 0) {
        refused.push({
          shopId: String(shop._id),
          businessName: shop.businessName,
          email: shop.email,
          reasons,
        });

        continue;
      }

      eligibleShops.push(shop);
    }

    const deleted: Array<{
      shopId: string;
      businessName: string;
      email: string;
    }> = [];

    /*
     * Each eligible shop gets its own transaction.
     *
     * This prevents a partial permanent deletion where, for example,
     * the Shop document is removed but its offerings or webhook
     * records remain behind.
     */
    for (const shop of eligibleShops) {
      const dbSession = await mongoose.startSession();

      try {
        await dbSession.withTransaction(async () => {
          const shopId = shop._id;

          /*
           * Re-check the most critical conditions inside the
           * transaction immediately before destructive work.
           *
           * This protects against the account changing between the
           * initial safety scan and deletion.
           */
          const freshShop = await Shop.findById(shopId)
            .session(dbSession)
            .select(
              [
                "businessName",
                "email",
                "role",
                "isArchived",
                "isMarkedSpam",
                "isSuspended",
                "isPro",
                "verification.emailVerified",
                "stripe.customerId",
                "stripe.subscriptionId",
              ].join(" "),
            );

          if (!freshShop) {
            throw new Error(
              `Shop ${String(shopId)} disappeared before deletion.`,
            );
          }

          if (
            freshShop.role === "admin" ||
            freshShop.isArchived !== true ||
            freshShop.isMarkedSpam !== true ||
            freshShop.isSuspended !== true ||
            freshShop.verification?.emailVerified === true ||
            freshShop.isPro === true ||
            freshShop.stripe?.customerId ||
            freshShop.stripe?.subscriptionId
          ) {
            throw new Error(
              `Shop ${String(
                shopId,
              )} no longer satisfies permanent deletion requirements.`,
            );
          }

          /*
           * Preserve the administrative history before removing the
           * account itself.
           *
           * AdminAuditLog intentionally remains after deletion.
           * MongoDB does not enforce foreign keys, and metadata stores
           * the identifying snapshot needed to understand what was
           * removed and why.
           */
          await AdminAuditLog.create(
            [
              {
                adminShop: session.user.id,
                targetShop: shopId,
                action: "SHOP_DELETED",
                reason: DELETE_REASON,
                metadata: {
                  deletionType: "ARCHIVED_SPAM_PURGE",
                  targetShopName: shop.businessName,
                  targetShopEmail: shop.email,
                  createdAt: shop.createdAt ?? null,
                  archivedAt: shop.archivedAt ?? null,
                  markedSpamAt: shop.markedSpamAt ?? null,
                  emailVerified: false,
                  wasPro: false,
                  permanentDeletion: true,
                },
              },
            ],
            { session: dbSession },
          );

          /*
           * Remove disposable account-owned setup/operational data.
           *
           * None of these collections represent a completed florist
           * relationship. The safety checks above already prevented
           * deletion if meaningful orders, messages, reviews, billing,
           * or verified activity exists.
           */
          await FulfillmentOffering.deleteMany({
            shop: shopId,
          }).session(dbSession);

          await WebsiteVerificationRequest.deleteMany({
            shop: shopId,
          }).session(dbSession);

          const webhookIds = await Webhook.find({
            shopId,
          })
            .session(dbSession)
            .distinct("_id");

          await WebhookLog.deleteMany({
            $or: [
              { shopId },
              ...(webhookIds.length > 0
                ? [{ webhookId: { $in: webhookIds } }]
                : []),
            ],
          }).session(dbSession);

          await Webhook.deleteMany({
            shopId,
          }).session(dbSession);

          /*
           * Notifications are disposable derived records. A genuinely
           * active account would already have been protected by the
           * order/message checks.
           */
          await Notifications.deleteMany({
            $or: [
              { receivingShop: shopId },
              { sendingShop: shopId },
            ],
          }).session(dbSession);

          /*
           * Remove stale social/network references from surviving
           * accounts so no Shop document retains a pointer to a
           * permanently deleted spam account.
           */
          await Shop.updateMany(
            {
              _id: { $ne: shopId },
              $or: [
                { preferredFlorists: shopId },
                { "blockedFlorists.shopId": shopId },
              ],
            },
            {
              $pull: {
                preferredFlorists: shopId,
                blockedFlorists: {
                  shopId,
                },
              },
            },
            {
              session: dbSession,
            },
          );

          const deleteResult = await Shop.deleteOne(
            {
              _id: shopId,
              role: { $ne: "admin" },
              isArchived: true,
              isMarkedSpam: true,
              isSuspended: true,
              "verification.emailVerified": { $ne: true },
              isPro: { $ne: true },
            },
            {
              session: dbSession,
            },
          );

          if (deleteResult.deletedCount !== 1) {
            throw new Error(
              `Shop ${String(
                shopId,
              )} failed its final deletion guard.`,
            );
          }
        });

        deleted.push({
          shopId: String(shop._id),
          businessName: shop.businessName,
          email: shop.email,
        });
      } catch (error: unknown) {
        console.error(
          `Failed to permanently delete spam shop ${String(
            shop._id,
          )}:`,
          error,
        );

        refused.push({
          shopId: String(shop._id),
          businessName: shop.businessName,
          email: shop.email,
          reasons: [
            error instanceof Error
              ? error.message
              : "Deletion failed unexpectedly.",
          ],
        });
      } finally {
        await dbSession.endSession();
      }
    }

    return NextResponse.json({
      success: true,
      requestedCount: shopIds.length,
      deletedCount: deleted.length,
      refusedCount: refused.length,
      deleted,
      refused,
      message:
        deleted.length === 0
          ? "No accounts were permanently deleted."
          : deleted.length === 1
            ? "1 archived spam account was permanently deleted."
            : `${deleted.length} archived spam accounts were permanently deleted.`,
    });
  } catch (error: unknown) {
    console.error(
      "Failed to permanently delete archived spam accounts:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Failed to complete the permanent spam-account deletion.",
      },
      { status: 500 },
    );
  }
}