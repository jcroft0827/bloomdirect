// src/app/api/websites/catalogue/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomCatalogueItem from "@/models/BloomCatalogueItem";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";

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
        "title description flowers colors occasions categories tags image.optimizedUrl image.width image.height isDesignerChoice sortOrder",
      )
      .sort({ sortOrder: 1, title: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      items: items.map((item) => ({
        id: String(item._id),
        title: item.title,
        description: item.description || "",
        flowers: item.flowers || [],
        colors: item.colors || [],
        occasions: item.occasions || [],
        categories: item.categories || [],
        tags: item.tags || [],
        imageUrl: item.image?.optimizedUrl || "",
        width: item.image?.width || null,
        height: item.image?.height || null,
        isDesignerChoice: item.isDesignerChoice === true,
      })),
    });
  } catch (error) {
    console.error("Failed to load florist Bloom image catalogue:", error);
    return NextResponse.json(
      { error: "Unable to load the Bloom image catalogue." },
      { status: 500 },
    );
  }
}
