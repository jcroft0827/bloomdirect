import { getBloomWebsiteStorefront } from "@/lib/bloom-websites/getBloomWebsiteStorefront";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteWeddingsEditor from "@/components/websites/BloomWebsiteWeddingsEditor";
import type { BloomWebsiteTextAlignment, BloomWebsiteWeddingFloralDecoration, BloomWebsiteWeddingsPage } from "@/types/bloom-website";

function normalizeAlignment(
  value: BloomWebsiteTextAlignment | undefined,
  fallback: BloomWebsiteTextAlignment,
): BloomWebsiteTextAlignment {
  return value === "center" || value === "right" || value === "left"
    ? value
    : fallback;
}

function normalizeDecoration(
  value: string | undefined,
): BloomWebsiteWeddingFloralDecoration {
  if (value === "softBorder") return "softBorder";
  if (value === "hanging" || value === "border" || value === "corners" || value === "subtle" || value === "full") {
    return "softBorder";
  }
  return "none";
}

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  await connectToDB();
  const website = await BloomWebsite.findOne({ shop: session.user.id })
    .select("previewSlug weddingsPage siteName")
    .lean<{
      previewSlug: string;
      siteName?: string;
      weddingsPage?: Partial<BloomWebsiteWeddingsPage> & {
        floralDecoration?: string;
      };
    }>();

  if (!website) redirect("/dashboard/websites");

  const config = website.weddingsPage;
  const headingDesktop = normalizeAlignment(
    config?.headingAlignmentDesktop ?? config?.headingAlignment,
    "center",
  );
  const headingMobile = normalizeAlignment(
    config?.headingAlignmentMobile ?? config?.headingAlignmentDesktop ?? config?.headingAlignment,
    headingDesktop,
  );
  const contentDesktop = normalizeAlignment(
    config?.contentAlignmentDesktop ?? config?.contentAlignment,
    "left",
  );
  const contentMobile = normalizeAlignment(
    config?.contentAlignmentMobile ?? config?.contentAlignmentDesktop ?? config?.contentAlignment,
    contentDesktop,
  );

  const initialValues: BloomWebsiteWeddingsPage = {
    floralDecoration: normalizeDecoration(config?.floralDecoration),
    headingAlignment: headingDesktop,
    contentAlignment: contentDesktop,
    headingAlignmentDesktop: headingDesktop,
    headingAlignmentMobile: headingMobile,
    contentAlignmentDesktop: contentDesktop,
    contentAlignmentMobile: contentMobile,
    enabled: config?.enabled === true,
    heading: config?.heading || "Weddings & Events",
    introduction: config?.introduction || "",
    services: config?.services || "",
    eventTypes: config?.eventTypes || "",
    serviceArea: config?.serviceArea || "",
    consultationText: config?.consultationText || "",
    portfolioHeading: config?.portfolioHeading || "Selected Work",
    portfolioDescription:
      config?.portfolioDescription || "Weddings, events & meaningful moments",
    portfolio: (config?.portfolio || []).map((p) => ({
      url: p.url || "",
      alt: p.alt || "",
      caption: p.caption || "",
    })),
  };

  const storefront = await getBloomWebsiteStorefront(
    website.previewSlug,
    session.user.id,
  );

  return (
    <BloomWebsiteWeddingsEditor
      storefront={storefront}
      initialValues={initialValues}
      previewSlug={website.previewSlug}
      shopName={website.siteName || "Your Flower Shop"}
    />
  );
}
