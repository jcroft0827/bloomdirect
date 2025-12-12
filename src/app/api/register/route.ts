import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectToDB();
  const body = await req.json();

  const existing = await Shop.findOne({ email: body.email });
  if (existing) {
    return NextResponse.json({ error: "Email already used" }, { status: 400 });
  }

  const shop = await Shop.create(body);
  return NextResponse.json({ success: true });
}