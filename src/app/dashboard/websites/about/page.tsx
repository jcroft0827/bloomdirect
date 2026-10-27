import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { getBloomWebsiteStorefront } from "@/lib/bloom-websites/getBloomWebsiteStorefront";
import BloomWebsiteAboutEditor from "@/components/websites/BloomWebsiteAboutEditor";
import authOptions from "@/lib/auth";
import { getDefaultBloomWebsiteAboutSections, getBloomWebsiteAboutStarterCopy } from "@/lib/bloom-websites/about-content";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import type {
  BloomWebsiteAboutFacts,
  BloomWebsiteAboutSection,
  BloomWebsiteAboutSectionKey,
} from "@/types/bloom-website";

type WebsiteLean = {
  previewSlug: string;
  homepage?: { aboutText?: string; aboutImage?: string };
  aboutPage?: {
    useCustomImage?: boolean;
    customImageUrl?: string;
    enabled?: boolean;
    heading?: string;
    contentMode?: "custom" | "guided";
    facts?: Partial<BloomWebsiteAboutFacts>;
    sections?: BloomWebsiteAboutSection[];
  };
};

type ShopLean = {
  businessName: string;
  address?: {
    city?: string;
    state?: string;
  };
};

export default async function BloomWebsiteAboutPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  await connectToDB();

  const [website, shop] = await Promise.all([
    BloomWebsite.findOne({ shop: session.user.id })
      .select("previewSlug homepage.aboutText homepage.aboutImage aboutPage")
      .lean<WebsiteLean | null>(),
    Shop.findById(session.user.id)
      .select("businessName address.city address.state")
      .lean<ShopLean | null>(),
  ]);

  if (!website || !shop) redirect("/dashboard/websites");

  const fallbackSections = getDefaultBloomWebsiteAboutSections(
    website.homepage?.aboutText || "",
  );
  const storedSections: BloomWebsiteAboutSection[] = Array.isArray(website.aboutPage?.sections)
    ? website.aboutPage.sections.map((section) => ({
        key: section.key,
        enabled: section.enabled !== false,
        title: section.title || "",
        body: section.body || "",
        textAlignment:
          section.textAlignment === "center" || section.textAlignment === "right"
            ? section.textAlignment
            : "left",
        desktopTextAlignment:
          section.desktopTextAlignment === "center" || section.desktopTextAlignment === "right"
            ? section.desktopTextAlignment
            : section.textAlignment === "center" || section.textAlignment === "right"
              ? section.textAlignment
              : "left",
        mobileTextAlignment:
          section.mobileTextAlignment === "center" || section.mobileTextAlignment === "right"
            ? section.mobileTextAlignment
            : section.textAlignment === "center" || section.textAlignment === "right"
              ? section.textAlignment
              : "left",
        sortOrder: Number(section.sortOrder || 0),
      }))
    : [];
  const starterCopy = getBloomWebsiteAboutStarterCopy({
    businessName: shop.businessName || "Your Flower Shop",
    city: shop.address?.city,
    state: shop.address?.state,
    fallbackStory: website.homepage?.aboutText,
  });
  // Existing empty text must not suppress helpful starter content in the editor.
  // This is only an editor draft until the florist reviews and saves it.
  const suggestedSectionKeys = storedSections.length
    ? storedSections.filter(section => (section.key === "story" || section.key === "specialties" || section.key === "community") && !section.body.trim()).map(section => section.key)
    : ["story", "specialties", "community"];
  const sectionMap = new Map<BloomWebsiteAboutSectionKey, BloomWebsiteAboutSection>(
    storedSections.map((section) => [section.key, section]),
  );
  const sections = [...fallbackSections, ...storedSections.filter(s => ["extra1", "extra2", "extra3"].includes(s.key))]
    .map((section) => ({ ...section, ...(sectionMap.get(section.key) || {}) }))
    .map(section => ({
      ...section,
      body: !section.body.trim() && (section.key === "story" || section.key === "specialties" || section.key === "community")
        ? starterCopy[section.key]
        : section.body,
    }))
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((section, sortOrder) => ({ ...section, sortOrder }));

  const storefront = await getBloomWebsiteStorefront(website.previewSlug, session.user.id);

  return (
    <BloomWebsiteAboutEditor
      storefront={storefront}
      businessName={shop.businessName || "Your Flower Shop"}
      city={shop.address?.city || ""}
      state={shop.address?.state || ""}
      storefrontAboutImage={website.homepage?.aboutImage || ""}
      suggestedSectionKeys={suggestedSectionKeys}
      initialValues={{
        useCustomImage: website.aboutPage?.useCustomImage === true,
        customImageUrl: website.aboutPage?.customImageUrl || "",
        enabled: website.aboutPage?.enabled !== false,
        heading: website.aboutPage?.heading || "About Us",
        contentMode:
          website.aboutPage?.contentMode === "custom" ? "custom" : "guided",
        facts: {
          openingYear: website.aboutPage?.facts?.openingYear || "",
          founderNames: website.aboutPage?.facts?.founderNames || "",
          originStory: website.aboutPage?.facts?.originStory || "",
          specialties: website.aboutPage?.facts?.specialties || "",
          community: website.aboutPage?.facts?.community || "",
          servicePhilosophy: website.aboutPage?.facts?.servicePhilosophy || "",
          differentiators: website.aboutPage?.facts?.differentiators || "",
        },
        sections,
      }}
    />
  );
}
