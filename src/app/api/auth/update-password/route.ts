import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // adjust path if needed
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const shop = await Shop.findOne({
      email: session.user.email.toLowerCase(),
    }).select("+password");

    if (!shop) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const isMatch = await bcrypt.compare(
      currentPassword,
      shop.password
    );

    if (!isMatch) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // 🚨 DO NOT HASH HERE
    shop.password = newPassword;

    await shop.save(); // pre-save hook hashes it

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("UPDATE PASSWORD ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
