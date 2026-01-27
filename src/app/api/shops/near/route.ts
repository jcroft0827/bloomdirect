import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { ApiError } from "@/lib/api-error";

export async function GET(request: Request) {

  try {
    await connectToDB();
    const { searchParams } = new URL(request.url);
    const zip = searchParams.get("zip");
  
    // For v1 we just return ALL shops – later we’ll add real geo
    const shops = await Shop.find({}).select("shopName address city state phone").limit(20);
  
    return NextResponse.json({ shops });
  } catch (error: any) {
        console.error("FIND NEARBY SHOPS ERROR:", error);
    
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