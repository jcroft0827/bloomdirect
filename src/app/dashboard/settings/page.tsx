import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";
import Shop from "@/models/Shop";
import { connectToDB } from "@/lib/mongoose";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) redirect("/login");

  await connectToDB();

  // 🟢 NEW — Load shop by the user's ID
  const shop = await Shop.findById(session.user.id);

  if (!shop) {
    // If somehow no shop exists, redirect them to shop creation
    redirect("/onboarding");
  }

  return <SettingsClient initialShop={JSON.parse(JSON.stringify(shop))} />;
}
