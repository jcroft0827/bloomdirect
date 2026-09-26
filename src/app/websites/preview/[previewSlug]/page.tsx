// src/app/websites/preview/[previewSlug]/page.tsx

import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import authOptions from "@/lib/auth";
import { getBloomWebsiteStorefront } from "@/lib/bloom-websites/getBloomWebsiteStorefront";
import { normalizeBloomWebsiteStorefrontTheme } from "@/lib/bloom-websites/storefront-theme";
import BloomClassicTheme from "@/components/websites/themes/BloomClassicTheme";
import WebsitePreviewBar from "@/components/websites/WebsitePreviewBar";
import {
  getBloomWebsiteHomepageMetadata,
  getBloomWebsitePreviewFallbackMetadata,
} from "@/lib/bloom-websites/storefront-metadata";
import {
  BloomWebsiteJsonLd,
  getBloomWebsiteHomepageStructuredData,
} from "@/lib/bloom-websites/storefront-structured-data";
import type { BloomWebsiteStorefront } from "@/types/bloom-website";

type BuilderPreviewSearchParams = {
  builder?: string | string[];
  embedded?: string | string[];
  siteName?: string | string[];
  logo?: string | string[];
  tagline?: string | string[];
  primaryColor?: string | string[];
  accentColor?: string | string[];
  heroImage?: string | string[];
};

type PreviewPageProps = {
  params: Promise<{
    previewSlug: string;
  }>;
  searchParams?: Promise<BuilderPreviewSearchParams>;
};

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function clamp(value: string | undefined, maxLength: number) {
  if (value === undefined) {
    return undefined;
  }

  return value.slice(0, maxLength);
}

function applyBuilderPreviewOverrides(
  storefront: BloomWebsiteStorefront,
  searchParams: BuilderPreviewSearchParams,
) {
  if (getParam(searchParams.builder) !== "1") {
    return storefront;
  }

  const siteNameOverride = clamp(getParam(searchParams.siteName), 120);
  const logoOverride = clamp(getParam(searchParams.logo), 4096);
  const taglineOverride = clamp(getParam(searchParams.tagline), 180);
  const primaryColorOverride = clamp(getParam(searchParams.primaryColor), 32);
  const accentColorOverride = clamp(getParam(searchParams.accentColor), 32);
  const heroImageOverride = clamp(getParam(searchParams.heroImage), 4096);

  const previousSiteName = storefront.website.siteName;
  const previousDefaultHeadline = `Beautiful flowers from ${previousSiteName}.`;
  const genericSubheadline =
    "Fresh flowers for life's meaningful moments, designed and delivered by your local florist.";
  const previousTagline = storefront.website.storefrontTheme.tagline;
  const previousSubheadlineWasGenerated =
    storefront.website.homepage.heroSubheadline === previousTagline ||
    storefront.website.homepage.heroSubheadline === genericSubheadline;

  const siteName =
    siteNameOverride === undefined
      ? storefront.website.siteName
      : siteNameOverride.trim() || "Your Flower Shop";

  const logo =
    logoOverride === undefined
      ? storefront.website.branding.logo
      : logoOverride.trim();
  const tagline =
    taglineOverride === undefined
      ? storefront.website.branding.tagline
      : taglineOverride;
  const primaryColor =
    primaryColorOverride === undefined
      ? storefront.website.branding.primaryColor
      : primaryColorOverride;
  const accentColor =
    accentColorOverride === undefined
      ? storefront.website.branding.accentColor
      : accentColorOverride;

  const storefrontTheme = normalizeBloomWebsiteStorefrontTheme({
    themeName: storefront.website.theme,
    logo,
    tagline,
    primaryColor,
    accentColor,
    backgroundStyle: storefront.website.storefrontTheme.backgroundStyle,
  });

  return {
    ...storefront,
    website: {
      ...storefront.website,
      siteName,
      branding: {
        ...storefront.website.branding,
        logo: storefrontTheme.logo,
        tagline: storefrontTheme.tagline,
        primaryColor: storefrontTheme.primaryColor,
        accentColor: storefrontTheme.accentColor,
      },
      storefrontTheme,
      homepage: {
        ...storefront.website.homepage,
        heroHeadline:
          siteNameOverride !== undefined &&
          storefront.website.homepage.heroHeadline === previousDefaultHeadline
            ? `Beautiful flowers from ${siteName}.`
            : storefront.website.homepage.heroHeadline,
        heroSubheadline:
          taglineOverride !== undefined && previousSubheadlineWasGenerated
            ? storefrontTheme.tagline || genericSubheadline
            : storefront.website.homepage.heroSubheadline,
        heroImage:
          heroImageOverride === undefined
            ? storefront.website.homepage.heroImage
            : heroImageOverride.trim(),
      },
    },
  } satisfies BloomWebsiteStorefront;
}

export async function generateMetadata({
  params,
}: PreviewPageProps): Promise<Metadata> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return getBloomWebsitePreviewFallbackMetadata();
  }

  const { previewSlug } = await params;
  const storefront = await getBloomWebsiteStorefront(
    previewSlug,
    session.user.id,
  );

  if (!storefront) {
    return getBloomWebsitePreviewFallbackMetadata();
  }

  return getBloomWebsiteHomepageMetadata(storefront);
}

export default async function BloomWebsitePreviewPage({
  params,
  searchParams,
}: PreviewPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { previewSlug } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};

  const persistedStorefront = await getBloomWebsiteStorefront(
    previewSlug,
    session.user.id,
  );

  if (!persistedStorefront) {
    notFound();
  }

  const storefront = applyBuilderPreviewOverrides(
    persistedStorefront,
    resolvedSearchParams,
  );
  const embedded =
    getParam(resolvedSearchParams.builder) === "1" &&
    getParam(resolvedSearchParams.embedded) === "1";
  const structuredData = getBloomWebsiteHomepageStructuredData(storefront);

  return (
    <div className={embedded ? "" : "pb-28 sm:pb-20"}>
      {!embedded ? <BloomWebsiteJsonLd data={structuredData} /> : null}

      <BloomClassicTheme
        storefront={storefront}
        basePath={`/websites/preview/${storefront.website.previewSlug}`}
      />

      {!embedded ? <WebsitePreviewBar websiteId={storefront.website.id} /> : null}
    </div>
  );
}
