// src/lib/bloom-websites/getBloomWebsiteStorefrontProduct.ts

import { connectToDB } from "@/lib/mongoose";

import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";
import Shop from "@/models/Shop";
import { normalizeBloomWebsiteStorefrontTheme } from "@/lib/bloom-websites/storefront-theme";
import {
  getBloomWebsiteConfiguredDeliveryZipCodes,
  normalizeBloomWebsiteBusinessHours,
  normalizeBloomWebsiteLocalSeoContent,
} from "@/lib/bloom-websites/storefront-seo";

import type {
  BloomWebsiteAvailabilityType,
  BloomWebsitePurchasabilityState,
  BloomWebsiteStorefrontAddon,
  BloomWebsiteStorefrontProductPage,
} from "@/types/bloom-website";

type ObjectIdLike = {
  toString(): string;
};

type WebsiteLean = {
  _id: ObjectIdLike;

  shop: ObjectIdLike;

  previewSlug: string;
  siteName: string;

  status: "preview" | "live" | "paused";

  theme: "bloom-classic";

  branding?: {
    logo?: string;

    tagline?: string;

    primaryColor?: string;
    accentColor?: string;

    backgroundStyle?: string;
  };

  homepage?: {
    heroHeadline?: string;
    heroSubheadline?: string;
    heroImage?: string;
    aboutText?: string;
  };

  seo?: {
    homepageTitle?: string;
    homepageDescription?: string;
    socialTitle?: string;
    socialDescription?: string;
    socialImageUrl?: string;
    businessDescription?: string;
    googleBusinessProfileUrl?: string;
    googleSiteVerification?: string;
    bingSiteVerification?: string;
    businessHours?: Array<{
      day?: "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";
      enabled?: boolean;
      opens?: string;
      closes?: string;
    }>;
    localDelivery?: {
      localDeliveryNote?: string;
      serviceCities?: string[];
      neighborhoods?: string[];
      hospitals?: string[];
      funeralHomes?: string[];
      seniorLiving?: string[];
      schools?: string[];
      venues?: string[];
      businesses?: string[];
    };
  };

  announcement?: {
    enabled?: boolean;
    message?: string;
    scheduleEnabled?: boolean;
    startsAtDate?: string;
    startsAtTime?: string;
    endsAtDate?: string;
    endsAtTime?: string;
  };

  orderPolicy?: {
    allowsSameDay?: boolean;
    sameDayCutoff?: string;
    minProductTotal?: number;
  };

  settings?: {
    showPhone?: boolean;
    showAddress?: boolean;
    showSocialLinks?: boolean;
  };
};

type ShopLean = {
  businessName: string;
  email: string;

  contact?: {
    phone?: string;
  };

  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };

  delivery?: {
    method?: string;
    zipZones?: Array<{ zip?: string }>;
  };

  branding?: {
    socialLinks?: {
      instagram?: string;
      facebook?: string;
      pinterest?: string;
      tiktok?: string;
    };
  };
};

type ProductLean = {
  _id: ObjectIdLike;

  sku?: string;

  name: string;
  slug: string;

  shortDescription?: string;
  description?: string;

  category?: string;

  occasions?: string[];
  tags?: string[];

  imageUrl?: string;
  galleryImages?: string[];

  pricingTiers?: Array<{
    label: "standard" | "deluxe" | "premium";

    price: number;

    description?: string;

    imageUrl?: string;

    enabled?: boolean;
  }>;

  taxable?: boolean;

  inventory?: {
    trackInventory?: boolean;
    quantity?: number;
  };

  availability?: {
    type?: "always" | "date_range";
    startDate?: Date | null;
    endDate?: Date | null;
  };

  seo?: {
    title?: string;
    description?: string;
    imageAltText?: string;

    allowIndexing?: boolean;

    canonicalUrl?: string;

    socialTitle?: string;
    socialDescription?: string;
    socialImageUrl?: string;
  };

  availableAddons?: ObjectIdLike[];

  allowsSubstitutions?: boolean;

  localOnly?: boolean;

  isFeatured?: boolean;

  soldOut?: boolean;
};

