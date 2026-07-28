import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { AdminAuditLog } from "@/models/AdminAuditLog";
import Shop from "@/models/Shop";
import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{
    shopId: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { shopId } = await context.params;

    if (!mongoose.Types.ObjectId.isValid(shopId)) {
      return NextResponse.json({ error: "Invalid shop ID." }, { status: 400 });
    }

    await connectToDB();

    const shopExists = await Shop.exists({
      _id: shopId,
      role: {
        $ne: "admin",
      },
    });

    if (!shopExists) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    const history = await AdminAuditLog.find({
      targetShop: shopId,
    })
      .populate({
        path: "adminShop",
        select: "businessName email",
      })
      .sort({
        createdAt: -1,
      })
      .limit(100)
      .lean();

    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: unknown) {
    console.error("Failed to load shop audit history:", error);

    return NextResponse.json(
      {
        error: "Failed to load audit history.",
      },
      {
        status: 500,
      },
    );
  }
}
