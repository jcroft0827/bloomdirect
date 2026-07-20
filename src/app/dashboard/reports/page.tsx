import authOptions from "@/lib/auth";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
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

  if (!shop.isPro) {
    redirect("/dashboard/upgrade");
  }

  return <ReportsClient />;
}