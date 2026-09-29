import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import BloomWebsiteSeoEditor from "@/components/websites/BloomWebsiteSeoEditor";
import authOptions from "@/lib/auth";
import {
  getBloomWebsiteConfiguredDeliveryZipCodes,
  getBloomWebsiteHomepageSeoDefaults,
  normalizeBloomWebsiteBusinessHours,
  normalizeBloomWebsiteLocalSeoContent,
} from "@/lib/bloom-websites/storefront-seo";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import type {
  BloomWebsiteBusinessHour,
  BloomWebsiteLocalSeoContent,
} from "@/types/bloom-website";

type WebsiteLean = {
  previewSlug: string;
  siteName: string;
  status: "preview" | "live" | "paused";
  customDomain?: string;
  domainVerified?: boolean;
  domainRoutingReady?: boolean;
  branding?: {
    logo?: string;
    tagline?: string;
  };
  homepage?: {
    heroSubheadline?: string;
    heroImage?: string;
    aboutText?: string;
  };
  aboutPage?: {
    sections?: Array<{
      key?: string;
      body?: string;
    }>;
  };
  seo?: {
    homepageTitle?: string;
    homepageDescription?: string;
    socialTitle?: string;
    socialDescription?: string;
    socialImageUrl?: string;
    businessDescription?: string;
    googleBusinessProfileUrl?: string;
    googleSiteVerification?: string;
    bingSiteVerification?: string;
    businessHours?: BloomWebsiteBusinessHour[];
    localDelivery?: Partial<BloomWebsiteLocalSeoContent>;
  };
  settings?: {
    showPhone?: boolean;
    showAddress?: boolean;
  };
};

type ShopLean = {
  businessName: string;
  isSuspended?: boolean;
  contact?: {
    phone?: string;
  };
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  delivery?: {
    method?: string;
    zipZones?: Array<{
      zip?: string;
    }>;
  };
};

function formatAddress(address: ShopLean["address"]) {
  if (!address) return "";

  const cityStateZip = [
    address.city,
    [address.state, address.zip].filter(Boolean).join(" "),
  ]
    .filter(Boolean)
    .join(", ");

  return [address.street, cityStateZip, address.country]
    .filter(Boolean)
    .join(" · ");
}

export default async function BloomWebsiteSeoPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const [website, shop] = await Promise.all([
    BloomWebsite.findOne({ shop: session.user.id })
      .select(
        [
          "previewSlug",
          "siteName",
          "status",
          "customDomain",
          "domainVerified",
          "domainRoutingReady",
          "branding.logo",
          "branding.tagline",
          "homepage.heroSubheadline",
          "homepage.heroImage",
          "homepage.aboutText",
          "aboutPage.sections",
          "seo",
          "settings.showPhone",
          "settings.showAddress",
        ].join(" "),
      )
      .lean<WebsiteLean | null>(),
    Shop.findById(session.user.id)
      .select(
        [
          "businessName",
          "isSuspended",
          "contact.phone",
          "address.street",
          "address.city",
          "address.state",
          "address.zip",
          "address.country",
          "delivery.method",
          "delivery.zipZones.zip",
        ].join(" "),
      )
      .lean<ShopLean | null>(),
  ]);

  if (!shop) {
    redirect("/login");
  }

  if (!website) {
    notFound();
  }

  const story = website.aboutPage?.sections?.find(
    (section) => section.key === "story",
  )?.body;

  const defaults = getBloomWebsiteHomepageSeoDefaults({
    businessName: shop.businessName,
    siteName: website.siteName,
    city: shop.address?.city,
    state: shop.address?.state,
    tagline: website.branding?.tagline,
    heroSubheadline: website.homepage?.heroSubheadline,
    heroImage: website.homepage?.heroImage,
    logo: website.branding?.logo,
    aboutText: story || website.homepage?.aboutText,
  });

  return (
    <BloomWebsiteSeoEditor
      previewSlug={website.previewSlug}
      initialValues={{
        homepageTitle: website.seo?.homepageTitle || "",
        homepageDescription: website.seo?.homepageDescription || "",
        socialTitle: website.seo?.socialTitle || "",
        socialDescription: website.seo?.socialDescription || "",
        socialImageUrl: website.seo?.socialImageUrl || "",
        businessDescription: website.seo?.businessDescription || "",
        googleBusinessProfileUrl:
          website.seo?.googleBusinessProfileUrl || "",
        googleSiteVerification:
          website.seo?.googleSiteVerification || "",
        bingSiteVerification: website.seo?.bingSiteVerification || "",
        businessHours: normalizeBloomWebsiteBusinessHours(
          website.seo?.businessHours,
        ),
        localDelivery: normalizeBloomWebsiteLocalSeoContent(
          website.seo?.localDelivery,
        ),
      }}
      defaults={{
        homepageTitle: defaults.title,
        homepageDescription: defaults.description,
        socialTitle: defaults.socialTitle,
        socialDescription: defaults.socialDescription,
        socialImageUrl: defaults.socialImageUrl,
        businessDescription: defaults.businessDescription,
      }}
      businessIdentity={{
        businessName: shop.businessName || website.siteName,
        phone: shop.contact?.phone || "",
        address: formatAddress(shop.address),
        showPhone: website.settings?.showPhone !== false,
        showAddress: website.settings?.showAddress !== false,
      }}
      configuredDeliveryZipCodes={getBloomWebsiteConfiguredDeliveryZipCodes({
        method: shop.delivery?.method,
        zipZones: shop.delivery?.zipZones,
      })}
      indexing={{
        status: website.status,
        customDomain: website.customDomain || "",
        domainVerified: website.domainVerified === true,
        domainRoutingReady: website.domainRoutingReady === true,
      }}
      disabled={Boolean(shop.isSuspended)}
    />
  );
}
