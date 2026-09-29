import BloomWebsiteCartProvider from "@/components/websites/storefront/BloomWebsiteCartProvider";
import BloomWebsiteCheckoutProvider from "@/components/websites/storefront/BloomWebsiteCheckoutProvider";
import BloomWebsiteThemeSurface from "@/components/websites/storefront/BloomWebsiteThemeSurface";

import { normalizeBloomWebsiteStorefrontTheme } from "@/lib/bloom-websites/storefront-theme";
import { connectToDB } from "@/lib/mongoose";

import BloomWebsite from "@/models/BloomWebsite";

import type { Metadata } from "next";
import type { ReactNode } from "react";


const previewRobots: Metadata["robots"] = {
  index: false,
  follow: false,
  noarchive: true,
  googleBot: {
    index: false,
    follow: false,
    noarchive: true,
  },
};

export async function generateMetadata({
  params,
}: PreviewLayoutProps): Promise<Metadata> {
  const { previewSlug } = await params;

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    previewSlug: previewSlug.toLowerCase().trim(),
  })
    .select("branding.logo")
    .lean()) as { branding?: { logo?: string } } | null;

  const logo = website?.branding?.logo?.trim() || "";

  return {
    robots: previewRobots,
    ...(logo
      ? {
          icons: {
            icon: logo,
            shortcut: logo,
            apple: logo,
          },
        }
      : {}),
  };
}

type PreviewLayoutProps = {
  children: ReactNode;

  params: Promise<{
    previewSlug: string;
  }>;
};

type WebsiteLean = {
  theme?: string;

  branding?: {
    logo?: string;

    tagline?: string;

    primaryColor?: string;
    accentColor?: string;

    backgroundStyle?: string;
  };
};

export default async function PreviewLayout({
  children,
  params,
}: PreviewLayoutProps) {
  const { previewSlug } = await params;

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    previewSlug: previewSlug.toLowerCase().trim(),
  })
    .select(
      [
        "theme",
        "branding.logo",
        "branding.tagline",
        "branding.primaryColor",
        "branding.accentColor",
        "branding.backgroundStyle",
      ].join(" "),
    )
    .lean()) as WebsiteLean | null;

  const storefrontTheme = normalizeBloomWebsiteStorefrontTheme({
    themeName: website?.theme,

    logo: website?.branding?.logo,

    tagline: website?.branding?.tagline,

    primaryColor: website?.branding?.primaryColor,

    accentColor: website?.branding?.accentColor,

    /*
     * Decorative storefront backgrounds are intentionally
     * tabled for V1. The underlying field remains supported,
     * but the live storefront uses Bloom's clean canvas.
     */
    backgroundStyle: "clean",
  });

  return (
    <BloomWebsiteThemeSurface theme={storefrontTheme}>
      <BloomWebsiteCheckoutProvider previewSlug={previewSlug}>
        <BloomWebsiteCartProvider
          previewSlug={previewSlug}
          basePath={`/websites/preview/${encodeURIComponent(previewSlug)}`}
        >
          {children}
        </BloomWebsiteCartProvider>
      </BloomWebsiteCheckoutProvider>
    </BloomWebsiteThemeSurface>
  );
}
