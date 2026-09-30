import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteBrandingEditor from "@/components/websites/BloomWebsiteBrandingEditor";
import authOptions from "@/lib/auth";
import {
  buildBloomWebsiteHeroHeadline,
  isBloomWebsiteGeneratedHeroSubheadline,
} from "@/lib/bloom-websites/branding-copy";
import {
  normalizeBloomWebsiteHeroInfoCardContent,
  normalizeBloomWebsiteHomepageSectionContent,
  normalizeBloomWebsiteTrustPoints,
} from "@/lib/bloom-websites/storefront-content";
import {
  DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
  DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  normalizeBloomWebsiteStorefrontTheme,
} from "@/lib/bloom-websites/storefront-theme";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

type WebsiteLean = {
  previewSlug: string;

  siteName: string;

  theme?: string;

  branding?: {
    logo?: string;

    tagline?: string;

    primaryColor?: string;
    accentColor?: string;

    backgroundStyle?: string;
  };

  homepage?: {
    heroHeadline?: string;
    heroSubheadline?: string;
    heroImage?: string;
    heroInfoCard?: unknown;
    trustPoints?: unknown;
    sectionContent?: unknown;
  };
};

type ShopLean = {
  isSuspended?: boolean;
  branding?: {
    socialLinks?: {
      facebook?: string;
      instagram?: string;
      pinterest?: string;
      tiktok?: string;
    };
  };
};

export default async function BloomWebsiteBrandingPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const [website, shop] = await Promise.all([
    BloomWebsite.findOne({
      shop: session.user.id,
    })
      .select(
        [
          "previewSlug",
          "siteName",
          "theme",
          "branding.logo",
          "branding.tagline",
          "branding.primaryColor",
          "branding.accentColor",
          "branding.backgroundStyle",
          "homepage.heroHeadline",
          "homepage.heroSubheadline",
          "homepage.heroImage",
          "homepage.heroInfoCard",
          "homepage.trustPoints",
          "homepage.sectionContent",
        ].join(" "),
      )
      .lean<WebsiteLean | null>(),

    Shop.findById(session.user.id)
      .select("isSuspended branding.socialLinks")
      .lean<ShopLean | null>(),
  ]);

  if (!shop) {
    redirect("/login");
  }

  if (!website) {
    notFound();
  }

  const theme = normalizeBloomWebsiteStorefrontTheme({
    themeName: website.theme,

    logo: website.branding?.logo,

    tagline: website.branding?.tagline,

    primaryColor: website.branding?.primaryColor,

    accentColor: website.branding?.accentColor,

    backgroundStyle: website.branding?.backgroundStyle,
  });

  return (
    <BloomWebsiteBrandingEditor
      previewSlug={website.previewSlug}
      initialValues={{
        siteName: website.siteName,

        logo: theme.logo,

        tagline: theme.tagline,

        primaryColor: theme.primaryColor || DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,

        accentColor: theme.accentColor || DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,

        heroHeadline:
          website.homepage?.heroHeadline ||
          buildBloomWebsiteHeroHeadline(website.siteName),

        heroSubheadline: isBloomWebsiteGeneratedHeroSubheadline(
          website.homepage?.heroSubheadline,
          theme.tagline,
        )
          ? ""
          : website.homepage?.heroSubheadline || "",

        heroImage: website.homepage?.heroImage || "",

        heroInfoCard: normalizeBloomWebsiteHeroInfoCardContent(
          website.homepage?.heroInfoCard,
        ),

        trustPoints: normalizeBloomWebsiteTrustPoints(
          website.homepage?.trustPoints,
        ),

        socialLinks: {
          facebook: shop.branding?.socialLinks?.facebook || "",
          instagram: shop.branding?.socialLinks?.instagram || "",
          pinterest: shop.branding?.socialLinks?.pinterest || "",
          tiktok: shop.branding?.socialLinks?.tiktok || "",
        },

        sectionContent: normalizeBloomWebsiteHomepageSectionContent(
          website.homepage?.sectionContent,
        ),
      }}
      disabled={Boolean(shop.isSuspended)}
    />
  );
}
