import BloomWebsiteDeliveryCheckout from "@/components/websites/storefront/BloomWebsiteDeliveryCheckout";

type DeliveryCheckoutPageProps = {
  params: Promise<{
    previewSlug: string;
  }>;
};

export default async function DeliveryCheckoutPage({
  params,
}: DeliveryCheckoutPageProps) {
  const { previewSlug } = await params;

  return <BloomWebsiteDeliveryCheckout previewSlug={previewSlug} />;
}
