import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteProductStorefront from "@/components/websites/storefront/BloomWebsiteProductStorefront";
import authOptions from "@/lib/auth";
import { getBloomWebsiteStorefrontProduct } from "@/lib/bloom-websites/getBloomWebsiteStorefrontProduct";
import {
  getBloomWebsitePreviewFallbackMetadata,
  getBloomWebsiteProductMetadata,
} from "@/lib/bloom-websites/storefront-metadata";
import {
  BloomWebsiteJsonLd,
  getBloomWebsiteProductStructuredData,
} from "@/lib/bloom-websites/storefront-structured-data";

type ProductPreviewPageProps = {
  params: Promise<{
    previewSlug: string;
    productSlug: string;
  }>;
};

export async function generateMetadata({
  params,
}: ProductPreviewPageProps): Promise<Metadata> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return getBloomWebsitePreviewFallbackMetadata();
  }

  const { previewSlug, productSlug } = await params;
  const storefront = await getBloomWebsiteStorefrontProduct(
    previewSlug,
    productSlug,
    session.user.id,
  );

  if (!storefront) {
    return getBloomWebsitePreviewFallbackMetadata();
  }

  return getBloomWebsiteProductMetadata(storefront);
}

export default async function BloomWebsiteProductPreviewPage({
  params,
}: ProductPreviewPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { previewSlug, productSlug } = await params;

  const storefront = await getBloomWebsiteStorefrontProduct(
    previewSlug,
    productSlug,
    session.user.id,
  );

  if (!storefront) {
    notFound();
  }

  const structuredData = getBloomWebsiteProductStructuredData(storefront);

  return (
    <>
      <BloomWebsiteJsonLd data={structuredData} />

      <BloomWebsiteProductStorefront
        storefront={storefront}
        basePath={`/websites/preview/${storefront.website.previewSlug}`}
        showPreviewBar
      />
    </>
  );
}
