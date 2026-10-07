// src/app/dashboard/websites/products/new/page.tsx

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import ProductForm from "@/components/websites/products/ProductForm";

export default async function NewWebsiteProductPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const website = await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id settings.arrangementContainerNote")
    .lean<{
      _id: unknown;
      settings?: {
        arrangementContainerNote?: string;
      };
    } | null>();

  if (!website) {
    redirect("/dashboard/websites");
  }

  const websiteSettings = website.settings;

  return (
    <ProductForm
      defaultArrangementContainerNote={
        websiteSettings?.arrangementContainerNote ?? ""
      }
    />
  );
}
