import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import FulfillmentOffering from "@/models/FulfillmentOffering";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const shopId = id;

    if (!shopId) {
      return NextResponse.json(
        { error: "Shop ID is required." },
        { status: 400 },
      );
    }

    const shop = await Shop.findById(shopId).select(
      "businessName isSuspended isPublic isPro",
    );

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        { error: "This shop is currently unavailable" },
        { status: 403 },
      );
    }

    if (!shop.isPublic) {
      return NextResponse.json(
        { error: "This shop is not currently public" },
        { status: 403 },
      );
    }

    const offerings = await FulfillmentOffering.find({
      shop: shopId,
      isActive: true,
    })
      .sort({ isDesignerChoice: -1, sortOrder: 1, createdAt: 1 })
      .select(
        "type name internalName slug description image occasions pricingTiers allowsSubstitutions isActive isDefault isFeatured isDesignerChoice sortOrder proOnly taxable",
      )
      .lean();

    return NextResponse.json({
      success: true,
      shop: {
        id: shop._id.toString(),
        businessName: shop.businessName,
        isPro: shop.isPro,
      },
      offerings,
    });
  } catch (error) {
    console.error("Get shop offerings error: ", error);

    return NextResponse.json(
      { error: "Failed to load shop offerings." },
      { status: 500 },
    );
  }
}
