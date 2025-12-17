import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function POST(req: Request) {
  await connectToDB();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newEmail, password } = await req.json();

  if (!newEmail || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const user = await Shop.findOne({ email: session.user.email }).select("+password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return NextResponse.json({ error: "Password incorrect" }, { status: 401 });
  }

  const exists = await Shop.findOne({ email: newEmail });
  if (exists) {
    return NextResponse.json(
      { error: "Email already in use" },
      { status: 409 }
    );
  }

  user.email = newEmail.toLowerCase();
  await user.save();

  return NextResponse.json({
    success: true,
    requireReauth: true,
  });
}
