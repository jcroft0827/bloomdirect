import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import authOptions from "@/lib/auth";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import UpgradeClient from "./UpgradeClient";

export default async function UpgradePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const shop = await getAuthenticatedShop(session.user.id);

  if (!shop || !shop.onboardingComplete) {
    redirect("/dashboard/setup");
  }

  if (shop.isSuspended) {
    redirect("/dashboard");
  }

  return (
    <UpgradeClient
      initialShop={{
        isPro: Boolean(shop.isPro),
        proSince: shop.proSince
          ? shop.proSince.toISOString()
          : null,
        stripeStatus: shop.stripe?.status || null,
        stripePlanId: shop.stripe?.planId || null,
        cancelAtPeriodEnd: Boolean(
          shop.stripe?.cancelAtPeriodEnd,
        ),
      }}
    />
  );
}