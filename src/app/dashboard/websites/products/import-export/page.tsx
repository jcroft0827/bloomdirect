import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import ProductCatalogCsvManager from "@/components/websites/products/ProductCatalogCsvManager";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";

export default async function ProductCatalogImportExportPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id siteName")
    .lean()) as { _id: { toString(): string }; siteName?: string } | null;

  if (!website) {
    redirect("/dashboard/websites");
  }

  return (
    <div className="mx-auto max-w-6xl space-y-7">
      <div>
        <Link
          href="/dashboard/websites/products"
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to Products & Add-ons
        </Link>

        <p className="mt-5 text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
          BloomWebsites
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
          Import or export your catalog
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-gray-600">
          Move product data into Bloom from another website provider without
          retyping your catalog, or download your Bloom catalog whenever you
          need a portable copy.
        </p>
      </div>

      <ProductCatalogCsvManager siteName={website.siteName || "BloomWebsite"} />
    </div>
  );
}
