import BloomWebsitePaymentCheckout from "@/components/websites/storefront/BloomWebsitePaymentCheckout";

type PaymentCheckoutPageProps = {
  params: Promise<{
    previewSlug: string;
  }>;
};

export default async function PaymentCheckoutPage({
  params,
}: PaymentCheckoutPageProps) {
  const { previewSlug } = await params;

  return <BloomWebsitePaymentCheckout previewSlug={previewSlug} />;
}
