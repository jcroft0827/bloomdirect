import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteBrandingEditor from "@/components/websites/BloomWebsiteBrandingEditor";
import authOptions from "@/lib/auth";
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
    heroImage?: string;
  };
};

type ShopLean = {
  isSuspended?: boolean;
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
          "homepage.heroImage",
        ].join(" "),
      )
      .lean<WebsiteLean | null>(),

    Shop.findById(session.user.id)
      .select("isSuspended")
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

        heroImage: website.homepage?.heroImage || "",
      }}
      disabled={Boolean(shop.isSuspended)}
    />
  );
}
