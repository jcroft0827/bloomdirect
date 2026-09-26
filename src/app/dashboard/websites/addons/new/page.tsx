import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import AddonForm from "@/components/websites/addons/AddonForm";

export default async function NewWebsiteAddonPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const website = await BloomWebsite.exists({
    shop: session.user.id,
  });

  if (!website) {
    redirect("/dashboard/websites");
  }

  return <AddonForm />;
}