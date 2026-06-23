// app/api/admin/websites/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import WebsiteVerificationRequest from "@/models/WebsiteVerificationRequest";
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

    const requests = await WebsiteVerificationRequest.find({
      status: "pending",
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("Failed to fetch website verification requests:", error);

    return NextResponse.json(
      { error: "Failed to fetch website verification requests." },
      { status: 500 }
    );
  }
}