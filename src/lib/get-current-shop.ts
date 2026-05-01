// lib/get-current-shop.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Shop from "@/models/Shop";
import { connectToDB } from "@/lib/mongoose";

export async function getCurrentShop() {
  await connectToDB();

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const shop = await Shop.findOne({ _id: session.user.id }).select(
    "+apiAccess.keyHash",
  );

  if (!shop) {
    throw new Error("Shop not found");
  }

  return shop;
}