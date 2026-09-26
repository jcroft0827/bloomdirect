import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteShopStorefront from "@/components/websites/storefront/BloomWebsiteShopStorefront";
import authOptions from "@/lib/auth";
import { getBloomWebsiteStorefrontCatalog } from "@/lib/bloom-websites/getBloomWebsiteStorefrontCatalog";
import {
  getBloomWebsiteCatalogMetadata,
  getBloomWebsitePreviewFallbackMetadata,
} from "@/lib/bloom-websites/storefront-metadata";

type BloomWebsiteShopPreviewPageProps = {
  params: Promise<{
    previewSlug: string;
  }>;

  searchParams: Promise<{
    q?: string | string[];
    occasion?: string | string[];
    category?: string | string[];
    sort?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: BloomWebsiteShopPreviewPageProps): Promise<Metadata> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return getBloomWebsitePreviewFallbackMetadata();
  }

  const { previewSlug } = await params;
  const catalog = await getBloomWebsiteStorefrontCatalog(
    previewSlug,
    session.user.id,
  );

  if (!catalog) {
    return getBloomWebsitePreviewFallbackMetadata();
  }

  return getBloomWebsiteCatalogMetadata(catalog);
}

export default async function BloomWebsiteShopPreviewPage({
  params,
  searchParams,
}: BloomWebsiteShopPreviewPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { previewSlug } = await params;
  const resolvedSearchParams = await searchParams;

  const catalog = await getBloomWebsiteStorefrontCatalog(
    previewSlug,
    session.user.id,
  );

  if (!catalog) {
    notFound();
  }

  return (
    <BloomWebsiteShopStorefront
      catalog={catalog}
      basePath={`/websites/preview/${catalog.website.previewSlug}`}
      searchParams={resolvedSearchParams}
      showPreviewBar
    />
  );
}
