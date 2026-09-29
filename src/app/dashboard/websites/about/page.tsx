import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import BloomWebsiteAboutEditor from "@/components/websites/BloomWebsiteAboutEditor";
import authOptions from "@/lib/auth";
import { getDefaultBloomWebsiteAboutSections } from "@/lib/bloom-websites/about-content";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import type {
  BloomWebsiteAboutFacts,
  BloomWebsiteAboutSection,
  BloomWebsiteAboutSectionKey,
} from "@/types/bloom-website";

type WebsiteLean = {
  homepage?: { aboutText?: string };
  aboutPage?: {
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
      .select("homepage.aboutText aboutPage")
      .lean<WebsiteLean | null>(),
    Shop.findById(session.user.id)
      .select("businessName address.city address.state")
      .lean<ShopLean | null>(),
  ]);

  if (!website || !shop) redirect("/dashboard/websites");

  const fallbackSections = getDefaultBloomWebsiteAboutSections(
    website.homepage?.aboutText || "",
  );
  const storedSections = Array.isArray(website.aboutPage?.sections)
    ? website.aboutPage.sections
    : [];
  const sectionMap = new Map<BloomWebsiteAboutSectionKey, BloomWebsiteAboutSection>(
    storedSections.map((section) => [section.key, section]),
  );
  const sections = fallbackSections
    .map((section) => ({ ...section, ...(sectionMap.get(section.key) || {}) }))
    .sort((a, b) => Number(a.sortOrder || 0) - Number(b.sortOrder || 0))
    .map((section, sortOrder) => ({ ...section, sortOrder }));

  return (
    <BloomWebsiteAboutEditor
      businessName={shop.businessName || "Your Flower Shop"}
      city={shop.address?.city || ""}
      state={shop.address?.state || ""}
      initialValues={{
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
