import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/mongoose";
import Invite from "@/models/Invite";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  await connectToDB();

  const invite = await Invite.findOne({ token });

  if (!invite) {
    return NextResponse.redirect(
      new URL("/register?error=invalid-invite", request.url)
    );
  }

  return NextResponse.redirect(
    new URL(`/register?invite=${token}`, request.url)
  );
}