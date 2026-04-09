import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Shop from "@/models/Shop";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";

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

    // Find the shop
    const shop = await Shop.findById(shopId);
    if (!shop)
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    shop.featuredBouquet = {
      ...shop.featuredBouquet,
      name,
      price,
      description,
      image
    }

    // Mark featuredBouquet setup as complete
    shop.setupProgress = {
      ...shop.setupProgress,
      featuredBouquet: true,
    };

    // Mark onboardingComplete true
    shop.onboardingComplete = true;

    await shop.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
