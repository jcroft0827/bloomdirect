import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { ensureDefaultDesignerChoice } from "@/lib/offerings/ensureDefaultOfferings";

export async function GET() {
  try {
    await connectToDB();
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const shop = await Shop.findById(session?.user?.shopId).lean();

    await ensureDefaultDesignerChoice(session?.user?.shopId.toString());

    return NextResponse.json({ shop });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
