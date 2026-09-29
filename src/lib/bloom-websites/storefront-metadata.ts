import type { Metadata } from "next";

import type {
  BloomWebsiteStorefront,
  BloomWebsiteStorefrontProductPage,
} from "@/types/bloom-website";
import type { BloomWebsiteStorefrontCatalog } from "@/lib/bloom-websites/getBloomWebsiteStorefrontCatalog";
import { getBloomWebsiteHomepageSeoDefaults } from "@/lib/bloom-websites/storefront-seo";

const DEFAULT_PREVIEW_DESCRIPTION =
  "Preview this BloomWebsites storefront before it goes live.";

type StorefrontMetadataOptions = {
  publicOrigin?: string;
};

function cleanText(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function truncateMetadata(value: string, maxLength: number) {
  const cleaned = cleanText(value);

  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const shortened = cleaned.slice(0, Math.max(0, maxLength - 1));
  const lastSpace = shortened.lastIndexOf(" ");

  return `${shortened.slice(0, lastSpace > 40 ? lastSpace : shortened.length).trim()}…`;
}

function getAbsoluteCanonicalUrl(value: string | undefined | null) {
  const candidate = cleanText(value);

  if (!candidate) {
    return "";
  }

  try {
    const url = new URL(candidate);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return url.toString();
  } catch {
    return "";
  }
}

function getImages(imageUrl: string, alt: string) {
  const cleanedImageUrl = cleanText(imageUrl);

  if (!cleanedImageUrl) {
    return undefined;
  }

  return [
    {
      url: cleanedImageUrl,
      alt: cleanText(alt),
    },
  ];
}


function getPublicOrigin(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    const url = new URL(value);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return "";
    }

    return url.origin;
  } catch {
    return "";
  }
}

function buildMetadata(input: {
  title: string;
  description: string;
  canonical: string;
  siteName: string;
  socialTitle?: string;
  socialDescription?: string;
  imageUrl?: string;
  imageAlt?: string;
  faviconUrl?: string;
}): Metadata {
  const title = truncateMetadata(input.title, 70);
  const description = truncateMetadata(input.description, 170);
  const socialTitle = truncateMetadata(input.socialTitle || title, 100);
  const socialDescription = truncateMetadata(
    input.socialDescription || description,
    250,
  );
  const images = getImages(input.imageUrl || "", input.imageAlt || title);
  const faviconUrl = cleanText(input.faviconUrl);

  return {
    title: {
      absolute: title,
    },
    description,
    ...(faviconUrl
      ? {
          icons: {
            icon: faviconUrl,
            shortcut: faviconUrl,
            apple: faviconUrl,
          },
        }
      : {}),
    alternates: {
      canonical: input.canonical,
    },
    openGraph: {
      type: "website",
      siteName: cleanText(input.siteName) || title,
      title: socialTitle,
      description: socialDescription,
      url: input.canonical,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: socialTitle,
      description: socialDescription,
      ...(images
        ? {
            images: images.map((image) => image.url),
          }
        : {}),
    },
  };
}

export function getBloomWebsitePreviewFallbackMetadata(): Metadata {
  return {
    title: {
      absolute: "BloomWebsites Storefront Preview",
    },
    description: DEFAULT_PREVIEW_DESCRIPTION,
  };
}

export function getBloomWebsiteHomepageMetadata(
  storefront: BloomWebsiteStorefront,
  options: StorefrontMetadataOptions = {},
): Metadata {
  const { website, shop } = storefront;
  const story = website.aboutPage?.sections
    ?.find((section) => section.key === "story")
    ?.body;

  const defaults = getBloomWebsiteHomepageSeoDefaults({
    businessName: shop.businessName,
    siteName: website.siteName,
    city: shop.address.city,
    state: shop.address.state,
    tagline: website.branding.tagline,
    heroSubheadline: website.homepage.heroSubheadline,
    heroImage: website.homepage.heroImage,
    logo: website.branding.logo,
    businessDescription: website.seo?.businessDescription,
    aboutText: story || website.homepage.aboutText,
  });

  const title =
    cleanText(website.seo?.homepageTitle) || defaults.title;
  const description =
    cleanText(website.seo?.homepageDescription) || defaults.description;
  const socialTitle =
    cleanText(website.seo?.socialTitle) || title;
  const socialDescription =
    cleanText(website.seo?.socialDescription) || description;
  const imageUrl =
    cleanText(website.seo?.socialImageUrl) ||
    defaults.socialImageUrl;

  const publicOrigin = getPublicOrigin(options.publicOrigin);
  const metadata = buildMetadata({
    title,
    description,
    canonical:
      publicOrigin || `/websites/preview/${website.previewSlug}`,
    siteName: website.siteName,
    socialTitle,
    socialDescription,
    imageUrl,
    imageAlt: `${website.siteName} storefront`,
    faviconUrl: website.branding.logo,
  });

  if (!publicOrigin) {
    return metadata;
  }

  const googleVerification = cleanText(
    website.seo?.googleSiteVerification,
  );
  const bingVerification = cleanText(
    website.seo?.bingSiteVerification,
  );

  return {
    ...metadata,
    ...((googleVerification || bingVerification)
      ? {
          verification: {
            ...(googleVerification
              ? { google: googleVerification }
              : {}),
            ...(bingVerification
              ? {
                  other: {
                    "msvalidate.01": [bingVerification],
                  },
                }
              : {}),
          },
        }
      : {}),
  };
}

