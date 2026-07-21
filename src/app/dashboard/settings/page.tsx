import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";
import { connectToDB } from "@/lib/mongoose";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) redirect("/login");

  await connectToDB();

  // 🟢 NEW — Load shop by the user's ID
  const shop = await getAuthenticatedShop(session.user.id);

  if (!shop) {
    redirect("/login");
  }

  return <SettingsClient initialShop={JSON.parse(JSON.stringify(shop))} />;
}
