import { ApiError } from "@/lib/api-error";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { NextResponse } from "next/server";

export async function POST(req: Request) {

  try {
    await connectToDB();
    const body = await req.json();
  
    const existing = await Shop.findOne({ email: body.email });
    if (existing) {
      return NextResponse.json({ error: "Email already used" }, { status: 400 });
    }
  
    const shop = await Shop.create(body);
    return NextResponse.json({ success: true });
  } catch (error: any) {
        console.error("REGISTER SHOP ERROR:", error);
    
        if (error instanceof ApiError) {
          return NextResponse.json(
            { error: error.message, code: error.code },
            { status: error.status },
          );
        }
    
        return NextResponse.json(
          {
            error: "Something went wrong. Please try again. If the issue persists, Contact GetBloomDirect Support.",
            code: "SERVER_ERROR",
          },
          { status: 500 },
        );
      }
}