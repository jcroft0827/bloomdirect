export const DEFAULT_BLOOM_WEBSITE_HERO_SUBHEADLINE =
  "Fresh flowers for life's meaningful moments, designed and delivered by your local florist.";

export function buildBloomWebsiteHeroHeadline(siteName: string) {
  const cleanSiteName = siteName.trim() || "Your Flower Shop";
  const headline = `Beautiful flowers, thoughtfully designed by ${cleanSiteName}.`;

  if (headline.length <= 160) {
    return headline;
  }

  return `Beautiful flowers from ${cleanSiteName}.`.slice(0, 160);
}

export function isBloomWebsiteGeneratedHeroHeadline(
  headline: string | null | undefined,
  siteName: string,
) {
  const cleanHeadline = headline?.trim() || "";
  const cleanSiteName = siteName.trim() || "Your Flower Shop";

  if (!cleanHeadline) {
    return true;
  }

  return (
    cleanHeadline === buildBloomWebsiteHeroHeadline(cleanSiteName) ||
    cleanHeadline === `Beautiful flowers from ${cleanSiteName}.`.slice(0, 160)
  );
}

export function buildBloomWebsiteHeroSubheadline(tagline: string) {
  return tagline.trim() || DEFAULT_BLOOM_WEBSITE_HERO_SUBHEADLINE;
}

export function isBloomWebsiteGeneratedHeroSubheadline(
  subheadline: string | null | undefined,
  tagline: string | null | undefined,
) {
  const cleanSubheadline = subheadline?.trim() || "";
  const cleanTagline = tagline?.trim() || "";

  if (!cleanSubheadline) {
    return true;
  }

  return (
    cleanSubheadline === DEFAULT_BLOOM_WEBSITE_HERO_SUBHEADLINE ||
    (cleanTagline.length > 0 && cleanSubheadline === cleanTagline)
  );
}
