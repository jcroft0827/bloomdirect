import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function POST(req: Request) {
  try {
    await connectToDB();

    const { email, securityCode } = await req.json();



    if (!email || !securityCode) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const shop = await Shop.findOne({
      email: email.toLowerCase(),
    }).select("+password +securityCode");
    console.log("DB securityCode:", shop.securityCode);
console.log("Input securityCode:", securityCode);
    
    if (!shop) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }


    if (shop.securityCode?.trim() !== securityCode.trim()) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 400 }
      );
    }

    const tempPassword = "Flowers123!";

    // 🚨 DO NOT HASH HERE
    shop.password = tempPassword;

    await shop.save(); // pre-save hook hashes it

    return NextResponse.json({
      success: true,
      tempPassword,
    });

  } catch (error) {
    console.error("RESET PASSWORD ERROR:", error);
    return NextResponse.json(
      { error: "Server error" },
      { status: 500 }
    );
  }
}
