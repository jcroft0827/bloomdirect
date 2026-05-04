import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Notifications from "@/models/Notifications";
import OrderMessages from "@/models/OrderMessages";
import { getServerSession } from "next-auth";

export async function POST(req: Request) {
    try {
        await connectToDB();

        const session = await getServerSession(authOptions);
        // Only allow authenticated shops to send messages
        if (!session?.user?.id) {
            return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), { status: 401 });
        }
        
        const { orderId, sendingShopId, receivingShopId, message } = await req.json();

        // Validate message content and order ID
        if (!orderId || !sendingShopId || !receivingShopId || !message || message.trim() === "") {
            return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), { status: 400 });
        }

        // Add to notification queue
        const newNotification = new Notifications({
            type: "NewMessage",
            receivingShop: receivingShopId,
            sendingShop: sendingShopId,
            order: orderId,
            message: message.trim(),
            read: false,
            readAt: null,
        });

        console.log("Creating notification:", newNotification);

        await newNotification.save();

        // Create and save the new message in the database
        const newMessage = new OrderMessages({
            message: message.trim(),
            sendingShop: sendingShopId,
            receivingShop: receivingShopId,
            order: orderId,
            read: false,
            readAt: null,
        });

        await newMessage.save();

        return new Response(JSON.stringify({ success: true, message: "Message sent successfully" }), { status: 200 });

    } catch (error) {
        console.error("ERROR SENDING MESSAGE:", error);
        return new Response(JSON.stringify({ success: false, error: "Internal Server Error" }), { status: 500 });
    }
}