// src/app/api/shops/network/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getShopReceivingEligibility } from "@/lib/shops/getShopReceivingEligibility";
import FulfillmentOffering from "@/models/FulfillmentOffering";
import Shop from "@/models/Shop";
import { Types } from "mongoose";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type ObjectIdLike = Types.ObjectId | string;

type PreferredFlorist = ObjectIdLike;

type LeanSendingShop = {
  _id: Types.ObjectId;
  preferredFlorists?: PreferredFlorist[];
  blockedFlorists?: Array<{
    shopId?: ObjectIdLike | null;
  }>;
};

type LeanReview = {
  rating?: number;
};

type LeanNetworkShop = {
  _id: Types.ObjectId;
  businessName?: string;
  slug?: string;
  verifiedFlorist?: boolean;
  isPro?: boolean;
  isPublic?: boolean;
  isSuspended?: boolean;
  isArchived?: boolean;
  isMarkedSpam?: boolean;

  verification?: {
    emailVerified?: boolean;
  };

  contact?: {
    phone?: string;
    website?: string;
  };

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };

  paymentMethods?: {
    venmoHandle?: string;
    cashAppTag?: string;
    zellePhoneOrEmail?: string;
    paypalEmail?: string;
  };

  delivery?: {
    method?: "zip" | "distance";
    zipZones?: Array<{
      name?: string;
      zip?: string;
      fee?: number;
    }>;
    distanceZones?: Array<{
      min?: number;
      max?: number;
      fee?: number;
    }>;
    fallbackFee?: number;
    maxRadius?: number;
    sameDayCutoff?: string;
    allowSameDay?: boolean;
    noMoreOrdersTodayUntil?: Date | null;
  };

  branding?: {
    logo?: string;
    bio?: string;
    primaryColor?: string;
  };

  stats?: {
    ordersCompleted?: number;
    responseRate?: number;
  };

  reviews?: LeanReview[];
};

type LeanOffering = {
  _id: Types.ObjectId;
  shop: Types.ObjectId;
  type?: string;
  name?: string;
  description?: string;
  image?: string;
  pricingTiers?: Array<{
    label?: string;
    price?: number;
    description?: string;
  }>;
  allowsSubstitutions?: boolean;
  isFeatured?: boolean;
  isDesignerChoice?: boolean;
  sortOrder?: number;
};

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeId(value: ObjectIdLike): string {
  return value.toString();
}

function calculateAverageRating(reviews: LeanReview[] | undefined): number {
  const ratings = (reviews ?? [])
    .map((review) => Number(review.rating))
    .filter((rating) => Number.isFinite(rating) && rating > 0);

  if (ratings.length === 0) {
    return 0;
  }

  const total = ratings.reduce((sum, rating) => sum + rating, 0);

  return Number((total / ratings.length).toFixed(1));
}

function isSameDayAvailable(delivery: LeanNetworkShop["delivery"]): boolean {
  if (delivery?.allowSameDay !== true) {
    return false;
  }

  const unavailableUntil = delivery.noMoreOrdersTodayUntil;

  if (!unavailableUntil) {
    return true;
  }

  return new Date(unavailableUntil).getTime() <= Date.now();
}

