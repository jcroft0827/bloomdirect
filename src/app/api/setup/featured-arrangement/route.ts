// app/api/setup/featured-arrangement/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Shop from "@/models/Shop";
import FulfillmentOffering from "@/models/FulfillmentOffering";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { ensureDefaultDesignerChoice } from "@/lib/offerings/ensureDefaultOfferings";

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shopId = session.user.id;
    const body = await req.json();

    const { name, price, description, image } = body;

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    await ensureDefaultDesignerChoice(shop._id.toString());

    const offeringName = name?.trim() || "Featured Arrangement";
    const numericPrice = Number(price || 0);

    if (numericPrice <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid starting price." },
        { status: 400 },
      );
    }

    await FulfillmentOffering.findOneAndUpdate(
      {
        shop: shop._id,
        type: "featured",
        isFeatured: true,
      },
      {
        $set: {
          shop: shop._id,
          type: "featured",
          name: offeringName,
          slug: slugify(offeringName),
          description: description?.trim() || "",
          image: image || "",
          occasions: ["everyday"],
          pricingTiers: [
            {
              label: "Standard",
              price: numericPrice,
              description: "",
            },
          ],
          taxable: true,
          allowsSubstitutions: true,
          isActive: true,
          isDefault: false,
          isFeatured: true,
          isDesignerChoice: false,
          sortOrder: 10,
          proOnly: false,
        },
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    shop.setupProgress = {
      ...shop.setupProgress,
      featuredBouquet: true,
    };

    shop.onboardingComplete = true;

    await shop.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Featured arrangement setup error:", error);

    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}