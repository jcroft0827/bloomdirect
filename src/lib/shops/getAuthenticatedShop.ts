// lib/shops/getAuthenticatedShop.ts

import Shop from "@/models/Shop";
import { ensureShopOfferingsInitialized } from "../offerings/ensureDefaultOfferings";


export async function getAuthenticatedShop(sessionUserId: string) {
  const shop = await Shop.findById(sessionUserId);

  if (!shop) return null;

  if (shop.onboardingComplete) {
    await ensureShopOfferingsInitialized(shop._id.toString());
  }

  return shop;
}