import type {
  BloomWebsiteStorefront,
  BloomWebsiteStorefrontProductPage,
} from "@/types/bloom-website";

const GET_BLOOM_DIRECT_ORIGIN = "https://www.getbloomdirect.com";

type StructuredDataOptions = {
  publicOrigin?: string;
};

function cleanText(value: string | undefined | null) {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function compactObject<T extends Record<string, unknown>>(value: T) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry === undefined || entry === null || entry === "") {
        return false;
      }

      if (Array.isArray(entry) && entry.length === 0) {
        return false;
      }

      return true;
    }),
  );
}

function getPreviewUrl(pathname: string) {
  return new URL(pathname, GET_BLOOM_DIRECT_ORIGIN).toString();
}

function getPublicOrigin(value: string | undefined) {
  if (!value) {
    return "";
  }

  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function getStorefrontUrl(input: {
  previewSlug: string;
  pathname?: string;
  publicOrigin?: string;
}) {
  const publicOrigin = getPublicOrigin(input.publicOrigin);
  const pathname = input.pathname || "";

  if (publicOrigin) {
    return `${publicOrigin}${pathname}`;
  }

  return getPreviewUrl(
    `/websites/preview/${input.previewSlug}${pathname}`,
  );
}

function getAbsoluteUrl(value: string | undefined | null) {
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

function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function getFloristId(homepageUrl: string) {
  return `${homepageUrl}#florist`;
}

function buildPostalAddress(
  storefront: BloomWebsiteStorefront | BloomWebsiteStorefrontProductPage,
) {
  if (!storefront.website.settings.showAddress) {
    return undefined;
  }

  const { address } = storefront.shop;

  const postalAddress = compactObject({
    "@type": "PostalAddress",
    streetAddress: cleanText(address.street),
    addressLocality: cleanText(address.city),
    addressRegion: cleanText(address.state),
    postalCode: cleanText(address.zip),
    addressCountry: cleanText(address.country) || "US",
  });

  return Object.keys(postalAddress).length > 1 ? postalAddress : undefined;
}

function buildSameAs(
  storefront: BloomWebsiteStorefront | BloomWebsiteStorefrontProductPage,
) {
  if (!storefront.website.settings.showSocialLinks) {
    return [];
  }

  return Object.values(storefront.shop.socialLinks)
    .map((value) => getAbsoluteUrl(value))
    .filter(Boolean);
}

function buildFloristNode(
  storefront: BloomWebsiteStorefront | BloomWebsiteStorefrontProductPage,
  homepageUrl: string,
) {
  const { website, shop } = storefront;
  const storefrontUrl = homepageUrl;

  const image =
    getAbsoluteUrl(website.branding.logo) ||
    getAbsoluteUrl(website.homepage.heroImage) ||
    undefined;

  return compactObject({
    "@type": "Florist",
    "@id": getFloristId(homepageUrl),
    name: cleanText(shop.businessName) || cleanText(website.siteName),
    url: storefrontUrl,
    image,
    logo: getAbsoluteUrl(website.branding.logo) || undefined,
    description:
      cleanText(website.homepage.aboutText) ||
      cleanText(website.branding.tagline) ||
      cleanText(website.homepage.heroSubheadline) ||
      undefined,
    email: cleanText(shop.email) || undefined,
    telephone:
      website.settings.showPhone && cleanText(shop.phone)
        ? cleanText(shop.phone)
        : undefined,
    address: buildPostalAddress(storefront),
    sameAs: buildSameAs(storefront),
  });
}

function getProductAvailability(
  product: BloomWebsiteStorefrontProductPage["product"],
) {
  if (product.availabilityState === "available") {
    return "https://schema.org/InStock";
  }

  if (product.availabilityState === "sold_out") {
    return "https://schema.org/OutOfStock";
  }

  const now = Date.now();
  const startAt = product.availability.startDate
    ? new Date(product.availability.startDate).getTime()
    : Number.NaN;
  const endAt = product.availability.endDate
    ? new Date(product.availability.endDate).getTime()
    : Number.NaN;

  if (Number.isFinite(startAt) && startAt > now) {
    return "https://schema.org/PreOrder";
  }

  if (Number.isFinite(endAt) && endAt < now) {
    return "https://schema.org/Discontinued";
  }

  return "https://schema.org/OutOfStock";
}

function buildProductOffers(
  storefront: BloomWebsiteStorefrontProductPage,
  productUrl: string,
  homepageUrl: string,
) {
  const { product } = storefront;
  const availability = getProductAvailability(product);
  const sellerId = getFloristId(homepageUrl);
  const priceValidUntil =
    product.availability.type === "date_range" && product.availability.endDate
      ? product.availability.endDate.slice(0, 10)
      : undefined;

  return product.pricingTiers
    .filter((tier) => tier.enabled)
    .map((tier) =>
      compactObject({
        "@type": "Offer",
        name: `${product.name} — ${
          tier.label.charAt(0).toUpperCase() + tier.label.slice(1)
        }`,
        url: productUrl,
        priceCurrency: "USD",
        price: tier.price.toFixed(2),
        availability,
        itemCondition: "https://schema.org/NewCondition",
        priceValidUntil,
        seller: {
          "@id": sellerId,
        },
      }),
    );
}

export function getBloomWebsiteHomepageStructuredData(
  storefront: BloomWebsiteStorefront,
  options: StructuredDataOptions = {},
) {
  const homepageUrl = getStorefrontUrl({
    previewSlug: storefront.website.previewSlug,
    publicOrigin: options.publicOrigin,
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildFloristNode(storefront, homepageUrl),
      compactObject({
        "@type": "WebSite",
        "@id": `${homepageUrl}#website`,
        url: homepageUrl,
        name: cleanText(storefront.website.siteName),
        description:
          cleanText(storefront.website.branding.tagline) ||
          cleanText(storefront.website.homepage.heroSubheadline) ||
          undefined,
        publisher: {
          "@id": getFloristId(homepageUrl),
        },
      }),
    ],
  };
}

export function getBloomWebsiteProductStructuredData(
  storefront: BloomWebsiteStorefrontProductPage,
  options: StructuredDataOptions = {},
) {
  const { website, product } = storefront;
  const homepageUrl = getStorefrontUrl({
    previewSlug: website.previewSlug,
    publicOrigin: options.publicOrigin,
  });
  const shopUrl = getStorefrontUrl({
    previewSlug: website.previewSlug,
    pathname: "/shop",
    publicOrigin: options.publicOrigin,
  });
  const fallbackProductUrl = getStorefrontUrl({
    previewSlug: website.previewSlug,
    pathname: `/products/${product.slug}`,
    publicOrigin: options.publicOrigin,
  });
  const productUrl =
    getAbsoluteUrl(product.seo.canonicalUrl) || fallbackProductUrl;

  const images = [product.imageUrl, ...product.galleryImages]
    .map((image) => getAbsoluteUrl(image))
    .filter((image, index, values) => Boolean(image) && values.indexOf(image) === index);

  const description =
    cleanText(product.seo.description) ||
    cleanText(product.shortDescription) ||
    cleanText(product.description) ||
    undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildFloristNode(storefront, homepageUrl),
      compactObject({
        "@type": "Product",
        "@id": `${productUrl}#product`,
        name: cleanText(product.name),
        description,
        image: images,
        sku: cleanText(product.sku) || undefined,
        category: cleanText(product.category) || undefined,
        url: productUrl,
        offers: buildProductOffers(storefront, productUrl, homepageUrl),
      }),
      {
        "@type": "BreadcrumbList",
        "@id": `${productUrl}#breadcrumb`,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Home",
            item: homepageUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: "Shop Flowers",
            item: shopUrl,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: product.name,
            item: productUrl,
          },
        ],
      },
    ],
  };
}

export function BloomWebsiteJsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: serializeJsonLd(data),
      }}
    />
  );
}