export function getBloomWebsiteCatalogMetadata(
  catalog: BloomWebsiteStorefrontCatalog,
  options: StorefrontMetadataOptions = {},
): Metadata {
  const { website, shop, products } = catalog;
  const firstProductImage = products.find((product) => product.imageUrl)?.imageUrl;

  const publicOrigin = getPublicOrigin(options.publicOrigin);

  return buildMetadata({
    title: `Shop Flowers | ${website.siteName}`,
    description: `Browse fresh flower arrangements designed by ${shop.businessName}. Find flowers for meaningful moments and choose the arrangement that fits your occasion.`,
    canonical:
      publicOrigin
        ? `${publicOrigin}/shop`
        : `/websites/preview/${website.previewSlug}/shop`,
    siteName: website.siteName,
    imageUrl: firstProductImage || website.branding.logo,
    imageAlt: `${website.siteName} flower shop`,
    faviconUrl: website.branding.logo,
  });
}

export function getBloomWebsiteAboutMetadata(
  storefront: BloomWebsiteStorefront,
  options: StorefrontMetadataOptions = {},
): Metadata {
  const { website, shop } = storefront;
  const publicOrigin = getPublicOrigin(options.publicOrigin);
  const cityState = [shop.address.city, shop.address.state]
    .map(cleanText)
    .filter(Boolean)
    .join(", ");
  const story = website.aboutPage?.sections
    ?.find((section) => section.key === "story")
    ?.body;
  const description =
    cleanText(story) ||
    cleanText(website.homepage.aboutText) ||
    cleanText(website.branding.tagline) ||
    `Learn more about ${shop.businessName}${
      cityState ? `, your local florist in ${cityState}` : ""
    }.`;

  return buildMetadata({
    title: `About ${website.siteName}`,
    description,
    canonical: publicOrigin
      ? `${publicOrigin}/about`
      : `/websites/preview/${website.previewSlug}/about`,
    siteName: website.siteName,
    imageUrl: website.branding.logo || website.homepage.heroImage,
    imageAlt: `${website.siteName} logo`,
    faviconUrl: website.branding.logo,
  });
}

export function getBloomWebsiteProductMetadata(
  storefront: BloomWebsiteStorefrontProductPage,
  options: StorefrontMetadataOptions = {},
): Metadata {
  const { website, product } = storefront;

  const title =
    cleanText(product.seo.title) || `${product.name} | ${website.siteName}`;

  const description =
    cleanText(product.seo.description) ||
    cleanText(product.shortDescription) ||
    cleanText(product.description) ||
    `Order ${product.name} from ${website.siteName}.`;

  const publicOrigin = getPublicOrigin(options.publicOrigin);
  const fallbackCanonical = publicOrigin
    ? `${publicOrigin}/products/${product.slug}`
    : `/websites/preview/${website.previewSlug}/products/${product.slug}`;

  const canonical =
    getAbsoluteCanonicalUrl(product.seo.canonicalUrl) || fallbackCanonical;

  const socialImageUrl =
    cleanText(product.seo.socialImageUrl) || cleanText(product.imageUrl);

  const metadata = buildMetadata({
    title,
    description,
    canonical,
    siteName: website.siteName,
    socialTitle: cleanText(product.seo.socialTitle) || title,
    socialDescription: cleanText(product.seo.socialDescription) || description,
    imageUrl: socialImageUrl,
    imageAlt:
      cleanText(product.seo.imageAltText) || `${product.name} from ${website.siteName}`,
    faviconUrl: website.branding.logo,
  });

  if (!publicOrigin) {
    return metadata;
  }

  const allowIndexing = product.seo.allowIndexing !== false;

  return {
    ...metadata,
    robots: {
      index: allowIndexing,
      follow: allowIndexing,
      googleBot: {
        index: allowIndexing,
        follow: allowIndexing,
      },
    },
  };
}
