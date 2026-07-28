import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  getShopReadiness,
  type ShopReadiness,
} from "@/lib/shops/getShopReadiness";
import { EmailEvent } from "@/models/EmailEvent";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

const READINESS_REMINDER_TYPE = "SHOP_READINESS_REMINDER";
const READINESS_REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

type AccountRiskLevel = "low" | "review" | "likely_spam";

type AccountRiskReason =
  | "EMAIL_UNVERIFIED"
  | "NO_PHONE"
  | "NO_LOCATION"
  | "NO_WEBSITE"
  | "VERY_LOW_READINESS"
  | "NO_LOGIN_ACTIVITY"
  | "RANDOM_LOOKING_BUSINESS_NAME";

type AccountRisk = {
  level: AccountRiskLevel;
  score: number;
  reasons: AccountRiskReason[];
};

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
  lastActivity?: Date;

  verification?: {
    emailVerified?: boolean;
  };

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    geoLocation?: {
      coordinates?: number[];
    };
  };

  contact?: {
    phone?: string;
    website?: string;
  };

  readiness: ShopReadiness;
};

function hasText(value?: string | null): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasUsableLocation(
  address?: AdminCustomerResponse["address"],
): boolean {
  if (!address) {
    return false;
  }

  const hasAddress =
    hasText(address.street) &&
    hasText(address.city) &&
    hasText(address.state) &&
    hasText(address.zip);

  const coordinates = address.geoLocation?.coordinates;

  const hasCoordinates =
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    coordinates.some(
      (coordinate) =>
        typeof coordinate === "number" &&
        Number.isFinite(coordinate) &&
        coordinate !== 0,
    );

  return hasAddress || hasCoordinates;
}

/**
 * Detects names that resemble generated registration spam.
 *
 * This is intentionally conservative. A random-looking name adds risk points,
 * but never causes an automatic account action.
 */
function looksRandomlyGenerated(value?: string | null): boolean {
  if (!hasText(value)) {
    return false;
  }

  const name = value!.trim();

  if (name.length < 12 || name.includes(" ")) {
    return false;
  }

  const containsUppercase = /[A-Z]/.test(name);
  const containsLowercase = /[a-z]/.test(name);
  const containsNumber = /\d/.test(name);

  const vowelCount = (name.match(/[aeiou]/gi) || []).length;
  const vowelRatio = vowelCount / name.length;

  const hasMixedCharacterTypes =
    containsUppercase && containsLowercase && containsNumber;

  const unusuallyLowVowelRatio = vowelRatio < 0.2;

  return hasMixedCharacterTypes || unusuallyLowVowelRatio;
}

function getAccountAgeInHours(createdAt?: Date): number {
  if (!createdAt) {
    return 0;
  }

  const createdTime = new Date(createdAt).getTime();

  if (!Number.isFinite(createdTime)) {
    return 0;
  }

  return Math.max(0, (Date.now() - createdTime) / (60 * 60 * 1000));
}

function assessAccountRisk(
  shop: AdminCustomerResponse,
  readiness: ShopReadiness,
): AccountRisk {
  let score = 0;

  const reasons: AccountRiskReason[] = [];

  if (shop.verification?.emailVerified !== true) {
    score += 2;
    reasons.push("EMAIL_UNVERIFIED");
  }

  if (!hasText(shop.contact?.phone)) {
    score += 1;
    reasons.push("NO_PHONE");
  }

  if (!hasUsableLocation(shop.address)) {
    score += 2;
    reasons.push("NO_LOCATION");
  }

  if (!hasText(shop.contact?.website)) {
    score += 1;
    reasons.push("NO_WEBSITE");
  }

  if (readiness.completionPercentage <= 17) {
    score += 2;
    reasons.push("VERY_LOW_READINESS");
  }

  const accountAgeHours = getAccountAgeInHours(shop.createdAt);

  /*
   * Give a legitimate new florist time to sign back in before considering a
   * lack of activity suspicious.
   */
  if (accountAgeHours >= 24 && !shop.lastLogin && !shop.lastActivity) {
    score += 1;
    reasons.push("NO_LOGIN_ACTIVITY");
  }

  if (looksRandomlyGenerated(shop.businessName || shop.shopName)) {
    score += 3;
    reasons.push("RANDOM_LOOKING_BUSINESS_NAME");
  }

  let level: AccountRiskLevel = "low";

  if (score >= 6) {
    level = "likely_spam";
  } else if (score >= 3) {
    level = "review";
  }

  return {
    level,
    score,
    reasons,
  };
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

    /*
     * Admin accounts must never appear in florist-management results.
     *
     * Authorization checks must still be repeated inside every future
     * destructive route.
     */
    const shops = await Shop.find({
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
          "suspensionReason",
          "isMarkedSpam",
          "spamReviewReason",
          "markedSpamAt",
          "isArchived",
          "archivedReason",
          "archivedAt",
          "isVerified",
          "verifiedFlorist",
          "createdAt",
          "lastLogin",
          "lastActivity",
          "verification.emailVerified",
          "setupProgress.financialSettings",
          "address",
          "contact",
          "paymentMethods",
          "delivery",
          "financials",
        ].join(" "),
      )
      .sort({
        createdAt: -1,
      });

    const shopIds = shops.map((shop) => String(shop._id));

    const latestReadinessReminders =
      shopIds.length > 0
        ? await EmailEvent.aggregate<{
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
          ])
        : [];

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

      const accountRisk = assessAccountRisk(shop, readiness);

      return {
        _id: shopId,

        businessName: shop.businessName || shop.shopName || "Unnamed Shop",

        shopName: shop.shopName ?? null,
        email: shop.email,
        role: shop.role,

        isPro: shop.isPro === true,
        isPublic: shop.isPublic === true,
        isSuspended: shop.isSuspended === true,
        suspensionReason: shop.suspensionReason ?? null,

        isMarkedSpam: shop.isMarkedSpam === true,
        spamReviewReason: shop.spamReviewReason ?? null,
        markedSpamAt: shop.markedSpamAt?.toISOString?.() ?? null,

        isArchived: shop.isArchived === true,
        archivedReason: shop.archivedReason ?? null,
        archivedAt: shop.archivedAt?.toISOString?.() ?? null,

        isVerified: shop.isVerified === true,
        verifiedFlorist: shop.verifiedFlorist === true,

        createdAt: shop.createdAt,
        lastLogin: shop.lastLogin ?? null,
        lastActivity: shop.lastActivity ?? null,

        address: shop.address ?? null,
        contact: shop.contact ?? null,

        readiness,
        accountRisk,

        readinessReminder: {
          lastSentAt: lastSentAt ? new Date(lastSentAt).toISOString() : null,

          canSendAgain,

          nextAllowedAt: nextAllowedAt ? nextAllowedAt.toISOString() : null,
        },
      };
    });

    const riskSummary = {
      low: customers.filter((customer) => customer.accountRisk.level === "low")
        .length,

      review: customers.filter(
        (customer) => customer.accountRisk.level === "review",
      ).length,

      likelySpam: customers.filter(
        (customer) => customer.accountRisk.level === "likely_spam",
      ).length,
    };

    return NextResponse.json({
      success: true,
      customers,
      riskSummary,
    });
  } catch (error: unknown) {
    console.error("Failed to load admin customers:", error);

    return NextResponse.json(
      {
        error: "Failed to load customers.",
      },
      {
        status: 500,
      },
    );
  }
}
