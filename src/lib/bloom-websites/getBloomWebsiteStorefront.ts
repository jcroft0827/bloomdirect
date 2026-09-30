// src/lib/bloom-websites/getBloomWebsiteStorefront.ts

import { normalizeBloomWebsiteStorefrontTheme } from "@/lib/bloom-websites/storefront-theme";
import {
  normalizeBloomWebsiteHeroInfoCardContent,
  normalizeBloomWebsiteHomepageSectionContent,
  normalizeBloomWebsiteTrustPoints,
} from "@/lib/bloom-websites/storefront-content";
import { DEFAULT_BLOOM_WEBSITE_HERO_SUBHEADLINE } from "@/lib/bloom-websites/branding-copy";
import {
  getBloomWebsiteConfiguredDeliveryZipCodes,
  normalizeBloomWebsiteBusinessHours,
  normalizeBloomWebsiteLocalSeoContent,
} from "@/lib/bloom-websites/storefront-seo";
import { connectToDB } from "@/lib/mongoose";

import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";
import Shop from "@/models/Shop";

import type {
  BloomWebsiteStorefront,
  BloomWebsiteThemeName,
} from "@/types/bloom-website";

type BloomWebsiteLean = {
  _id: {
    toString(): string;
  };

  shop: {
    toString(): string;
  };

  previewSlug: string;
  siteName: string;

  status: "preview" | "live" | "paused";

  theme?: string;

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
    heroInfoCard?: unknown;
    trustPoints?: unknown;
    aboutText?: string;
    sectionContent?: unknown;
  };

  aboutPage?: {
    enabled?: boolean;
    heading?: string;
    contentMode?: "custom" | "guided";
    facts?: {
      openingYear?: string;
      founderNames?: string;
      originStory?: string;
      specialties?: string;
      community?: string;
      servicePhilosophy?: string;
      differentiators?: string;
    };
    sections?: Array<{
      key?: "story" | "specialties" | "community";
      enabled?: boolean;
      title?: string;
      body?: string;
      sortOrder?: number;
    }>;
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
    timezone?: string;
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

type BloomWebsiteProductLean = {
  _id: {
    toString(): string;
  };

  name: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  category?: string;
  occasions?: string[];
  tags?: string[];
  imageUrl?: string;

  pricingTiers?: Array<{
    label: "standard" | "deluxe" | "premium";

    price: number;

    description?: string;
    imageUrl?: string;

    enabled: boolean;
  }>;

  allowsSubstitutions?: boolean;

  localOnly?: boolean;

  isFeatured?: boolean;

  soldOut?: boolean;
};

function getLocalDateTime(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function isAnnouncementActive(input: {
  enabled: boolean;
  message: string;
  scheduleEnabled: boolean;
  startsAtDate: string;
  startsAtTime: string;
  endsAtDate: string;
  endsAtTime: string;
  timezone: string;
}) {
  if (!input.enabled || !input.message.trim()) {
    return false;
  }

  if (!input.scheduleEnabled) {
    return true;
  }

  const now = getLocalDateTime(new Date(), input.timezone);

  const nowValue = `${now.date}T${now.time}`;

  if (input.startsAtDate && input.startsAtTime) {
    const startValue = `${input.startsAtDate}T${input.startsAtTime}`;

    if (nowValue < startValue) {
      return false;
    }
  }

  if (input.endsAtDate && input.endsAtTime) {
    const endValue = `${input.endsAtDate}T${input.endsAtTime}`;

    if (nowValue > endValue) {
      return false;
    }
  }

  return true;
}

export async function getBloomWebsiteStorefront(
  previewSlug: string,
  ownerShopId?: string,
): Promise<BloomWebsiteStorefront | null> {
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
        "aboutPage",
        "seo",
        "announcement",
        "orderPolicy",
        "settings",
      ].join(" "),
    )
    .lean()) as BloomWebsiteLean | null;

  if (!website) {
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
        "address.timezone",
        "branding.socialLinks",
        "delivery.method",
        "delivery.zipZones.zip",
      ].join(" "),
    )
    .lean()) as ShopLean | null;

  if (!shop) {
    return null;
  }

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
        "description",
        "shortDescription",
        "category",
        "occasions",
        "tags",
        "imageUrl",
        "pricingTiers",
        "allowsSubstitutions",
        "localOnly",
        "isFeatured",
        "soldOut",
      ].join(" "),
    )
    .sort({
      isFeatured: -1,
      sortOrder: 1,
      createdAt: -1,
    })
    .lean()) as unknown as BloomWebsiteProductLean[];

  const storefrontTheme = normalizeBloomWebsiteStorefrontTheme({
    themeName: website.theme,

    logo: website.branding?.logo,

    tagline: website.branding?.tagline,

    primaryColor: website.branding?.primaryColor,

    accentColor: website.branding?.accentColor,

    backgroundStyle: website.branding?.backgroundStyle,
  });

  const timezone = shop.address?.timezone || "America/New_York";

  const announcement = {
    enabled: website.announcement?.enabled === true,

    message: website.announcement?.message?.trim() || "",

    scheduleEnabled: website.announcement?.scheduleEnabled === true,

    startsAtDate: website.announcement?.startsAtDate || "",

    startsAtTime: website.announcement?.startsAtTime || "",

    endsAtDate: website.announcement?.endsAtDate || "",

    endsAtTime: website.announcement?.endsAtTime || "",
  };

  const announcementIsActive = isAnnouncementActive({
    ...announcement,
    timezone,
  });

  return {
    website: {
      id: website._id.toString(),

      previewSlug: website.previewSlug,

      siteName: website.siteName,

      status: website.status,

      theme: storefrontTheme.themeName as BloomWebsiteThemeName,

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
          DEFAULT_BLOOM_WEBSITE_HERO_SUBHEADLINE,

        heroImage: website.homepage?.heroImage || "",

        heroInfoCard: normalizeBloomWebsiteHeroInfoCardContent(
          website.homepage?.heroInfoCard,
        ),

        trustPoints: normalizeBloomWebsiteTrustPoints(
          website.homepage?.trustPoints,
        ),

        aboutText: website.homepage?.aboutText || "",

        sectionContent: normalizeBloomWebsiteHomepageSectionContent(
          website.homepage?.sectionContent,
        ),
      },

      aboutPage: {
        enabled: website.aboutPage?.enabled !== false,
        heading: website.aboutPage?.heading?.trim() || "About Us",
        contentMode:
          website.aboutPage?.contentMode === "custom" ? "custom" : "guided",
        facts: {
          openingYear: website.aboutPage?.facts?.openingYear?.trim() || "",
          founderNames: website.aboutPage?.facts?.founderNames?.trim() || "",
          originStory: website.aboutPage?.facts?.originStory?.trim() || "",
          specialties: website.aboutPage?.facts?.specialties?.trim() || "",
          community: website.aboutPage?.facts?.community?.trim() || "",
          servicePhilosophy:
            website.aboutPage?.facts?.servicePhilosophy?.trim() || "",
          differentiators:
            website.aboutPage?.facts?.differentiators?.trim() || "",
        },
        sections: (() => {
          const fallbackStory = website.homepage?.aboutText?.trim() || "";
          const defaults = [
            {
              key: "story" as const,
              enabled: true,
              title: "Our Story",
              body: fallbackStory,
              sortOrder: 0,
            },
            {
              key: "specialties" as const,
              enabled: true,
              title: "What We Do Best",
              body: "",
              sortOrder: 1,
            },
            {
              key: "community" as const,
              enabled: true,
              title: "Rooted in Our Community",
              body: "",
              sortOrder: 2,
            },
          ];

          const byKey = new Map(
            (website.aboutPage?.sections || [])
              .filter((section) =>
                ["story", "specialties", "community"].includes(
                  section.key || "",
                ),
              )
              .map((section) => [section.key, section]),
          );

          return defaults
            .map((section) => {
              const stored = byKey.get(section.key);

              return {
                key: section.key,
                enabled: stored?.enabled !== false,
                title: stored?.title?.trim() || section.title,
                body:
                  stored?.body?.trim() ||
                  (section.key === "story" ? fallbackStory : section.body),
                sortOrder:
                  typeof stored?.sortOrder === "number"
                    ? stored.sortOrder
                    : section.sortOrder,
              };
            })
            .sort((a, b) => a.sortOrder - b.sortOrder);
        })(),
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
        ...announcement,
        isActive: announcementIsActive,
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

    products: products.map((product) => ({
      id: product._id.toString(),

      name: product.name,

      slug: product.slug,

      description: product.description || "",

      shortDescription: product.shortDescription || "",

      category: product.category || "Everyday",
      occasions: Array.isArray(product.occasions)
        ? product.occasions.filter(Boolean)
        : [],
      tags: Array.isArray(product.tags) ? product.tags.filter(Boolean) : [],
      imageUrl: product.imageUrl || "",

      pricingTiers:
        product.pricingTiers
          ?.filter((tier) => tier.enabled)
          .map((tier) => ({
            label: tier.label,
            price: tier.price,
            description: tier.description || "",
            imageUrl: tier.imageUrl || "",
            enabled: tier.enabled !== false,
          })) || [],

      allowsSubstitutions: product.allowsSubstitutions !== false,

      localOnly: product.localOnly !== false,

      isFeatured: product.isFeatured === true,

      soldOut: product.soldOut === true,
    })),
  };
}
