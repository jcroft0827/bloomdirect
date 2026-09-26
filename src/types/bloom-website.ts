// src/types/bloom-website.ts

export type BloomWebsiteStatus = "preview" | "live" | "paused";

export type BloomWebsiteThemeName = "bloom-classic";

export type BloomWebsiteBackgroundStyle =
  | "clean"
  | "soft_floral"
  | "botanical"
  | "romantic"
  | "minimal_texture";

export type BloomWebsiteStorefrontTheme = {
  themeName: BloomWebsiteThemeName;

  logo: string;

  primaryColor: string;
  accentColor: string;

  primaryForeground: "#000000" | "#ffffff";
  accentForeground: "#000000" | "#ffffff";

  tagline: string;

  backgroundStyle: BloomWebsiteBackgroundStyle;
};

export type BloomWebsitePricingTierLabel = "standard" | "deluxe" | "premium";

export type BloomWebsiteAvailabilityType = "always" | "date_range";

export type BloomWebsitePurchasabilityState =
  | "available"
  | "sold_out"
  | "unavailable";

export type BloomWebsiteStorefrontPricingTier = {
  label: BloomWebsitePricingTierLabel;
  price: number;
  enabled: boolean;

  // These are available on richer product-detail queries,
  // but the lightweight homepage catalog does not need them.
  description?: string;
  imageUrl?: string;
};

export type BloomWebsiteStorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  occasions: string[];
  tags: string[];
  imageUrl: string;
  pricingTiers: BloomWebsiteStorefrontPricingTier[];
  allowsSubstitutions: boolean;
  localOnly: boolean;
  isFeatured: boolean;
  soldOut: boolean;
};

export type BloomWebsiteStorefrontWebsite = {
  id: string;

  previewSlug: string;

  siteName: string;

  status: BloomWebsiteStatus;

  theme: BloomWebsiteThemeName;

  /**
   * Raw persisted branding values.
   *
   * Kept here because some editor/admin surfaces still work
   * directly with the stored website branding.
   */
  branding: {
    logo: string;

    tagline: string;

    primaryColor: string;
    accentColor: string;
  };

  /**
   * The normalized customer-facing theme contract.
   *
   * Storefront components should prefer this object instead
   * of inventing their own fallbacks or contrast behavior.
   */
  storefrontTheme: BloomWebsiteStorefrontTheme;

  homepage: {
    heroHeadline: string;
    heroSubheadline: string;
    heroImage: string;
    aboutText: string;
  };

  announcement: {
    enabled: boolean;
    message: string;
    scheduleEnabled: boolean;
    startsAtDate: string;
    startsAtTime: string;
    endsAtDate: string;
    endsAtTime: string;
    isActive: boolean;
  };

  /**
   * BloomWebsites-specific ordering policy.
   *
   * These values must NOT come from GetBloomDirect's
   * florist-to-florist delivery policy.
   */
  orderPolicy: {
    allowsSameDay: boolean;
    sameDayCutoff: string;
    minProductTotal: number;
  };

  settings: {
    showPhone: boolean;
    showAddress: boolean;
    showSocialLinks: boolean;
  };
};

export type BloomWebsiteStorefrontShop = {
  businessName: string;

  email: string;

  phone: string;

  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };

  socialLinks: {
    instagram: string;
    facebook: string;
    pinterest: string;
    tiktok: string;
  };
};

export type BloomWebsiteStorefront = {
  website: BloomWebsiteStorefrontWebsite;

  shop: BloomWebsiteStorefrontShop;

  products: BloomWebsiteStorefrontProduct[];
};

// ======================================================
// PRODUCT DETAIL STOREFRONT TYPES
// ======================================================

export type BloomWebsiteStorefrontAddon = {
  id: string;

  name: string;
  slug: string;

  description: string;

  category: string;

  imageUrl: string;
  galleryImages: string[];
  imageAltText: string;

  price: number;

  taxable: boolean;

  maxQuantity: number;

  isUniversal: boolean;

  eligibleProductCategories: string[];

  inventory: {
    trackInventory: boolean;
    quantity: number;
  };

  availability: {
    type: BloomWebsiteAvailabilityType;
    startDate: string;
    endDate: string;
  };

  availabilityState: BloomWebsitePurchasabilityState;
};

export type BloomWebsiteStorefrontProductDetail = {
  id: string;

  sku: string;

  name: string;
  slug: string;

  shortDescription: string;
  description: string;

  category: string;

  occasions: string[];
  tags: string[];

  imageUrl: string;
  galleryImages: string[];

  pricingTiers: BloomWebsiteStorefrontPricingTier[];

  taxable: boolean;

  inventory: {
    trackInventory: boolean;
    quantity: number;
  };

  availability: {
    type: BloomWebsiteAvailabilityType;
    startDate: string;
    endDate: string;
  };

  availabilityState: BloomWebsitePurchasabilityState;

  seo: {
    title: string;
    description: string;
    imageAltText: string;

    allowIndexing: boolean;

    canonicalUrl: string;

    socialTitle: string;
    socialDescription: string;
    socialImageUrl: string;
  };

  allowsSubstitutions: boolean;

  localOnly: boolean;

  isFeatured: boolean;

  soldOut: boolean;

  addons: BloomWebsiteStorefrontAddon[];
};

export type BloomWebsiteStorefrontProductPage = {
  website: BloomWebsiteStorefrontWebsite;

  shop: BloomWebsiteStorefrontShop;

  product: BloomWebsiteStorefrontProductDetail;
};
