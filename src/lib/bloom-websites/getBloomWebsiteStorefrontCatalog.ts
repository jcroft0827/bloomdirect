// src/lib/bloom-websites/getBloomWebsiteStorefrontCatalog.ts

import { connectToDB } from "@/lib/mongoose";

import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";
import Shop from "@/models/Shop";

export type BloomWebsiteCatalogAvailabilityState =
  | "available"
  | "sold_out"
  | "unavailable";

export type BloomWebsiteCatalogProduct = {
  id: string;

  name: string;
  slug: string;

  shortDescription: string;
  description: string;

  category: string;
  occasions: string[];
  tags: string[];

  imageUrl: string;

  startingPrice: number | null;

  isFeatured: boolean;
  soldOut: boolean;

  availabilityState: BloomWebsiteCatalogAvailabilityState;
};

export type BloomWebsiteStorefrontCatalog = {
  website: {
    id: string;

    previewSlug: string;

    siteName: string;

    branding: {
      logo: string;
      primaryColor: string;
      accentColor: string;
    };
  };

  shop: {
    businessName: string;
  };

  products: BloomWebsiteCatalogProduct[];
};

type ObjectIdLike = {
  toString(): string;
};

type WebsiteLean = {
  _id: ObjectIdLike;

  shop: ObjectIdLike;

  previewSlug: string;
  siteName: string;

  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
  };
};

type ShopLean = {
  businessName: string;
};

type ProductLean = {
  _id: ObjectIdLike;

  name: string;
  slug: string;

  shortDescription?: string;
  description?: string;

  category?: string;
  occasions?: string[];
  tags?: string[];

  imageUrl?: string;

  pricingTiers?: Array<{
    label: "standard" | "deluxe" | "premium";
    price: number;
    enabled?: boolean;
  }>;

  inventory?: {
    trackInventory?: boolean;
    quantity?: number;
  };

  availability?: {
    type?: "always" | "date_range";
    startDate?: Date | null;
    endDate?: Date | null;
  };

  isFeatured?: boolean;
  soldOut?: boolean;
};

function getStartingPrice(pricingTiers: ProductLean["pricingTiers"]) {
  const enabledPrices = (pricingTiers || [])
    .filter(
      (tier) =>
        tier.enabled !== false &&
        Number.isFinite(tier.price) &&
        tier.price >= 0,
    )
    .map((tier) => tier.price)
    .sort((a, b) => a - b);

  return enabledPrices[0] ?? null;
}

function getAvailabilityState(
  product: ProductLean,
): BloomWebsiteCatalogAvailabilityState {
  if (product.soldOut === true) {
    return "sold_out";
  }

  if (
    product.inventory?.trackInventory === true &&
    (product.inventory.quantity ?? 0) <= 0
  ) {
    return "sold_out";
  }

  const enabledTierCount = (product.pricingTiers || []).filter(
    (tier) => tier.enabled !== false,
  ).length;

  if (enabledTierCount === 0) {
    return "unavailable";
  }

  if (product.availability?.type === "date_range") {
    const now = new Date();

    if (
      product.availability.startDate &&
      now < product.availability.startDate
    ) {
      return "unavailable";
    }

    if (product.availability.endDate && now > product.availability.endDate) {
      return "unavailable";
    }
  }

  return "available";
}

export async function getBloomWebsiteStorefrontCatalog(
  previewSlug: string,
  ownerShopId?: string,
): Promise<BloomWebsiteStorefrontCatalog | null> {
  await connectToDB();

  const websiteQuery: {
    previewSlug: string;
    shop?: string;
  } = {
    previewSlug: previewSlug.toLowerCase().trim(),
  };

  if (ownerShopId) {
    websiteQuery.shop = ownerShopId;
  }

  const website = (await BloomWebsite.findOne(websiteQuery)
    .select(["_id", "shop", "previewSlug", "siteName", "branding"].join(" "))
    .lean()) as WebsiteLean | null;

  if (!website) {
    return null;
  }

  const shop = (await Shop.findById(website.shop)
    .select("businessName")
    .lean()) as ShopLean | null;

  if (!shop) {
    return null;
  }

  /*
   * This is the authoritative storefront catalog boundary.
   *
   * Inactive products are never exposed.
   *
   * Sold-out and temporarily unavailable products remain
   * visible so the storefront can communicate their state.
   */
  const products = (await BloomWebsiteProduct.find({
    website: website._id,
    shop: website.shop,
    isActive: true,
  })
    .select(
      [
        "_id",
        "name",
        "slug",
        "shortDescription",
        "description",
        "category",
        "occasions",
        "tags",
        "imageUrl",
        "pricingTiers",
        "inventory",
        "availability",
        "isFeatured",
        "soldOut",
        "sortOrder",
        "createdAt",
      ].join(" "),
    )
    .sort({
      isFeatured: -1,
      sortOrder: 1,
      createdAt: -1,
    })
    .lean()) as unknown as ProductLean[];

  return {
    website: {
      id: website._id.toString(),

      previewSlug: website.previewSlug,

      siteName: website.siteName,

      branding: {
        logo: website.branding?.logo || "",

        primaryColor: website.branding?.primaryColor || "#654783",

        accentColor: website.branding?.accentColor || "#37a156",
      },
    },

    shop: {
      businessName: shop.businessName,
    },

    products: products.map((product) => ({
      id: product._id.toString(),

      name: product.name,

      slug: product.slug,

      shortDescription: product.shortDescription || "",

      description: product.description || "",

      category: product.category || "Everyday",

      occasions: product.occasions || [],

      tags: product.tags || [],

      imageUrl: product.imageUrl || "",

      startingPrice: getStartingPrice(product.pricingTiers),

      isFeatured: product.isFeatured === true,

      soldOut: product.soldOut === true,

      availabilityState: getAvailabilityState(product),
    })),
  };
}
