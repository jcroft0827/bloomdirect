import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteStorefrontEditor from "@/components/websites/BloomWebsiteStorefrontEditor";
import authOptions from "@/lib/auth";
import { buildBloomWebsiteHeroHeadline, buildBloomWebsiteHeroSubheadline } from "@/lib/bloom-websites/branding-copy";
import { normalizeBloomWebsiteHeroSlides } from "@/lib/bloom-websites/storefront-editor";
import {
  normalizeBloomWebsiteHeroInfoCardContent,
  normalizeBloomWebsiteHomepageMerchandisingSections,
  normalizeBloomWebsiteHomepageSectionContent,
  normalizeBloomWebsiteHomepageSectionOrder,
  normalizeBloomWebsiteHomepageSectionVisibility,
  normalizeBloomWebsiteTrustPoints,
} from "@/lib/bloom-websites/storefront-content";
import { normalizeBloomWebsiteStorefrontTheme } from "@/lib/bloom-websites/storefront-theme";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";
import Shop from "@/models/Shop";

type WebsiteLean = {
  previewSlug: string;
  siteName: string;
  theme?: string;
  branding?: { logo?: string; tagline?: string; primaryColor?: string; accentColor?: string; backgroundStyle?: string };
  homepage?: { heroHeadline?: string; heroSubheadline?: string; heroImage?: string; heroSlides?: unknown; heroInfoCard?: unknown; trustPoints?: unknown; aboutImage?: string; sectionContent?: unknown; sectionOrder?: unknown; sectionVisibility?: unknown; merchandisingSections?: unknown };
};

type ShopLean = {
  isSuspended?: boolean;
  branding?: { socialLinks?: { facebook?: string; instagram?: string; pinterest?: string; tiktok?: string } };
};

export default async function BloomWebsiteStorefrontEditorPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  await connectToDB();

  const [website, shop, productMetadataRaw] = await Promise.all([
    BloomWebsite.findOne({ shop: session.user.id }).select("previewSlug siteName theme branding homepage").lean<WebsiteLean | null>(),
    Shop.findById(session.user.id).select("isSuspended branding.socialLinks").lean<ShopLean | null>(),
    BloomWebsiteProduct.find({ shop: session.user.id, isActive: true })
      .select("category occasions")
      .lean(),
  ]);

  if (!shop) redirect("/login");
  if (!website) notFound();

  const productMetadata = productMetadataRaw as unknown as Array<{ category?: string; occasions?: string[] }>;

  const theme = normalizeBloomWebsiteStorefrontTheme({
    themeName: website.theme,
    logo: website.branding?.logo,
    tagline: website.branding?.tagline,
    primaryColor: website.branding?.primaryColor,
    accentColor: website.branding?.accentColor,
    backgroundStyle: website.branding?.backgroundStyle,
  });

  const availableCategories = Array.from(
    new Set(productMetadata.map((product) => product.category?.trim()).filter((value): value is string => Boolean(value))),
  ).sort((a, b) => a.localeCompare(b));
  const availableOccasions = Array.from(
    new Set(productMetadata.flatMap((product) => product.occasions || []).map((value) => value.trim()).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b));

  const fallbackHeadline = website.homepage?.heroHeadline || buildBloomWebsiteHeroHeadline(website.siteName);
  const fallbackSubheadline = website.homepage?.heroSubheadline || buildBloomWebsiteHeroSubheadline(theme.tagline);

  return (
    <BloomWebsiteStorefrontEditor
      previewSlug={website.previewSlug}
      siteName={website.siteName}
      logo={theme.logo}
      tagline={theme.tagline}
      primaryColor={theme.primaryColor}
      accentColor={theme.accentColor}
      socialLinks={{
        facebook: shop.branding?.socialLinks?.facebook || "",
        instagram: shop.branding?.socialLinks?.instagram || "",
        pinterest: shop.branding?.socialLinks?.pinterest || "",
        tiktok: shop.branding?.socialLinks?.tiktok || "",
      }}
      availableCategories={availableCategories}
      availableOccasions={availableOccasions}
      initialValues={{
        theme: theme.themeName,
        heroSlides: normalizeBloomWebsiteHeroSlides(website.homepage?.heroSlides, {
          headline: fallbackHeadline,
          subheadline: fallbackSubheadline,
          imageUrl: website.homepage?.heroImage || "",
        }),
        heroInfoCard: normalizeBloomWebsiteHeroInfoCardContent(website.homepage?.heroInfoCard),
        trustPoints: normalizeBloomWebsiteTrustPoints(website.homepage?.trustPoints),
        aboutImage: website.homepage?.aboutImage || "",
        sectionOrder: normalizeBloomWebsiteHomepageSectionOrder(website.homepage?.sectionOrder),
        sectionVisibility: normalizeBloomWebsiteHomepageSectionVisibility(website.homepage?.sectionVisibility),
        merchandisingSections: normalizeBloomWebsiteHomepageMerchandisingSections(website.homepage?.merchandisingSections),
        sectionContent: normalizeBloomWebsiteHomepageSectionContent(website.homepage?.sectionContent),
      }}
      disabled={Boolean(shop.isSuspended)}
    />
  );
}
