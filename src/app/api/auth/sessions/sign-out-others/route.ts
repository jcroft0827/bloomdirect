import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import ShopSession from "@/models/ShopSession";
import Shop from "@/models/Shop";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getServerSession(authOptions);

  if (
    !session?.user?.id ||
    !session.user.sessionId ||
    session.user.sessionRevoked
  ) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  await connectToDB();

  const now = new Date();

  await Shop.updateOne(
    { _id: session.user.id },
    { $set: { sessionsValidAfter: now } },
  );

  const result = await ShopSession.deleteMany({
    shopId: session.user.id,
    sessionId: { $ne: session.user.sessionId },
  });

  return NextResponse.json({
    success: true,
    signedOutSessions: result.deletedCount ?? 0,
  });
}
