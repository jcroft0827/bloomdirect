import BloomWebsiteCardMessageCheckout from "@/components/websites/storefront/BloomWebsiteCardMessageCheckout";

type CardMessagePageProps = {
  params: Promise<{
    previewSlug: string;
  }>;
};

export default async function CardMessagePage({
  params,
}: CardMessagePageProps) {
  const { previewSlug } = await params;

  return <BloomWebsiteCardMessageCheckout previewSlug={previewSlug} />;
}
