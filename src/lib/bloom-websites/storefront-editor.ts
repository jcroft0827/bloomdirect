import type { BloomWebsiteHeroSlide } from "@/types/bloom-website";

export const BLOOM_WEBSITE_MAX_HERO_SLIDES = 5;
export const BLOOM_WEBSITE_HERO_HEADLINE_MAX = 160;
export const BLOOM_WEBSITE_HERO_SUBHEADLINE_MAX = 300;
export const BLOOM_WEBSITE_HERO_CTA_LABEL_MAX = 80;
export const BLOOM_WEBSITE_HERO_CTA_HREF_MAX = 2000;

function cleanString(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeHeroSlide(value: unknown, index: number): BloomWebsiteHeroSlide | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Record<string, unknown>;
  const headline = cleanString(candidate.headline, BLOOM_WEBSITE_HERO_HEADLINE_MAX);

  if (!headline) return null;

  const textStyle = candidate.textStyle === "light" ? "light" : "dark";
  const overlay = ["none", "soft", "medium", "strong"].includes(
    String(candidate.overlay),
  )
    ? (candidate.overlay as BloomWebsiteHeroSlide["overlay"])
    : textStyle === "light"
      ? "medium"
      : "soft";

  const ctaDestination = ["shop", "about", "custom", "none"].includes(
    String(candidate.ctaDestination),
  )
    ? (candidate.ctaDestination as BloomWebsiteHeroSlide["ctaDestination"])
    : "shop";

  return {
    id: cleanString(candidate.id, 120) || `hero-${index + 1}`,
    headline,
    subheadline: cleanString(
      candidate.subheadline,
      BLOOM_WEBSITE_HERO_SUBHEADLINE_MAX,
    ),
    imageUrl: cleanString(candidate.imageUrl, 2000),
    textStyle,
    overlay,
    alignment: candidate.alignment === "center" ? "center" : "left",
    imagePosition:
      candidate.imagePosition === "top" || candidate.imagePosition === "bottom"
        ? candidate.imagePosition
        : "center",
    ctaLabel:
      cleanString(candidate.ctaLabel, BLOOM_WEBSITE_HERO_CTA_LABEL_MAX) ||
      (ctaDestination === "none" ? "" : "Shop Flowers"),
    ctaDestination,
    ctaHref:
      ctaDestination === "custom"
        ? cleanString(candidate.ctaHref, BLOOM_WEBSITE_HERO_CTA_HREF_MAX)
        : "",
  };
}

export function normalizeBloomWebsiteHeroSlides(
  value: unknown,
  fallback?: {
    headline?: string;
    subheadline?: string;
    imageUrl?: string;
  },
): BloomWebsiteHeroSlide[] {
  const normalized = Array.isArray(value)
    ? value
        .slice(0, BLOOM_WEBSITE_MAX_HERO_SLIDES)
        .map(normalizeHeroSlide)
        .filter((slide): slide is BloomWebsiteHeroSlide => Boolean(slide))
    : [];

  if (normalized.length > 0) return normalized;

  const headline = cleanString(
    fallback?.headline,
    BLOOM_WEBSITE_HERO_HEADLINE_MAX,
  );

  if (!headline) return [];

  const imageUrl = cleanString(fallback?.imageUrl, 2000);

  return [
    {
      id: "hero-primary",
      headline,
      subheadline: cleanString(
        fallback?.subheadline,
        BLOOM_WEBSITE_HERO_SUBHEADLINE_MAX,
      ),
      imageUrl,
      textStyle: imageUrl ? "light" : "dark",
      overlay: imageUrl ? "medium" : "none",
      alignment: "left",
      imagePosition: "center",
      ctaLabel: "Shop Flowers",
      ctaDestination: "shop",
      ctaHref: "",
    },
  ];
}

export function getBloomWebsiteHeroOverlayOpacity(
  overlay: BloomWebsiteHeroSlide["overlay"],
) {
  switch (overlay) {
    case "soft":
      return 0.18;
    case "medium":
      return 0.34;
    case "strong":
      return 0.52;
    default:
      return 0;
  }
}
