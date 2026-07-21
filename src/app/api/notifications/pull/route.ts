import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Notifications from "@/models/Notifications";
import "@/models/Order";
import "@/models/Shop";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await connectToDB();

    const notifications = await Notifications.find({
      receivingShop: session.user.id,
      read: false,
    })
      .populate("sendingShop", "businessName")
      .populate("order", "orderNumber")
      .sort({ createdAt: -1 });

    return NextResponse.json({
      notifications,
    });
  } catch (error) {
    console.error("ERROR FETCHING NOTIFICATIONS:", error);

    return NextResponse.json(
      { error: "Failed to load notifications." },
      { status: 500 },
    );
  }
}