import type {
  BloomWebsiteStorefront,
  BloomWebsiteStorefrontProductPage,
} from "@/types/bloom-website";
import {
  BLOOM_WEBSITE_BUSINESS_DAYS,
  getBloomWebsiteHomepageSeoDefaults,
} from "@/lib/bloom-websites/storefront-seo";

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
  const socialLinks = storefront.website.settings.showSocialLinks
    ? Object.values(storefront.shop.socialLinks)
    : [];

  return [
    ...socialLinks,
    storefront.website.seo?.googleBusinessProfileUrl || "",
  ]
    .map((value) => getAbsoluteUrl(value))
    .filter(
      (value, index, values) =>
        Boolean(value) && values.indexOf(value) === index,
    );
}

function buildAreaServed(
  storefront: BloomWebsiteStorefront | BloomWebsiteStorefrontProductPage,
) {
  const localDelivery = storefront.website.seo?.localDelivery;
  const values = [
    ...(localDelivery?.serviceCities || []),
    ...(localDelivery?.neighborhoods || []),
    ...(localDelivery?.serviceZipCodes || []),
  ]
    .map((value) => cleanText(value))
    .filter(Boolean);

  return values.filter(
    (value, index) =>
      values.findIndex(
        (candidate) => candidate.toLocaleLowerCase() === value.toLocaleLowerCase(),
      ) === index,
  );
}

function buildOpeningHours(
  storefront: BloomWebsiteStorefront | BloomWebsiteStorefrontProductPage,
) {
  const schemaDayByKey = new Map(
    BLOOM_WEBSITE_BUSINESS_DAYS.map((day) => [day.key, day.schemaUrl]),
  );

  return (storefront.website.seo?.businessHours || [])
    .filter(
      (entry) =>
        entry.enabled === true &&
        Boolean(entry.opens) &&
        Boolean(entry.closes) &&
        schemaDayByKey.has(entry.day),
    )
    .map((entry) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: schemaDayByKey.get(entry.day),
      opens: entry.opens,
      closes: entry.closes,
    }));
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
  const story = website.aboutPage?.sections
    ?.find((section) => section.key === "story")
    ?.body;
  const seoDefaults = getBloomWebsiteHomepageSeoDefaults({
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
  const openingHoursSpecification = buildOpeningHours(storefront);

  return compactObject({
    "@type": "Florist",
    "@id": getFloristId(homepageUrl),
    name: cleanText(shop.businessName) || cleanText(website.siteName),
    url: storefrontUrl,
    image,
    logo: getAbsoluteUrl(website.branding.logo) || undefined,
    description:
      cleanText(website.seo?.businessDescription) ||
      cleanText(story) ||
      cleanText(website.homepage.aboutText) ||
      cleanText(website.branding.tagline) ||
      cleanText(website.homepage.heroSubheadline) ||
      seoDefaults.businessDescription ||
      undefined,
    email: cleanText(shop.email) || undefined,
    telephone:
      website.settings.showPhone && cleanText(shop.phone)
        ? cleanText(shop.phone)
        : undefined,
    address: buildPostalAddress(storefront),
    openingHoursSpecification:
      openingHoursSpecification.length > 0
        ? openingHoursSpecification
        : undefined,
    areaServed: buildAreaServed(storefront),
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
          cleanText(storefront.website.seo?.homepageDescription) ||
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

export function getBloomWebsiteAboutStructuredData(
  storefront: BloomWebsiteStorefront,
  options: StructuredDataOptions = {},
) {
  const homepageUrl = getStorefrontUrl({
    previewSlug: storefront.website.previewSlug,
    publicOrigin: options.publicOrigin,
  });
  const aboutUrl = getStorefrontUrl({
    previewSlug: storefront.website.previewSlug,
    pathname: "/about",
    publicOrigin: options.publicOrigin,
  });
  const story = storefront.website.aboutPage?.sections
    ?.find((section) => section.key === "story")
    ?.body;

  return {
    "@context": "https://schema.org",
    "@graph": [
      buildFloristNode(storefront, homepageUrl),
      compactObject({
        "@type": "AboutPage",
        "@id": `${aboutUrl}#about`,
        url: aboutUrl,
        name: `About ${storefront.website.siteName}`,
        description:
          cleanText(storefront.website.seo?.businessDescription) ||
          cleanText(story) ||
          cleanText(storefront.website.homepage.aboutText) ||
          cleanText(storefront.website.branding.tagline) ||
          undefined,
        mainEntity: {
          "@id": getFloristId(homepageUrl),
        },
      }),
      {
        "@type": "BreadcrumbList",
        "@id": `${aboutUrl}#breadcrumb`,
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
            name: "About Us",
            item: aboutUrl,
          },
        ],
      },
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
