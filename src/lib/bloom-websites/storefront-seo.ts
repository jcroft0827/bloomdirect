import type {
  BloomWebsiteBusinessDay,
  BloomWebsiteBusinessHour,
  BloomWebsiteLocalSeoContent,
} from "@/types/bloom-website";

export const BLOOM_WEBSITE_BUSINESS_DAYS: Array<{
  key: BloomWebsiteBusinessDay;
  label: string;
  schemaUrl: string;
}> = [
  { key: "monday", label: "Monday", schemaUrl: "https://schema.org/Monday" },
  { key: "tuesday", label: "Tuesday", schemaUrl: "https://schema.org/Tuesday" },
  { key: "wednesday", label: "Wednesday", schemaUrl: "https://schema.org/Wednesday" },
  { key: "thursday", label: "Thursday", schemaUrl: "https://schema.org/Thursday" },
  { key: "friday", label: "Friday", schemaUrl: "https://schema.org/Friday" },
  { key: "saturday", label: "Saturday", schemaUrl: "https://schema.org/Saturday" },
  { key: "sunday", label: "Sunday", schemaUrl: "https://schema.org/Sunday" },
];

const DEFAULT_BUSINESS_HOURS: BloomWebsiteBusinessHour[] =
  BLOOM_WEBSITE_BUSINESS_DAYS.map(({ key }) => ({
    day: key,
    enabled: false,
    opens: key === "saturday" || key === "sunday" ? "09:00" : "09:00",
    closes: key === "saturday" || key === "sunday" ? "13:00" : "17:00",
  }));

export function cleanBloomWebsiteSeoText(
  value: string | undefined | null,
) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

export function normalizeBloomWebsiteBusinessHours(
  hours: Array<Partial<BloomWebsiteBusinessHour>> | undefined | null,
): BloomWebsiteBusinessHour[] {
  const byDay = new Map(
    (hours || []).map((entry) => [entry.day, entry]),
  );

  return DEFAULT_BUSINESS_HOURS.map((fallback) => {
    const stored = byDay.get(fallback.day);

    return {
      day: fallback.day,
      enabled: stored?.enabled === true,
      opens:
        typeof stored?.opens === "string" && stored.opens.trim()
          ? stored.opens.trim()
          : fallback.opens,
      closes:
        typeof stored?.closes === "string" && stored.closes.trim()
          ? stored.closes.trim()
          : fallback.closes,
    };
  });
}

export function getBloomWebsiteHomepageSeoDefaults(input: {
  businessName: string;
  siteName: string;
  city?: string;
  state?: string;
  tagline?: string;
  heroSubheadline?: string;
  heroImage?: string;
  logo?: string;
  businessDescription?: string;
  aboutText?: string;
}) {
  const businessName =
    cleanBloomWebsiteSeoText(input.businessName) ||
    cleanBloomWebsiteSeoText(input.siteName) ||
    "Local Florist";
  const siteName = cleanBloomWebsiteSeoText(input.siteName) || businessName;
  const city = cleanBloomWebsiteSeoText(input.city);
  const state = cleanBloomWebsiteSeoText(input.state);
  const location = [city, state].filter(Boolean).join(", ");

  const title = location
    ? `${businessName} | Florist in ${location}`
    : siteName;

  const description = location
    ? `Shop fresh flower arrangements from ${businessName} in ${location}. Order directly from your local florist for life's meaningful moments.`
    : `Shop fresh flower arrangements from ${businessName}. Order directly from your local florist for life's meaningful moments.`;

  const socialTitle = title;
  const socialDescription = description;
  const socialImageUrl =
    cleanBloomWebsiteSeoText(input.heroImage) ||
    cleanBloomWebsiteSeoText(input.logo);
  const businessDescription =
    cleanBloomWebsiteSeoText(input.businessDescription) ||
    cleanBloomWebsiteSeoText(input.aboutText) ||
    cleanBloomWebsiteSeoText(input.tagline) ||
    cleanBloomWebsiteSeoText(input.heroSubheadline) ||
    description;

  return {
    title,
    description,
    socialTitle,
    socialDescription,
    socialImageUrl,
    businessDescription,
  };
}

const LOCAL_SEO_LIST_LIMIT = 12;

function normalizeLocalSeoList(
  values: string[] | undefined | null,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const rawValue of values || []) {
    const value = cleanBloomWebsiteSeoText(rawValue);
    const key = value.toLocaleLowerCase();

    if (!value || seen.has(key)) continue;

    seen.add(key);
    result.push(value);

    if (result.length >= LOCAL_SEO_LIST_LIMIT) break;
  }

  return result;
}

export function normalizeBloomWebsiteLocalSeoContent(
  value: Partial<BloomWebsiteLocalSeoContent> | undefined | null,
): BloomWebsiteLocalSeoContent {
  return {
    localDeliveryNote: cleanBloomWebsiteSeoText(value?.localDeliveryNote),
    serviceCities: normalizeLocalSeoList(value?.serviceCities),
    neighborhoods: normalizeLocalSeoList(value?.neighborhoods),
    hospitals: normalizeLocalSeoList(value?.hospitals),
    funeralHomes: normalizeLocalSeoList(value?.funeralHomes),
    seniorLiving: normalizeLocalSeoList(value?.seniorLiving),
    schools: normalizeLocalSeoList(value?.schools),
    venues: normalizeLocalSeoList(value?.venues),
    businesses: normalizeLocalSeoList(value?.businesses),
  };
}

export function getBloomWebsiteConfiguredDeliveryZipCodes(input: {
  method?: string;
  zipZones?: Array<{ zip?: string }>;
}) {
  if (input.method !== "zip") return [];

  const seen = new Set<string>();
  const zipCodes: string[] = [];

  for (const zone of input.zipZones || []) {
    const zip = cleanBloomWebsiteSeoText(zone.zip);

    if (!zip || seen.has(zip)) continue;

    seen.add(zip);
    zipCodes.push(zip);
  }

  return zipCodes;
}