type AddonLean = {
  _id: ObjectIdLike;

  name: string;
  slug: string;

  description?: string;

  category?: string;

  imageUrl?: string;
  galleryImages?: string[];

  imageAltText?: string;

  price: number;

  taxable?: boolean;

  isUniversal?: boolean;

  eligibleProductCategories?: string[];

  maxQuantity?: number;

  inventory?: {
    trackInventory?: boolean;
    quantity?: number;
  };

  availability?: {
    type?: "always" | "date_range";
    startDate?: Date | null;
    endDate?: Date | null;
  };

  soldOut?: boolean;

  sortOrder?: number;
};

function serializeDate(value?: Date | null) {
  if (!value) {
    return "";
  }

  return value.toISOString();
}

function getPurchasabilityState({
  soldOut,
  trackInventory,
  inventoryQuantity,
  availabilityType,
  startDate,
  endDate,
}: {
  soldOut: boolean;

  trackInventory: boolean;
  inventoryQuantity: number;

  availabilityType: BloomWebsiteAvailabilityType;

  startDate?: Date | null;
  endDate?: Date | null;
}): BloomWebsitePurchasabilityState {
  if (soldOut) {
    return "sold_out";
  }

  if (trackInventory && inventoryQuantity <= 0) {
    return "sold_out";
  }

  if (availabilityType === "date_range") {
    const now = new Date();

    if (startDate && now < startDate) {
      return "unavailable";
    }

    if (endDate && now > endDate) {
      return "unavailable";
    }
  }

  return "available";
}

function normalizeCategory(value: string) {
  return value.trim().toLowerCase();
}

function universalAddonMatchesProduct({
  addonCategories,
  productCategory,
}: {
  addonCategories: string[];
  productCategory: string;
}) {
  if (addonCategories.length === 0) {
    return true;
  }

  const normalizedProductCategory = normalizeCategory(productCategory);

  return addonCategories.some(
    (category) => normalizeCategory(category) === normalizedProductCategory,
  );
}

