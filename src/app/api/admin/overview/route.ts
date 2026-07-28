import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Order from "@/models/Order";
import Shop from "@/models/Shop";
import WebsiteVerificationRequest from "@/models/WebsiteVerificationRequest";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { getShopReadiness } from "@/lib/shops/getShopReadiness";
import { AdminAuditLog } from "@/models/AdminAuditLog";

type LeanShop = {
  _id: unknown;
  businessName?: string;
  shopName?: string;
  email?: string;
  role?: string;
  isPro?: boolean;
  isPublic?: boolean;
  isSuspended?: boolean;
  createdAt?: Date;
  verification?: {
    emailVerified?: boolean;
    websiteVerified?: boolean;
  };
  contact?: Record<string, unknown>;
  address?: Record<string, unknown>;
  delivery?: Record<string, unknown>;
  financials?: Record<string, unknown>;
  paymentMethods?: Record<string, unknown>;
  setupProgress?: Record<string, unknown>;
};

function getMonthStart() {
  const now = new Date();

  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

function getReadinessPercentage(
  readiness: ReturnType<typeof getShopReadiness>,
) {
  if (
    typeof readiness === "object" &&
    readiness !== null &&
    "percentage" in readiness &&
    typeof readiness.percentage === "number"
  ) {
    return readiness.percentage;
  }

  if (
    typeof readiness === "object" &&
    readiness !== null &&
    "completionPercentage" in readiness &&
    typeof readiness.completionPercentage === "number"
  ) {
    return readiness.completionPercentage;
  }

  return 0;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDB();

    const monthStart = getMonthStart();

    const [
      shops,
      pendingWebsiteReviewCount,
      pendingWebsiteRequests,
      ordersThisMonth,
      totalOrders,
      recentShops,
      recentOrders,
      recentWebsiteDecisions,
      recentAdminActions,
    ] = await Promise.all([
      Shop.find({
        role: {
          $ne: "admin",
        },
      })
        .select(
          [
            "businessName",
            "shopName",
            "email",
            "role",
            "isPro",
            "isPublic",
            "isSuspended",
            "createdAt",
            "verification",
            "contact",
            "address",
            "delivery",
            "financials",
            "paymentMethods",
            "setupProgress",
          ].join(" "),
        )
        .lean<LeanShop[]>(),

      // Full pending-request count for the metric card.
      WebsiteVerificationRequest.countDocuments({
        status: "pending",
      }),

      // Only the five oldest requests for the overview list.
      WebsiteVerificationRequest.find({
        status: "pending",
      })
        .sort({
          createdAt: 1,
        })
        .limit(5)
        .lean(),

      Order.countDocuments({
        createdAt: {
          $gte: monthStart,
        },
      }),

      Order.countDocuments(),

      Shop.find({
        role: {
          $ne: "admin",
        },
      })
        .select("businessName shopName email createdAt")
        .sort({
          createdAt: -1,
        })
        .limit(5)
        .lean(),

      Order.find({})
        .select(
          "orderNumber originatingShop fulfillingShop status createdAt updatedAt",
        )
        .sort({
          updatedAt: -1,
        })
        .limit(5)
        .populate("originatingShop", "businessName shopName")
        .populate("fulfillingShop", "businessName shopName")
        .lean(),

      WebsiteVerificationRequest.find({
        status: {
          $in: ["approved", "declined"],
        },
      })
        .select("shopName websiteUrl status reviewedAt createdAt")
        .sort({
          reviewedAt: -1,
          createdAt: -1,
        })
        .limit(5)
        .lean(),

      AdminAuditLog.find({})
        .select("adminShop targetShop action reason createdAt")
        .sort({
          createdAt: -1,
        })
        .limit(8)
        .populate("adminShop", "businessName shopName email")
        .populate("targetShop", "businessName shopName email")
        .lean(),
    ]);

    const shopSummaries = shops.map((shop) => {
      const readiness = getShopReadiness(shop);
      const percentage = getReadinessPercentage(readiness);

      return {
        _id: String(shop._id),

        businessName: shop.businessName || shop.shopName || "Unnamed Shop",

        email: shop.email || null,
        isPro: shop.isPro === true,
        isPublic: shop.isPublic === true,
        isSuspended: shop.isSuspended === true,
        readiness,
        readinessPercentage: percentage,
      };
    });

    const allShopsNeedingAttention = shopSummaries
      .filter((shop) => {
        if (shop.isSuspended) {
          return false;
        }

        const capabilities = shop.readiness.capabilities;

        return (
          !capabilities.canAppearInSearch ||
          !capabilities.canReceiveOrders ||
          !capabilities.canSendOrders ||
          !capabilities.canAcceptOrders
        );
      })
      .sort((a, b) => a.readinessPercentage - b.readinessPercentage);

    const shopsNeedingAttention = allShopsNeedingAttention.slice(0, 5);

    const totalProShops = shopSummaries.filter((shop) => shop.isPro).length;

    function getPopulatedShopName(value: unknown, fallback: string) {
      if (!value || typeof value !== "object") {
        return fallback;
      }

      const shop = value as {
        businessName?: string;
        shopName?: string;
        email?: string;
      };

      return shop.businessName || shop.shopName || shop.email || fallback;
    }

    const recentActivity = [
      ...recentShops.map((shop) => ({
        id: `shop-${String(shop._id)}`,
        type: "shop_registered" as const,
        title: "New shop registered",
        description:
          shop.businessName || shop.shopName || shop.email || "Unnamed shop",
        occurredAt: shop.createdAt,
      })),

      ...recentOrders.map((order) => {
        const originatingShop =
          typeof order.originatingShop === "object" && order.originatingShop
            ? order.originatingShop
            : null;

        const fulfillingShop =
          typeof order.fulfillingShop === "object" && order.fulfillingShop
            ? order.fulfillingShop
            : null;

        const originatingName =
          originatingShop?.businessName ||
          originatingShop?.shopName ||
          "Originating florist";

        const fulfillingName =
          fulfillingShop?.businessName ||
          fulfillingShop?.shopName ||
          "fulfilling florist";

        return {
          id: `order-${String(order._id)}`,
          type: "order_created" as const,
          title: "Order created",
          description: `${originatingName} → ${fulfillingName}`,
          occurredAt: order.createdAt,
          metadata: {
            status: order.status,
            orderNumber: order.orderNumber || null,
          },
        };
      }),

      ...recentWebsiteDecisions.map((request) => ({
        id: `website-${String(request._id)}`,
        type:
          request.status === "approved"
            ? ("website_approved" as const)
            : ("website_declined" as const),

        title:
          request.status === "approved"
            ? "Website approved"
            : "Website declined",

        description:
          request.shopName || request.websiteUrl || "Florist website",

        occurredAt: request.reviewedAt || request.createdAt,
      })),

      ...recentAdminActions.map((audit) => {
        const adminName = getPopulatedShopName(
          audit.adminShop,
          "An administrator",
        );

        const targetName = getPopulatedShopName(
          audit.targetShop,
          "a shop account",
        );

        let activityDetails:
          | {
              type:
                | "shop_suspended"
                | "shop_unsuspended"
                | "shop_marked_spam"
                | "shop_marked_legitimate"
                | "shop_archived"
                | "shop_archive_restored"
                | "admin_action";
              title: string;
              description: string;
            }
          | undefined;

        switch (audit.action) {
          case "SHOP_SUSPENDED":
            activityDetails = {
              type: "shop_suspended",
              title: "Shop suspended",
              description: `${adminName} suspended ${targetName}`,
            };
            break;

          case "SHOP_UNSUSPENDED":
            activityDetails = {
              type: "shop_unsuspended",
              title: "Shop restored",
              description: `${adminName} restored access for ${targetName}`,
            };
            break;

          case "SHOP_MARKED_SPAM":
            activityDetails = {
              type: "shop_marked_spam",
              title: "Shop marked as spam",
              description: `${adminName} marked ${targetName} as spam`,
            };
            break;

          case "SHOP_MARKED_LEGITIMATE":
            activityDetails = {
              type: "shop_marked_legitimate",
              title: "Shop marked legitimate",
              description: `${adminName} marked ${targetName} as legitimate`,
            };
            break;

          case "SHOP_ARCHIVED":
            activityDetails = {
              type: "shop_archived",
              title: "Shop archived",
              description: `${adminName} archived ${targetName}`,
            };
            break;

          case "SHOP_RESTORED":
            activityDetails = {
              type: "shop_archive_restored",
              title: "Archived shop restored",
              description: `${adminName} restored ${targetName} from the archive`,
            };
            break;

          default:
            activityDetails = {
              type: "admin_action",
              title: "Admin action recorded",
              description: `${adminName} updated ${targetName}`,
            };
            break;
        }

        return {
          id: `audit-${String(audit._id)}`,
          ...activityDetails,
          occurredAt: audit.createdAt,
          metadata: {
            reason: audit.reason || null,
          },
        };
      }),
    ]
      .filter((activity) => activity.occurredAt)
      .sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
      )
      .slice(0, 8);

    return NextResponse.json({
      success: true,

      metrics: {
        totalShops: shopSummaries.length,
        proShops: totalProShops,
        shopsNeedingAttention: allShopsNeedingAttention.length,
        pendingWebsiteReviews: pendingWebsiteReviewCount,
        ordersThisMonth,
        totalOrders,
      },

      shopsNeedingAttention,

      pendingWebsiteRequests: pendingWebsiteRequests.map((request) => ({
        _id: String(request._id),
        shopName: request.shopName || "Unnamed Shop",
        websiteUrl: request.websiteUrl || null,
        failureReason: request.failureReason || null,
        createdAt: request.createdAt,
      })),

      recentActivity,
    });
  } catch (error: unknown) {
    console.error("Failed to load Admin overview:", error);

    return NextResponse.json(
      {
        error: "Failed to load the Admin overview.",
      },
      {
        status: 500,
      },
    );
  }
}
