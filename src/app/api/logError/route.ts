import { ApiError } from "@/lib/api-error";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import ErrorLogs from "@/models/ErrorLogs";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await connectToDB();

    // Get logged-in shop (shop === user)
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read request payload
    const body = await req.json();

    const { actorId, eventType, orderId, errorMessage, devMessage } = body;

    // Validate critical data
    const requiredFields = ["actorId", "eventType", "errorMessage"];

    //--// Find what fields are missing or empty
    const missingFields = requiredFields.filter((field) => !body[field]);

    //--// If the array has any items, some fields are missing
    if (missingFields.length > 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
        }),
        { status: 400 },
      );
    }

    // create Log
    const errorLog = await ErrorLogs.create({
      actorId,
      eventType,
      orderId,
      errorMessage,
      devMessage,
    });

    return NextResponse.json({ success: true, errorLog });
  } catch (error: any) {
    console.error("Error Logging Error: ", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Failed to create error log.", code: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
