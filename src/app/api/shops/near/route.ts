import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function GET(request: Request) {
  await connectToDB();
  const { searchParams } = new URL(request.url);
  const zip = searchParams.get("zip");

  // For v1 we just return ALL shops – later we’ll add real geo
  const shops = await Shop.find({}).select("shopName address city state phone").limit(20);

  return NextResponse.json({ shops });
}