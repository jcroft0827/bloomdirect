import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { getAuthenticatedShop } from "@/lib/shops/getAuthenticatedShop";
import BloomWebsite from "@/models/BloomWebsite";

import SettingsV2Shell from "./SettingsV2Shell";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const shop = await getAuthenticatedShop(session.user.id);

  if (!shop) {
    redirect("/login");
  }

  const website = await BloomWebsite.findOne({
    shop: shop._id,
  }).lean();

  return (
    <SettingsV2Shell
      initialShop={JSON.parse(JSON.stringify(shop))}
      initialWebsite={website ? JSON.parse(JSON.stringify(website)) : null}
    />
  );
}
