// src/types/bloom-website.ts

export type BloomWebsiteStatus = "preview" | "live" | "paused";

export type BloomWebsiteThemeName = "bloom-classic" | "bloom-elegant";

export type BloomWebsiteLogoSize = "small" | "standard" | "large" | "xlarge";
export type BloomWebsiteButtonCorners = "subtle" | "rounded" | "pill";


export type BloomWebsiteHeroTextStyle = "light" | "dark";

export type BloomWebsiteHeroOverlay = "none" | "soft" | "medium" | "strong";

export type BloomWebsiteHeroAlignment = "left" | "center";

export type BloomWebsiteHeroImagePosition = "top" | "center" | "bottom";

export type BloomWebsiteHeroCtaDestination =
  | "shop"
  | "about"
  | "custom"
  | "none";

export type BloomWebsiteHeroSlide = {
  id: string;
  headline: string;
  subheadline: string;
  imageUrl: string;
  textStyle: BloomWebsiteHeroTextStyle;
  overlay: BloomWebsiteHeroOverlay;
  alignment: BloomWebsiteHeroAlignment;
  imagePosition: BloomWebsiteHeroImagePosition;
  ctaLabel: string;
  ctaDestination: BloomWebsiteHeroCtaDestination;
  ctaHref: string;
};

export type BloomWebsiteBackgroundStyle =
  | "clean"
  | "soft_floral"
  | "botanical"
  | "romantic"
  | "minimal_texture";

export type BloomWebsiteStorefrontTheme = {
  themeName: BloomWebsiteThemeName;

  logo: string;
  logoSize: BloomWebsiteLogoSize;
  buttonCorners: BloomWebsiteButtonCorners;

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

export type BloomWebsiteBusinessDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type BloomWebsiteBusinessHour = {
  day: BloomWebsiteBusinessDay;
  enabled: boolean;
  opens: string;
  closes: string;
};



export type BloomWebsiteHomepageSectionKey =
  | "occasions"
  | "featured"
  | "merchandising"
  | "about"
  | "trust"
  | "delivery"
  | "contact";

export type BloomWebsiteHomepageSectionVisibility = Record<
  BloomWebsiteHomepageSectionKey,
  boolean
>;

export type BloomWebsiteHomepageMerchandisingSource =
  | "featured"
  | "occasion"
  | "category"
  | "all";

export type BloomWebsiteHomepageMerchandisingSection = {
  id: string;
  enabled: boolean;
  eyebrow: string;
  heading: string;
  description: string;
  sourceType: BloomWebsiteHomepageMerchandisingSource;
  sourceValue: string;
  productLimit: number;
};

export type BloomWebsiteHomepageSectionText = {
  eyebrow: string;
  heading: string;
  description: string;
};

export type BloomWebsiteHomepageSectionContent = {
  occasions: BloomWebsiteHomepageSectionText;
  featured: BloomWebsiteHomepageSectionText;
  about: BloomWebsiteHomepageSectionText;
  trust: BloomWebsiteHomepageSectionText;
  delivery: BloomWebsiteHomepageSectionText;
  contact: BloomWebsiteHomepageSectionText;
};

export type BloomWebsiteHeroInfoCardContent = {
  eyebrow: string;
  heading: string;
  description: string;
};

export type BloomWebsiteTrustPoint = {
  title: string;
  description: string;
};

export type BloomWebsiteLocalSeoContent = {
  localDeliveryNote: string;
  serviceCities: string[];
  neighborhoods: string[];
  hospitals: string[];
  funeralHomes: string[];
  seniorLiving: string[];
  schools: string[];
  venues: string[];
  businesses: string[];
};

export type BloomWebsiteAboutSectionKey =
  | "story"
  | "specialties"
  | "community"
  | "extra1" | "extra2" | "extra3";

export type BloomWebsiteTextAlignment = "left" | "center" | "right";

export type BloomWebsiteAboutSection = {
  /** Legacy single alignment value retained for backward compatibility. */
  textAlignment?: BloomWebsiteTextAlignment;
  desktopTextAlignment?: BloomWebsiteTextAlignment;
  mobileTextAlignment?: BloomWebsiteTextAlignment;
  key: BloomWebsiteAboutSectionKey;
  enabled: boolean;
  title: string;
  body: string;
  sortOrder: number;
};

export type BloomWebsiteAboutFacts = {
  openingYear: string;
  founderNames: string;
  originStory: string;
  specialties: string;
  community: string;
  servicePhilosophy: string;
  differentiators: string;
};

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

export type BloomWebsiteWeddingFloralDecoration =
  | "none"
  | "softBorder";

export type BloomWebsiteWeddingsPage = {
  floralDecoration?: BloomWebsiteWeddingFloralDecoration;
  /** Legacy single alignment values retained for backward compatibility. */
  headingAlignment?: BloomWebsiteTextAlignment;
  contentAlignment?: BloomWebsiteTextAlignment;
  headingAlignmentDesktop?: BloomWebsiteTextAlignment;
  headingAlignmentMobile?: BloomWebsiteTextAlignment;
  contentAlignmentDesktop?: BloomWebsiteTextAlignment;
  contentAlignmentMobile?: BloomWebsiteTextAlignment;
  enabled: boolean;
  heading: string;
  introduction: string;
  services: string;
  eventTypes: string;
  serviceArea: string;
  consultationText: string;
  portfolioHeading: string;
  portfolioDescription: string;
  portfolio: Array<{ url: string; alt: string; caption: string }>;
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
    logoSize: BloomWebsiteLogoSize;
    buttonCorners: BloomWebsiteButtonCorners;

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
    heroSlides: BloomWebsiteHeroSlide[];
    heroInfoCard: BloomWebsiteHeroInfoCardContent;
    trustPoints: BloomWebsiteTrustPoint[];
    aboutText: string;
    aboutImage: string;
    sectionContent: BloomWebsiteHomepageSectionContent;
    sectionOrder: BloomWebsiteHomepageSectionKey[];
    sectionVisibility: BloomWebsiteHomepageSectionVisibility;
    merchandisingSections: BloomWebsiteHomepageMerchandisingSection[];
  };

  weddingsPage?: BloomWebsiteWeddingsPage;

  aboutPage?: {
    useCustomImage?: boolean;
    customImageUrl?: string;
    enabled: boolean;
    heading: string;
    contentMode: "custom" | "guided";
    facts: BloomWebsiteAboutFacts;
    sections: BloomWebsiteAboutSection[];
  };

  seo?: {
    homepageTitle: string;
    homepageDescription: string;
    socialTitle: string;
    socialDescription: string;
    socialImageUrl: string;
    businessDescription: string;
    googleBusinessProfileUrl: string;
    googleSiteVerification: string;
    bingSiteVerification: string;
    businessHours: BloomWebsiteBusinessHour[];
    localDelivery: BloomWebsiteLocalSeoContent & {
      serviceZipCodes: string[];
    };
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

  arrangementContainerNote: string;

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
