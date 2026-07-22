import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { ApiError } from "@/lib/api-error";

type UpdateShopBody = {
  logo?: string;
};

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    const shopId = session?.user?.id;

    if (!shopId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as UpdateShopBody;

    if (!body.logo) {
      return NextResponse.json(
        { error: "No supported fields were provided." },
        { status: 400 },
      );
    }

    const shop = await Shop.findById(shopId);

    if (!shop) {
      return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    shop.set("branding.logo", body.logo);

    await shop.save();

    return NextResponse.json({
      success: true,
      logo: shop.branding?.logo,
    });
  } catch (error: unknown) {
    console.error("UPDATE SHOP ERROR:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      {
        error:
          "Something went wrong. Please try again. If the issue persists, contact GetBloomDirect Support.",
        code: "SERVER_ERROR",
      },
      { status: 500 },
    );
  }
}