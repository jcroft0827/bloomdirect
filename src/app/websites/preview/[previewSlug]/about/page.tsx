import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteAboutStorefront from "@/components/websites/storefront/BloomWebsiteAboutStorefront";
import WebsitePreviewBar from "@/components/websites/WebsitePreviewBar";
import authOptions from "@/lib/auth";
import { getBloomWebsiteStorefront } from "@/lib/bloom-websites/getBloomWebsiteStorefront";
import {
  getBloomWebsiteAboutMetadata,
  getBloomWebsitePreviewFallbackMetadata,
} from "@/lib/bloom-websites/storefront-metadata";
import {
  BloomWebsiteJsonLd,
  getBloomWebsiteAboutStructuredData,
} from "@/lib/bloom-websites/storefront-structured-data";

type Props = {
  params: Promise<{ previewSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return getBloomWebsitePreviewFallbackMetadata();

  const { previewSlug } = await params;
  const storefront = await getBloomWebsiteStorefront(previewSlug, session.user.id);
  if (!storefront) return getBloomWebsitePreviewFallbackMetadata();

  return getBloomWebsiteAboutMetadata(storefront);
}

export default async function BloomWebsiteAboutPreviewPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const { previewSlug } = await params;
  const storefront = await getBloomWebsiteStorefront(previewSlug, session.user.id);
  if (!storefront || storefront.website.aboutPage?.enabled === false) notFound();

  return (
    <div className="pb-28 sm:pb-20">
      <BloomWebsiteJsonLd data={getBloomWebsiteAboutStructuredData(storefront)} />
      <BloomWebsiteAboutStorefront
        storefront={storefront}
        basePath={`/websites/preview/${storefront.website.previewSlug}`}
      />
      <WebsitePreviewBar websiteId={storefront.website.id} />
    </div>
  );
}
