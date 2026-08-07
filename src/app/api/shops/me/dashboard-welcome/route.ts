import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

type UpdateDashboardWelcomeBody = {
  dismissed?: unknown;
};

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 },
      );
    }

    let body: UpdateDashboardWelcomeBody;

    try {
      body = (await request.json()) as UpdateDashboardWelcomeBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 },
      );
    }

    if (typeof body.dismissed !== "boolean") {
      return NextResponse.json(
        {
          error:
            "The dismissed value must be true or false.",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const shop = await Shop.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          dismissedDashboardWelcome: body.dismissed,
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("_id dismissedDashboardWelcome");

    if (!shop) {
      return NextResponse.json(
        { error: "Shop not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      dismissedDashboardWelcome:
        shop.dismissedDashboardWelcome,
    });
  } catch (error) {
    console.error(
      "UPDATE DASHBOARD WELCOME ERROR:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update the dashboard welcome preference.",
      },
      { status: 500 },
    );
  }
}