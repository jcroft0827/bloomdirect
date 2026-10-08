// src/app/api/websites/catalogue/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomCatalogueItem from "@/models/BloomCatalogueItem";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

const PRODUCT_OCCASIONS = new Set([
  "Birthday",
  "Anniversary",
  "Love & Romance",
  "Get Well",
  "New Baby",
  "Congratulations",
  "Thank You",
  "Thinking of You",
  "Sympathy",
  "Funeral",
  "Just Because",
]);

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    await connectToDB();

    const shop = await Shop.findById(session.user.id)
      .select("_id isSuspended")
      .lean<{ _id: unknown; isSuspended?: boolean } | null>();
    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "Suspended shops cannot use the Bloom image catalogue." },
        { status: 403 },
      );
    }

    const website = await BloomWebsite.exists({ shop: shop._id });
    if (!website) {
      return NextResponse.json(
        { error: "Create your BloomWebsite before choosing catalogue images." },
        { status: 404 },
      );
    }

    const items = await BloomCatalogueItem.find({ isActive: true })
      .select(
        "title shortDescription description flowers colors occasions categories tags suggestedProduct suggestedSeo image.optimizedUrl image.width image.height isDesignerChoice sortOrder",
      )
      .sort({ sortOrder: 1, title: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      items: items.map((item) => {
        const legacySuggested = item.suggestedProduct || {};
        const title = legacySuggested.name || item.title || "";
        const shortDescription =
          item.shortDescription || legacySuggested.shortDescription || "";
        const description = legacySuggested.description || item.description || "";
        const occasions = stringArray(item.occasions).length
          ? stringArray(item.occasions)
          : stringArray(legacySuggested.occasions);
        const tags = stringArray(item.tags).length
          ? stringArray(item.tags)
          : stringArray(legacySuggested.tags);
        const category =
          legacySuggested.category || stringArray(item.categories)[0] || "";
        const seo = item.suggestedSeo || {};

        return {
          id: String(item._id),
          title,
          shortDescription,
          description,
          flowers: stringArray(item.flowers),
          colors: stringArray(item.colors),
          occasions,
          categories: category ? [category] : stringArray(item.categories),
          tags,
          suggestedProduct: {
            name: title,
            shortDescription,
            description,
            category,
            occasions: occasions.filter((occasion) => PRODUCT_OCCASIONS.has(occasion)),
            tags,
            seoTitle: seo.title || "",
            seoDescription: seo.description || "",
            imageAltText: seo.imageAltText || "",
            socialTitle: seo.socialTitle || "",
            socialDescription: seo.socialDescription || "",
          },
          imageUrl: item.image?.optimizedUrl || "",
          width: item.image?.width || null,
          height: item.image?.height || null,
          isDesignerChoice: item.isDesignerChoice === true,
        };
      }),
    });
  } catch (error) {
    console.error("Failed to load florist Bloom image catalogue:", error);
    return NextResponse.json(
      { error: "Unable to load the Bloom image catalogue." },
      { status: 500 },
    );
  }
}
