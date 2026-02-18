import { NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params; // ✅ THIS IS THE FIX

  await connectToDB();

  const event = await EmailEvent.findById(id);

  if (!event) {
    return NextResponse.json(
      { error: "Email event not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(event);
}
