import type {
  BloomWebsiteHeroInfoCardContent,
  BloomWebsiteHomepageSectionContent,
  BloomWebsiteTrustPoint,
} from "@/types/bloom-website";

export const BLOOM_WEBSITE_SECTION_EYEBROW_MAX = 80;
export const BLOOM_WEBSITE_SECTION_HEADING_MAX = 140;
export const BLOOM_WEBSITE_SECTION_DESCRIPTION_MAX = 420;
export const BLOOM_WEBSITE_HERO_CARD_EYEBROW_MAX = 80;
export const BLOOM_WEBSITE_HERO_CARD_HEADING_MAX = 120;
export const BLOOM_WEBSITE_HERO_CARD_DESCRIPTION_MAX = 320;
export const BLOOM_WEBSITE_TRUST_POINT_TITLE_MAX = 100;
export const BLOOM_WEBSITE_TRUST_POINT_DESCRIPTION_MAX = 260;

const SECTION_KEYS = [
  "occasions",
  "featured",
  "about",
  "trust",
  "delivery",
  "contact",
] as const;

function clean(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export function normalizeBloomWebsiteHomepageSectionContent(
  input: unknown,
): BloomWebsiteHomepageSectionContent {
  const source =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  return Object.fromEntries(
    SECTION_KEYS.map((key) => {
      const value =
        typeof source[key] === "object" && source[key] !== null
          ? (source[key] as Record<string, unknown>)
          : {};

      return [
        key,
        {
          eyebrow: clean(value.eyebrow, BLOOM_WEBSITE_SECTION_EYEBROW_MAX),
          heading: clean(value.heading, BLOOM_WEBSITE_SECTION_HEADING_MAX),
          description: clean(
            value.description,
            BLOOM_WEBSITE_SECTION_DESCRIPTION_MAX,
          ),
        },
      ];
    }),
  ) as BloomWebsiteHomepageSectionContent;
}

export function getBloomWebsiteHomepageSectionDefaults(input: {
  businessName: string;
  cityState?: string;
  localDeliveryNote?: string;
}): BloomWebsiteHomepageSectionContent {
  const businessName = input.businessName.trim() || "Your local florist";
  const cityState = input.cityState?.trim() || "";
  const localDeliveryNote = input.localDeliveryNote?.trim() || "";

  return {
    occasions: {
      eyebrow: "Find the right flowers",
      heading: "Shop by Occasion",
      description:
        "Thoughtful flowers for life's celebrations, milestones, and meaningful moments.",
    },
    featured: {
      eyebrow: "Fresh from our shop",
      heading: "Featured Flowers",
      description:
        "Hand-designed arrangements created locally and delivered with care.",
    },
    about: {
      eyebrow: "Meet your local florist",
      heading: "Flowers mean more when they're personal.",
      description: `${businessName} is proud to serve ${
        cityState || "our local community"
      } with fresh flowers, thoughtful designs, and personal service for life's meaningful moments.`,
    },
    trust: {
      eyebrow: "Why shop local?",
      heading: "Real flowers. Real people.",
      description: "",
    },
    delivery: {
      eyebrow: "Local delivery",
      heading: "From our flower shop to their door.",
      description:
        localDeliveryNote ||
        `Order online from ${businessName} and send flowers locally with delivery handled right here in the community.`,
    },
    contact: {
      eyebrow: "We're here to help",
      heading: `Get in touch with ${businessName}.`,
      description:
        "Have a question about flowers, delivery, or your order? Reach out directly to your local florist.",
    },
  };
}


export function normalizeBloomWebsiteHeroInfoCardContent(
  input: unknown,
): BloomWebsiteHeroInfoCardContent {
  const source =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  return {
    eyebrow: clean(source.eyebrow, BLOOM_WEBSITE_HERO_CARD_EYEBROW_MAX),
    heading: clean(source.heading, BLOOM_WEBSITE_HERO_CARD_HEADING_MAX),
    description: clean(
      source.description,
      BLOOM_WEBSITE_HERO_CARD_DESCRIPTION_MAX,
    ),
  };
}

export function getBloomWebsiteHeroInfoCardDefaults(input: {
  siteName: string;
}): BloomWebsiteHeroInfoCardContent {
  return {
    eyebrow: "Your neighborhood florist",
    heading: input.siteName.trim() || "Your Flower Shop",
    description:
      "Fresh flowers, personal service, and thoughtful designs created right here in your community.",
  };
}

export function normalizeBloomWebsiteTrustPoints(
  input: unknown,
): BloomWebsiteTrustPoint[] {
  const source = Array.isArray(input) ? input : [];

  return Array.from({ length: 4 }, (_, index) => {
    const value =
      typeof source[index] === "object" && source[index] !== null
        ? (source[index] as Record<string, unknown>)
        : {};

    return {
      title: clean(value.title, BLOOM_WEBSITE_TRUST_POINT_TITLE_MAX),
      description: clean(
        value.description,
        BLOOM_WEBSITE_TRUST_POINT_DESCRIPTION_MAX,
      ),
    };
  });
}

export function getBloomWebsiteTrustPointDefaults(): BloomWebsiteTrustPoint[] {
  return [
    {
      title: "Designed by a local florist",
      description:
        "Your arrangement is created by the florist serving your community.",
    },
    {
      title: "Thoughtfully prepared",
      description:
        "Each order is prepared with care for the person and moment you're celebrating.",
    },
    {
      title: "Delivered locally",
      description:
        "Your flowers stay local from the design table through delivery.",
    },
    {
      title: "Personal service",
      description:
        "Questions about your order? You're working with a real local flower shop.",
    },
  ];
}

export function resolveBloomWebsiteTrustPoints(
  input: unknown,
): BloomWebsiteTrustPoint[] {
  const custom = normalizeBloomWebsiteTrustPoints(input);
  const defaults = getBloomWebsiteTrustPointDefaults();

  return defaults.map((fallback, index) => ({
    title: custom[index]?.title || fallback.title,
    description: custom[index]?.description || fallback.description,
  }));
}
