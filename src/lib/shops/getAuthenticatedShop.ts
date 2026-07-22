// lib/shops/getAuthenticatedShop.ts

import Shop from "@/models/Shop";
import { connectToDB } from "@/lib/mongoose";
import { ensureShopOfferingsInitialized } from "@/lib/offerings/ensureDefaultOfferings";

export async function getAuthenticatedShop(sessionUserId: string) {
  await connectToDB();

  const shop = await Shop.findById(sessionUserId);

  if (!shop) return null;

  await ensureShopOfferingsInitialized(shop._id.toString());

  return shop;
}
