import { connectToDB } from "@/lib/mongoose";
import { normalizeBloomWebsiteHostname } from "@/lib/bloom-websites/storefront-hostname";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

type ObjectIdLike = {
  toString(): string;
};

type LiveWebsiteLean = {
  _id: ObjectIdLike;
  shop: ObjectIdLike;
  previewSlug: string;
  siteName: string;
  customDomain: string;
  status: "preview" | "live" | "paused";
  domainVerified?: boolean;
  branding?: {
    logo?: string;
  };
};

type LiveShopLean = {
  _id: ObjectIdLike;
  businessName: string;
  isSuspended?: boolean;
};

export type BloomWebsiteLiveTenant = {
  websiteId: string;
  shopId: string;
  previewSlug: string;
  siteName: string;
  customDomain: string;
  businessName: string;
  logo: string;
};

export async function getBloomWebsiteLiveTenant(
  rawHostname: string,
): Promise<BloomWebsiteLiveTenant | null> {
  const hostname = normalizeBloomWebsiteHostname(rawHostname);

  if (!hostname) {
    return null;
  }

  await connectToDB();

  /*
   * This query is the authoritative public tenant boundary.
   *
   * A hostname does not become a storefront merely because
   * it exists on BloomWebsite. It must be:
   * - an exact custom-domain match
   * - ownership verified
   * - explicitly live
   */
  const website = (await BloomWebsite.findOne({
    customDomain: hostname,
    domainVerified: true,
    status: "live",
  })
    .select(
      "_id shop previewSlug siteName customDomain status domainVerified branding.logo",
    )
    .lean()) as LiveWebsiteLean | null;

  if (!website) {
    return null;
  }

  const shop = (await Shop.findById(website.shop)
    .select("_id businessName isSuspended")
    .lean()) as LiveShopLean | null;

  /*
   * Shop suspension is enforced here as a second public
   * boundary. A suspended florist must not retain a live
   * consumer storefront simply because the website record
   * still says "live".
   */
  if (!shop || shop.isSuspended) {
    return null;
  }

  return {
    websiteId: website._id.toString(),
    shopId: shop._id.toString(),
    previewSlug: website.previewSlug,
    siteName: website.siteName,
    customDomain: hostname,
    businessName: shop.businessName,
    logo: website.branding?.logo?.trim() || "",
  };
}
