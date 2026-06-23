import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    await connectToDB();

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const customers = await Shop.find({})
      .select(
        "businessName shopName email role isPro isPublic onboardingComplete isVerified verifiedFlorist createdAt lastLogin address contact"
      )
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      customers,
    });
  } catch (error) {
    console.error("Failed to load admin customers:", error);

    return NextResponse.json(
      { error: "Failed to load customers." },
      { status: 500 }
    );
  }
}