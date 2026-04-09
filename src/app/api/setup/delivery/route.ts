import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Shop from "@/models/Shop";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const shopId = session.user.id;
    const body = await req.json();

    const { method, fallbackFee, maxRadius, sameDayCutoff, allowSameDay, zipZones, distanceZones } = body;

    // Find the shop
    const shop = await Shop.findById(shopId);
    if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

    shop.delivery = {
      ...shop.delivery,
      method,
      fallbackFee,
      maxRadius,
      sameDayCutoff,
      allowSameDay,
      zipZones,
      distanceZones,
    }

    shop.setupProgress = {
      ...shop.setupProgress,
      deliverySettings: true,
    };    

    await shop.save();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.log("Error: ", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}