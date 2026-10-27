import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import authOptions from "@/lib/auth";
import { getBloomWebsiteStorefront } from "@/lib/bloom-websites/getBloomWebsiteStorefront";
import BloomWebsiteWeddingsStorefront from "@/components/websites/storefront/BloomWebsiteWeddingsStorefront";
import WebsitePreviewBar from "@/components/websites/WebsitePreviewBar";
export const metadata = { title: "Weddings & Events Preview", robots: { index: false, follow: false } };
export default async function Page({ params }: {params: Promise<{previewSlug: string}>}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const { previewSlug } = await params;
  const storefront = await getBloomWebsiteStorefront(previewSlug, session.user.id);
  if (!storefront) notFound();
  return <div className="pb-28"><BloomWebsiteWeddingsStorefront storefront={storefront} basePath={`/websites/preview/${previewSlug}`} /><WebsitePreviewBar websiteId={storefront.website.id}/></div>;
}
