import mongoose from "mongoose";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { EmailEvent } from "@/models/EmailEvent";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json({ error: "Email event not found" }, { status: 404 });
  }

  await connectToDB();

  const event = await EmailEvent.findOne({
    _id: id,
    shopId: session.user.id,
  }).lean<any>();

  if (!event) {
    return NextResponse.json({ error: "Email event not found" }, { status: 404 });
  }

  return NextResponse.json({
    _id: String(event._id),
    type: event.type,
    to: event.to,
    subject: event.subject,
    status: event.status,
    error: event.error || undefined,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  });
}
