import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/requireAdmin";
import { connectToDB } from "@/lib/mongoose";
import { getShopReadiness } from "@/lib/shops/getShopReadiness";
import InvitedFlorist from "@/models/InvitedFlorist";
import Shop from "@/models/Shop";

type CustomerSuccessStage =
  | "needs_follow_up"
  | "invited"
  | "onboarding"
  | "active";

type LeanInvitation = {
  _id: unknown;

  shopName: string;
  contactName: string;
  email: string;

  phone?: string;
  website?: string;

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  source?: string;

  status:
    | "draft"
    | "sent"
    | "failed"
    | "registered"
    | "declined";

  notes?: string;

  invitationDestination?: "homepage" | "registration";

  sendCount?: number;
  sendError?: string;

  invitedAt?: Date | null;
  lastSentAt?: Date | null;
  lastContactedAt?: Date | null;
  declinedAt?: Date | null;
  convertedAt?: Date | null;

  registeredShop?: unknown;
};

type LeanShop = {
  _id: unknown;

  businessName?: string | null;
  email?: string | null;
  slug?: string | null;

  role?: string;

  isPublic?: boolean;
  isSuspended?: boolean;
  isArchived?: boolean;
  isPro?: boolean;

  verification?: {
    emailVerified?: boolean;
  } | null;

  setupProgress?: {
    businessInfo?: boolean;
    paymentMethods?: boolean;
    deliverySettings?: boolean;
    financialSettings?: boolean;
  } | null;

  contact?: {
    phone?: string | null;
  } | null;

  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
  } | null;

  paymentMethods?: {
    venmoHandle?: string | null;
    cashAppTag?: string | null;
    zellePhoneOrEmail?: string | null;
    paypalEmail?: string | null;
    defaultPaymentMethod?: string | null;
  } | null;

  delivery?: {
    method?: "zip" | "distance" | null;

    zipZones?: Array<{
      name?: string | null;
      zip?: string | null;
      fee?: number | null;
    }>;

    distanceZones?: Array<{
      min?: number | null;
      max?: number | null;
      fee?: number | null;
    }>;

    fallbackFee?: number | null;
    maxRadius?: number | null;
  } | null;

  financials?: {
    taxPercentage?: number | null;
    deliveryTaxed?: boolean;
    feeTaxed?: boolean;
    feeType?: "%" | "flat" | null;
    feeValue?: number | null;
  } | null;

  createdAt?: Date | null;
  updatedAt?: Date | null;
};

function getDaysSince(date?: Date | string | null) {
  if (!date) return null;

  const value = new Date(date).getTime();

  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.floor(
    (Date.now() - value) / (1000 * 60 * 60 * 24),
  );
}

export async function GET() {
  const admin = await requireAdmin();

  if (!admin.authorized) {
    return NextResponse.json(
      { error: admin.error },
      { status: admin.status },
    );
  }

  try {
    await connectToDB();

    const [invitations, shops] = await Promise.all([
      InvitedFlorist.find({})
        .populate(
          "registeredShop",
          "businessName email slug isPublic isSuspended",
        )
        .sort({ createdAt: -1 })
        .lean<LeanInvitation[]>(),

      Shop.find({
        role: { $ne: "admin" },
        isArchived: { $ne: true },
      })
        .sort({ createdAt: -1 })
        .lean<LeanShop[]>(),
    ]);

    const invitationItems = invitations.map((invitation) => {
      const daysSinceLastContact = getDaysSince(
        invitation.lastContactedAt,
      );

      const needsFollowUp =
        invitation.status === "failed" ||
        (invitation.status === "sent" &&
          (daysSinceLastContact === null ||
            daysSinceLastContact >= 3));

      const stage: CustomerSuccessStage = needsFollowUp
        ? "needs_follow_up"
        : "invited";

      return {
        id: String(invitation._id),
        recordType: "invitation" as const,
        stage,

        shopName: invitation.shopName,
        contactName: invitation.contactName,
        email: invitation.email,

        phone: invitation.phone || "",
        website: invitation.website || "",

        address: {
          street: invitation.address?.street || "",
          city: invitation.address?.city || "",
          state: invitation.address?.state || "",
          zip: invitation.address?.zip || "",
        },

        source: invitation.source || "other",
        status: invitation.status,
        notes: invitation.notes || "",

        invitationDestination:
          invitation.invitationDestination || "registration",

        sendCount: invitation.sendCount || 0,
        sendError: invitation.sendError || "",

        invitedAt: invitation.invitedAt || null,
        lastSentAt: invitation.lastSentAt || null,
        lastContactedAt:
          invitation.lastContactedAt || null,
        declinedAt: invitation.declinedAt || null,
        convertedAt: invitation.convertedAt || null,

        daysSinceLastContact,

        followUpReason:
          invitation.status === "failed"
            ? "Invitation email failed"
            : needsFollowUp
              ? "No recent contact"
              : null,

        registeredShop:
          invitation.registeredShop || null,
      };
    });

    const shopItems = shops.map((shop) => {
      const readiness = getShopReadiness(shop);

      const isActive =
        readiness.capabilities.canSendOrders &&
        readiness.capabilities.canReceiveOrders;

      const stage: CustomerSuccessStage = isActive
        ? "active"
        : "onboarding";

      return {
        id: String(shop._id),
        recordType: "shop" as const,
        stage,

        shopName: shop.businessName || "",
        email: shop.email || "",
        slug: shop.slug || "",

        isPublic: shop.isPublic === true,
        isSuspended: shop.isSuspended === true,
        isPro: shop.isPro === true,

        readiness: {
          requirements: readiness.requirements,
          capabilities: readiness.capabilities,
          incompleteRequirements:
            readiness.incompleteRequirements,
          completedCount: readiness.completedCount,
          totalCount: readiness.totalCount,
          completionPercentage:
            readiness.completionPercentage,
        },

        createdAt: shop.createdAt || null,
        updatedAt: shop.updatedAt || null,
      };
    });

    const invited = invitationItems.filter(
      (item) =>
        item.status !== "registered" &&
        item.status !== "declined" &&
        item.stage === "invited",
    );

    const needsFollowUp = invitationItems.filter(
      (item) =>
        item.status !== "registered" &&
        item.status !== "declined" &&
        item.stage === "needs_follow_up",
    );

    const onboarding = shopItems.filter(
      (item) => item.stage === "onboarding",
    );

    const active = shopItems.filter(
      (item) => item.stage === "active",
    );

    const declined = invitationItems.filter(
      (item) => item.status === "declined",
    );

    return NextResponse.json({
      success: true,

      summary: {
        needsFollowUp: needsFollowUp.length,
        invited: invited.length,
        onboarding: onboarding.length,
        active: active.length,
        declined: declined.length,
      },

      groups: {
        needsFollowUp,
        invited,
        onboarding,
        active,
        declined,
      },
    });
  } catch (error: unknown) {
    console.error(
      "Failed to load Customer Success data:",
      error,
    );

    return NextResponse.json(
      {
        error: "Failed to load Customer Success data.",
      },
      { status: 500 },
    );
  }
}
