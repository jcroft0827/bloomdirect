// api/auth/change-password/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import Shop from "@/models/Shop";

export async function POST(req: Request) {
  await connectToDB();

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { currentPassword, newPassword } = await req.json();

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (newPassword.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const user = await Shop.findOne({ email: session.user.email }).select("+password");
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const isValid = await import("bcryptjs").then(bcrypt => bcrypt.compare(currentPassword, user.password));
  if (!isValid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
  }

  // ⚡ Minimal change: remove bcrypt.hash — pre-save hook will hash it
  user.password = newPassword;
  await user.save();

  return NextResponse.json({ success: true });
}
