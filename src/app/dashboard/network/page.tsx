// src/app/dashboard/network/page.tsx

import Providers from "@/components/Providers";
import authOptions from "@/lib/auth";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import NetworkClient from "./NetworkClient";

export default async function NetworkPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const shop = await getAuthenticatedShop(session.user.id);

  if (!shop) {
    redirect("/login");
  }

  if (shop.isSuspended) {
    redirect("/dashboard");
  }

  return (
    <Providers>
      <NetworkClient />
    </Providers>
  );
}