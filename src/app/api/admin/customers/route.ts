import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  getShopReadiness,
  type ShopReadiness,
} from "@/lib/shops/getShopReadiness";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { EmailEvent } from "@/models/EmailEvent";

type AdminCustomerResponse = {
  _id: unknown;
  businessName?: string;
  shopName?: string;
  email?: string;
  role?: string;

  isPro?: boolean;
  isPublic?: boolean;
  isSuspended?: boolean;

  isVerified?: boolean;
  verifiedFlorist?: boolean;

  createdAt?: Date;
  lastLogin?: Date;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  contact?: {
    phone?: string;
    website?: string;
  };

  readiness: ShopReadiness;
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    const READINESS_REMINDER_TYPE = "SHOP_READINESS_REMINDER";
    const READINESS_REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDB();

    /*
     * Some of these fields are only needed to calculate readiness and are not
     * all returned to the client.
     */
    const shops = await Shop.find({})
      .select(
        [
          "businessName",
          "shopName",
          "email",
          "role",
          "isPro",
          "isPublic",
          "isSuspended",
          "isVerified",
          "verifiedFlorist",
          "createdAt",
          "lastLogin",
          "verification.emailVerified",
          "setupProgress.financialSettings",
          "address",
          "contact",
          "paymentMethods",
          "delivery",
          "financials",
        ].join(" "),
      )
      .sort({ createdAt: -1 });

    const shopIds = shops.map((shop) => String(shop._id));

    const latestReadinessReminders = await EmailEvent.aggregate<{
      _id: string;
      lastSentAt: Date;
    }>([
      {
        $match: {
          type: READINESS_REMINDER_TYPE,
          status: "sent",
          "payload.targetShopId": {
            $in: shopIds,
          },
        },
      },
      {
        $sort: {
          createdAt: -1,
        },
      },
      {
        $group: {
          _id: "$payload.targetShopId",
          lastSentAt: {
            $first: "$createdAt",
          },
        },
      },
    ]);

    const reminderMap = new Map(
      latestReadinessReminders.map((reminder) => [
        String(reminder._id),
        reminder.lastSentAt,
      ]),
    );

    const now = Date.now();

    const customers = shops.map((shop) => {
      const readiness = getShopReadiness(shop);

      const shopId = String(shop._id);
      const lastSentAt = reminderMap.get(shopId) ?? null;

      const nextAllowedAt = lastSentAt
        ? new Date(
            new Date(lastSentAt).getTime() + READINESS_REMINDER_COOLDOWN_MS,
          )
        : null;

      const canSendAgain = !nextAllowedAt || nextAllowedAt.getTime() <= now;

      return {
        _id: shopId,

        businessName: shop.businessName || shop.shopName || "Unnamed Shop",

        shopName: shop.shopName ?? null,
        email: shop.email,
        role: shop.role,
        isPro: shop.isPro === true,
        isPublic: shop.isPublic === true,
        isSuspended: shop.isSuspended === true,
        verifiedFlorist: shop.verifiedFlorist === true,
        createdAt: shop.createdAt,
        lastLogin: shop.lastLogin ?? null,
        address: shop.address ?? null,
        contact: shop.contact ?? null,

        readiness,

        readinessReminder: {
          lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : null,

          canSendAgain,

          nexAllowedAt: nextAllowedAt ? nextAllowedAt.toISOString() : null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error: unknown) {
    console.error("Failed to load admin customers:", error);

    return NextResponse.json(
      { error: "Failed to load customers." },
      { status: 500 },
    );
  }
}