export async function GET(request: NextRequest) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sendingShop = await Shop.findById(session.user.id)
      .select("_id preferredFlorists blockedFlorists")
      .lean<LeanSendingShop>();

    if (!sendingShop) {
      return NextResponse.json(
        { error: "Sending shop not found." },
        { status: 404 },
      );
    }

    const query = request.nextUrl.searchParams.get("q")?.trim() || "";
    const escapedQuery = escapeRegex(query);

    const searchConditions =
      escapedQuery.length > 0
        ? {
            $or: [
              {
                businessName: {
                  $regex: escapedQuery,
                  $options: "i",
                },
              },
              {
                "address.city": {
                  $regex: escapedQuery,
                  $options: "i",
                },
              },
              {
                "address.state": {
                  $regex: escapedQuery,
                  $options: "i",
                },
              },
              {
                "address.zip": {
                  $regex: escapedQuery,
                  $options: "i",
                },
              },
              {
                "delivery.zipZones.zip": {
                  $regex: escapedQuery,
                  $options: "i",
                },
              },
            ],
          }
        : {};

    const candidates = await Shop.find({
      _id: {
        $ne: sendingShop._id,
      },
      ...searchConditions,
    })
      .sort({
        verifiedFlorist: -1,
        isPro: -1,
        businessName: 1,
      })
      .limit(100)
      .lean<LeanNetworkShop[]>();

    const eligibleShops = candidates.filter((shop) => {
      const eligibility = getShopReceivingEligibility({
        receivingShop: shop,
        sendingShop,
      });

      return eligibility.eligible;
    });

    const shopIds = eligibleShops.map((shop) => shop._id);

    const offerings = await FulfillmentOffering.find({
      shop: {
        $in: shopIds,
      },
      isActive: true,
    })
      .select(
        [
          "_id",
          "shop",
          "type",
          "name",
          "description",
          "image",
          "pricingTiers",
          "allowsSubstitutions",
          "isFeatured",
          "isDesignerChoice",
          "sortOrder",
        ].join(" "),
      )
      .sort({
        shop: 1,
        isFeatured: -1,
        isDesignerChoice: -1,
        sortOrder: 1,
        createdAt: -1,
      })
      .lean<LeanOffering[]>();

    const offeringsByShop = new Map<string, LeanOffering[]>();

    for (const offering of offerings) {
      const shopId = offering.shop.toString();
      const existingOfferings = offeringsByShop.get(shopId) ?? [];

      existingOfferings.push(offering);
      offeringsByShop.set(shopId, existingOfferings);
    }

    const favoriteShopIds = new Set(
      (sendingShop.preferredFlorists ?? []).map(normalizeId),
    );

    const shops = eligibleShops.map((shop) => {
      const shopId = shop._id.toString();
      const shopOfferings = offeringsByShop.get(shopId) ?? [];
      const reviews = shop.reviews ?? [];

      return {
        _id: shopId,
        businessName: shop.businessName || "Unnamed Florist",
        slug: shop.slug || "",
        verifiedFlorist: shop.verifiedFlorist === true,
        isPro: shop.isPro === true,
        isFavorite: favoriteShopIds.has(shopId),

        address: {
          city: shop.address?.city || "",
          state: shop.address?.state || "",
          zip: shop.address?.zip || "",
        },

        contact: {
          phone: shop.contact?.phone || "",
          website: shop.contact?.website || "",
        },

        branding: {
          logo: shop.branding?.logo || "",
          bio: shop.branding?.bio || "",
          primaryColor: shop.branding?.primaryColor || "#059669",
        },

        stats: {
          ordersCompleted: shop.stats?.ordersCompleted || 0,
          responseRate: shop.stats?.responseRate || 0,
        },

        rating: {
          average: calculateAverageRating(reviews),
          count: reviews.filter(
            (review) =>
              Number.isFinite(Number(review.rating)) &&
              Number(review.rating) > 0,
          ).length,
        },

        delivery: {
          method: shop.delivery?.method || "zip",
          maxRadius: shop.delivery?.maxRadius || null,
          sameDayCutoff: shop.delivery?.sameDayCutoff || "",
          allowsSameDay: shop.delivery?.allowSameDay === true,
          sameDayAvailable: isSameDayAvailable(shop.delivery),
          zipCount: shop.delivery?.zipZones?.length || 0,
          distanceZoneCount: shop.delivery?.distanceZones?.length || 0,
        },

        offerings: shopOfferings.map((offering) => ({
          _id: offering._id.toString(),
          type: offering.type || "everyday",
          name: offering.name || "Arrangement",
          description: offering.description || "",
          image: offering.image || "",
          pricingTiers: (offering.pricingTiers ?? []).map((tier) => ({
            label: tier.label || "",
            price: Number(tier.price) || 0,
            description: tier.description || "",
          })),
          allowsSubstitutions: offering.allowsSubstitutions !== false,
          isFeatured: offering.isFeatured === true,
          isDesignerChoice: offering.isDesignerChoice === true,
        })),
      };
    });

    return NextResponse.json({
      shops,
      count: shops.length,
      query,
    });
  } catch (error) {
    console.error("NETWORK SHOP SEARCH ERROR:", error);

    return NextResponse.json(
      {
        error: "Something went wrong while loading the florist network.",
      },
      { status: 500 },
    );
  }
}
