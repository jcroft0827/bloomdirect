import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Notifications from "@/models/Notifications";
import "@/models/Order";
import "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";



export async function GET(
    req: Request,
    context: { params: Promise<{ id: string }> },
) {
    try {
        await connectToDB();

        const { id } = await context.params;

        const read = false; // Only fetch unread notifications by default

        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const shopId = id;

        const notifications = await Notifications.find({ receivingShop: shopId, read: read })
            .populate("sendingShop", "businessName")
            .populate("order", "orderNumber")
            .sort({ createdAt: -1 });

        return NextResponse.json(notifications);

    } catch (error) {
        console.error("ERROR FETCHING NOTIFICATIONS:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }}