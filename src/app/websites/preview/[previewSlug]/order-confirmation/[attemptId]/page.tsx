import BloomWebsiteOrderConfirmation from "@/components/websites/storefront/BloomWebsiteOrderConfirmation";

type PageProps = {
  params: Promise<{
    previewSlug: string;
    attemptId: string;
  }>;
};

export default async function BloomWebsiteOrderConfirmationPage({
  params,
}: PageProps) {
  const { previewSlug, attemptId } = await params;

  return (
    <BloomWebsiteOrderConfirmation
      previewSlug={previewSlug}
      attemptId={attemptId}
      storefrontBasePath={`/websites/preview/${encodeURIComponent(previewSlug)}`}
    />
  );
}
