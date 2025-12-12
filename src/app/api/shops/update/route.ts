import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { redirect } from "next/navigation";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    // 🔥 New logic: shop ID = user ID
    const shopId = session?.user?.id;

    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const updatedShop = await Shop.findByIdAndUpdate(shopId, body, {
      new: true,
    });

    if (!updatedShop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, shop: updatedShop });
    redirect('/dashboard');

  } catch (error: any) {
    console.error("Update shop error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
