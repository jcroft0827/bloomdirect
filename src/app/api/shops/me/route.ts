import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await Shop.findById(session.user.shopId).lean();

    return NextResponse.json({ shop });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
