import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust path if needed
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import bcrypt from "bcryptjs";
import ShopSession from "@/models/ShopSession";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        {
          error: "Your new password must be at least 8 characters long.",
        },
        { status: 400 },
      );
    }

    const shop = await Shop.findOne({
      email: session.user.email.toLowerCase(),
    }).select("+password");

    if (!shop) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(currentPassword, shop.password);

    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    // 🚨 DO NOT HASH HERE
    shop.password = newPassword;

    await shop.save();

    // Password changes invalidate every active browser session, including the
    // current one. The client already signs out after a successful response.
    await Shop.updateOne(
      { _id: shop._id },
      { $set: { sessionsValidAfter: new Date() } },
    );
    await ShopSession.deleteMany({ shopId: shop._id });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
