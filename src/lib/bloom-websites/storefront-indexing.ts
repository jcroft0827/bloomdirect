import type { MetadataRoute } from "next";

type BloomWebsiteIndexingWebsite = {
  status?: "preview" | "live" | "paused" | string;
  customDomain?: string | null;
  domainVerified?: boolean;
};

type BloomWebsiteIndexingProduct = {
  slug: string;
  isActive?: boolean;
  updatedAt?: Date | string | null;
  seo?: {
    allowIndexing?: boolean;
  };
};

function cleanText(value: string | undefined | null) {
  return value?.trim() || "";
}

function normalizeHostname(value: string) {
  return value
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();
}

/**
 * Returns a canonical HTTPS origin only when a BloomWebsite is actually
 * eligible to be treated as a public storefront.
 *
 * Preview and paused websites intentionally return null.
 */
export function getBloomWebsitePublicOrigin(
  website: BloomWebsiteIndexingWebsite,
) {
  if (
    website.status !== "live" ||
    website.domainVerified !== true ||
    !cleanText(website.customDomain)
  ) {
    return null;
  }

  const hostname = normalizeHostname(cleanText(website.customDomain));

  if (!hostname || hostname.includes(" ")) {
    return null;
  }

  try {
    return new URL(`https://${hostname}`).origin;
  } catch {
    return null;
  }
}

function normalizeLastModified(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

/**
 * Builds sitemap entries for a live BloomWebsite.
 *
 * This is intentionally not wired into the current GetBloomDirect sitemap.
 * Each florist storefront will use this once live-domain routing exists.
 */
export function buildBloomWebsiteSitemapEntries(input: {
  origin: string;
  products: BloomWebsiteIndexingProduct[];
  websiteLastModified?: Date | string | null;
}): MetadataRoute.Sitemap {
  const origin = new URL(input.origin).origin;
  const websiteLastModified = normalizeLastModified(input.websiteLastModified);

  const entries: MetadataRoute.Sitemap = [
    {
      url: origin,
      ...(websiteLastModified ? { lastModified: websiteLastModified } : {}),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/shop`,
      ...(websiteLastModified ? { lastModified: websiteLastModified } : {}),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const product of input.products) {
    const slug = cleanText(product.slug);

    if (
      !slug ||
      product.isActive === false ||
      product.seo?.allowIndexing === false
    ) {
      continue;
    }

    const lastModified = normalizeLastModified(product.updatedAt);

    entries.push({
      url: `${origin}/products/${encodeURIComponent(slug)}`,
      ...(lastModified ? { lastModified } : {}),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}

/**
 * Public-storefront robots policy for the future live-domain route.
 *
 * Customer checkout/cart paths are intentionally excluded from crawling.
 */
export function buildBloomWebsitePublicRobots(
  origin: string,
): MetadataRoute.Robots {
  const normalizedOrigin = new URL(origin).origin;

  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/shop", "/products/"],
      disallow: [
        "/checkout/",
        "/cart",
        "/theme-preview",
      ],
    },
    sitemap: `${normalizedOrigin}/sitemap.xml`,
    host: normalizedOrigin,
  };
}