export async function getBloomWebsiteStorefrontProduct(
  previewSlug: string,
  productSlug: string,
  ownerShopId?: string,
): Promise<BloomWebsiteStorefrontProductPage | null> {
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
    .select(
      [
        "_id",
        "shop",
        "previewSlug",
        "siteName",
        "status",
        "theme",
        "branding",
        "homepage",
        "seo",
        "announcement",
        "orderPolicy",
        "settings",
      ].join(" "),
    )
    .lean()) as WebsiteLean | null;

  if (!website) {
    return null;
  }

  const product = (await BloomWebsiteProduct.findOne({
    website: website._id,
    shop: website.shop,

    slug: productSlug.toLowerCase().trim(),

    isActive: true,
  })
    .select(
      [
        "_id",
        "sku",
        "name",
        "slug",
        "shortDescription",
        "description",
        "category",
        "occasions",
        "tags",
        "imageUrl",
        "galleryImages",
        "pricingTiers",
        "taxable",
        "inventory",
        "availability",
        "seo",
        "availableAddons",
        "allowsSubstitutions",
        "localOnly",
        "isFeatured",
        "soldOut",
      ].join(" "),
    )
    .lean()) as unknown as ProductLean | null;

  if (!product) {
    return null;
  }

  const shop = (await Shop.findById(website.shop)
    .select(
      [
        "businessName",
        "email",
        "contact.phone",
        "address.street",
        "address.city",
        "address.state",
        "address.zip",
        "address.country",
        "branding.socialLinks",
        "delivery.method",
        "delivery.zipZones.zip",
      ].join(" "),
    )
    .lean()) as ShopLean | null;

  if (!shop) {
    return null;
  }

  const productCategory = product.category || "Everyday";

  const specificAddonIds =
    product.availableAddons?.map((addonId) => addonId.toString()) ?? [];

  /*
   * Load:
   *
   * 1. Every active universal add-on.
   * 2. Every active add-on manually attached
   *    to this product.
   *
   * We then apply universal category matching
   * in application code below.
   */
  const addonQueryConditions: Array<Record<string, unknown>> = [
    {
      isUniversal: true,
    },
  ];

  if (specificAddonIds.length > 0) {
    addonQueryConditions.push({
      _id: {
        $in: specificAddonIds,
      },
    });
  }

  const addonsRaw = (await BloomWebsiteAddon.find({
    website: website._id,

    shop: website.shop,

    isActive: true,

    $or: addonQueryConditions,
  })
    .select(
      [
        "_id",
        "name",
        "slug",
        "description",
        "category",
        "imageUrl",
        "galleryImages",
        "imageAltText",
        "price",
        "taxable",
        "isUniversal",
        "eligibleProductCategories",
        "maxQuantity",
        "inventory",
        "availability",
        "soldOut",
        "sortOrder",
      ].join(" "),
    )
    .sort({
      sortOrder: 1,
      createdAt: 1,
    })
    .lean()) as unknown as AddonLean[];

  const specificAddonIdSet = new Set(specificAddonIds);

  const addons = addonsRaw.filter((addon) => {
    if (addon.isUniversal) {
      return universalAddonMatchesProduct({
        addonCategories: addon.eligibleProductCategories ?? [],

        productCategory,
      });
    }

    return specificAddonIdSet.has(addon._id.toString());
  });

  const storefrontAddons: BloomWebsiteStorefrontAddon[] = addons.map(
    (addon) => {
      const availabilityType = addon.availability?.type ?? "always";

      const trackInventory = addon.inventory?.trackInventory === true;

      const inventoryQuantity = addon.inventory?.quantity ?? 0;

      return {
        id: addon._id.toString(),

        name: addon.name,

        slug: addon.slug,

        description: addon.description || "",

        category: addon.category || "Extras",

        imageUrl: addon.imageUrl || "",

        galleryImages: addon.galleryImages || [],

        imageAltText: addon.imageAltText || "",

        price: addon.price,

        taxable: addon.taxable !== false,

        maxQuantity: Math.max(1, addon.maxQuantity ?? 1),

        isUniversal: addon.isUniversal === true,

        eligibleProductCategories: addon.eligibleProductCategories ?? [],

        inventory: {
          trackInventory,

          quantity: inventoryQuantity,
        },

        availability: {
          type: availabilityType,

          startDate: serializeDate(addon.availability?.startDate),

          endDate: serializeDate(addon.availability?.endDate),
        },

        availabilityState: getPurchasabilityState({
          soldOut: addon.soldOut === true,

          trackInventory,

          inventoryQuantity,

          availabilityType,

          startDate: addon.availability?.startDate,

          endDate: addon.availability?.endDate,
        }),
      };
    },
  );

  const availabilityType = product.availability?.type ?? "always";

  const trackInventory = product.inventory?.trackInventory === true;

  const inventoryQuantity = product.inventory?.quantity ?? 0;

  const storefrontTheme = normalizeBloomWebsiteStorefrontTheme({
    themeName: website.theme,

    logo: website.branding?.logo,

    tagline: website.branding?.tagline,

    primaryColor: website.branding?.primaryColor,

    accentColor: website.branding?.accentColor,

    backgroundStyle: website.branding?.backgroundStyle,
  });

  return {
    website: {
      id: website._id.toString(),

      previewSlug: website.previewSlug,

      siteName: website.siteName,

      status: website.status,

      theme: storefrontTheme.themeName,

      branding: {
        logo: storefrontTheme.logo,

        tagline: storefrontTheme.tagline,

        primaryColor: storefrontTheme.primaryColor,

        accentColor: storefrontTheme.accentColor,
      },

      storefrontTheme,

      homepage: {
        heroHeadline:
          website.homepage?.heroHeadline ||
          `Beautiful flowers from ${website.siteName}.`,

        heroSubheadline:
          website.homepage?.heroSubheadline ||
          "Fresh flowers for life's meaningful moments, designed and delivered by your local florist.",

        heroImage: website.homepage?.heroImage || "",

        aboutText: website.homepage?.aboutText || "",
      },

      seo: {
        homepageTitle: website.seo?.homepageTitle?.trim() || "",
        homepageDescription: website.seo?.homepageDescription?.trim() || "",
        socialTitle: website.seo?.socialTitle?.trim() || "",
        socialDescription: website.seo?.socialDescription?.trim() || "",
        socialImageUrl: website.seo?.socialImageUrl?.trim() || "",
        businessDescription: website.seo?.businessDescription?.trim() || "",
        googleBusinessProfileUrl:
          website.seo?.googleBusinessProfileUrl?.trim() || "",
        googleSiteVerification:
          website.seo?.googleSiteVerification?.trim() || "",
        bingSiteVerification:
          website.seo?.bingSiteVerification?.trim() || "",
        businessHours: normalizeBloomWebsiteBusinessHours(
          website.seo?.businessHours,
        ),
        localDelivery: {
          ...normalizeBloomWebsiteLocalSeoContent(
            website.seo?.localDelivery,
          ),
          serviceZipCodes: getBloomWebsiteConfiguredDeliveryZipCodes({
            method: shop.delivery?.method,
            zipZones: shop.delivery?.zipZones,
          }),
        },
      },

      announcement: {
        enabled: website.announcement?.enabled === true,

        message: website.announcement?.message?.trim() || "",

        scheduleEnabled: website.announcement?.scheduleEnabled === true,

        startsAtDate: website.announcement?.startsAtDate || "",

        startsAtTime: website.announcement?.startsAtTime || "",

        endsAtDate: website.announcement?.endsAtDate || "",

        endsAtTime: website.announcement?.endsAtTime || "",

        /*
         * Product pages do not currently render the
         * announcement bar themselves, so this value
         * is only satisfying the shared storefront
         * website contract here.
         *
         * The homepage/storefront loader remains the
         * authoritative place that evaluates schedule
         * activity in the florist timezone.
         */
        isActive: false,
      },

      orderPolicy: {
        allowsSameDay: website.orderPolicy?.allowsSameDay !== false,

        sameDayCutoff: website.orderPolicy?.sameDayCutoff || "14:00",

        minProductTotal: Math.max(0, website.orderPolicy?.minProductTotal || 0),
      },

      settings: {
        showPhone: website.settings?.showPhone !== false,

        showAddress: website.settings?.showAddress !== false,

        showSocialLinks: website.settings?.showSocialLinks !== false,
      },
    },

    shop: {
      businessName: shop.businessName,

      email: shop.email,

      phone: shop.contact?.phone || "",

      address: {
        street: shop.address?.street || "",

        city: shop.address?.city || "",

        state: shop.address?.state || "",

        zip: shop.address?.zip || "",

        country: shop.address?.country || "US",
      },

      socialLinks: {
        instagram: shop.branding?.socialLinks?.instagram || "",

        facebook: shop.branding?.socialLinks?.facebook || "",

        pinterest: shop.branding?.socialLinks?.pinterest || "",

        tiktok: shop.branding?.socialLinks?.tiktok || "",
      },
    },

    product: {
      id: product._id.toString(),

      sku: product.sku || "",

      name: product.name,

      slug: product.slug,

      shortDescription: product.shortDescription || "",

      description: product.description || "",

      category: productCategory,

      occasions: product.occasions || [],

      tags: product.tags || [],

      imageUrl: product.imageUrl || "",

      galleryImages: product.galleryImages || [],

      pricingTiers:
        product.pricingTiers
          ?.filter((tier) => tier.enabled !== false)
          .map((tier) => ({
            label: tier.label,

            price: tier.price,

            description: tier.description || "",

            imageUrl: tier.imageUrl || "",

            enabled: tier.enabled !== false,
          })) ?? [],

      taxable: product.taxable !== false,

      inventory: {
        trackInventory,

        quantity: inventoryQuantity,
      },

      availability: {
        type: availabilityType,

        startDate: serializeDate(product.availability?.startDate),

        endDate: serializeDate(product.availability?.endDate),
      },

      availabilityState: getPurchasabilityState({
        soldOut: product.soldOut === true,

        trackInventory,

        inventoryQuantity,

        availabilityType,

        startDate: product.availability?.startDate,

        endDate: product.availability?.endDate,
      }),

      seo: {
        title: product.seo?.title || "",

        description: product.seo?.description || "",

        imageAltText: product.seo?.imageAltText || "",

        allowIndexing: product.seo?.allowIndexing !== false,

        canonicalUrl: product.seo?.canonicalUrl || "",

        socialTitle: product.seo?.socialTitle || "",

        socialDescription: product.seo?.socialDescription || "",

        socialImageUrl: product.seo?.socialImageUrl || "",
      },

      allowsSubstitutions: product.allowsSubstitutions !== false,

      localOnly: product.localOnly !== false,

      isFeatured: product.isFeatured === true,

      soldOut: product.soldOut === true,

      addons: storefrontAddons,
    },
  };
}
