// src/app/dashboard/websites/products/page.tsx

import { ArrowLeft, FileSpreadsheet } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

import CatalogManagementClient, {
  type CatalogAddonItem,
  type CatalogProductItem,
} from "@/components/websites/products/CatalogManagementClient";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

type BloomWebsiteLean = {
  _id: {
    toString(): string;
  };
  previewSlug: string;
  siteName: string;
};

type ProductLean = {
  _id: {
    toString(): string;
  };
  sku?: string;
  name: string;
  category: string;
  imageUrl?: string;
  isActive: boolean;
  soldOut: boolean;
  pricingTiers?: Array<{
    label: "standard" | "deluxe" | "premium";
    price: number;
    enabled: boolean;
  }>;
};

type AddonLean = {
  _id: {
    toString(): string;
  };
  name: string;
  category: string;
  imageUrl?: string;
  price: number;
  isActive: boolean;
  soldOut: boolean;
  isUniversal: boolean;
};

export default async function WebsiteProductsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id previewSlug siteName")
    .lean()) as BloomWebsiteLean | null;

  if (!website) {
    redirect("/dashboard/websites");
  }

  const products = (await BloomWebsiteProduct.find({
    website: website._id,
    shop: session.user.id,
  })
    .select("_id sku name category imageUrl isActive soldOut pricingTiers")
    .sort({
      sortOrder: 1,
      createdAt: -1,
    })
    .lean()) as unknown as ProductLean[];

  const addons = (await BloomWebsiteAddon.find({
    website: website._id,
    shop: session.user.id,
  })
    .select("_id name category imageUrl price isActive soldOut isUniversal")
    .sort({
      sortOrder: 1,
      createdAt: -1,
    })
    .lean()) as unknown as AddonLean[];

  const productItems: CatalogProductItem[] = products.map((product) => {
    const startingPrice = product.pricingTiers
      ?.filter((tier) => tier.enabled)
      .map((tier) => tier.price)
      .sort((a, b) => a - b)[0];

    return {
      id: product._id.toString(),
      name: product.name,
      sku: product.sku ?? "",
      category: product.category,
      imageUrl: product.imageUrl ?? "",
      isActive: product.isActive,
      soldOut: product.soldOut,
      startingPrice: typeof startingPrice === "number" ? startingPrice : null,
    };
  });

  const addonItems: CatalogAddonItem[] = addons.map((addon) => ({
    id: addon._id.toString(),
    name: addon.name,
    category: addon.category,
    imageUrl: addon.imageUrl ?? "",
    price: addon.price,
    isActive: addon.isActive,
    soldOut: addon.soldOut,
    isUniversal: addon.isUniversal,
  }));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <Link
          href={`/dashboard/websites/launch?website=${website._id.toString()}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to Launch Setup
        </Link>

        <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
              BloomWebsites
            </p>

            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Products & Add-ons
            </h1>

            <p className="mt-2 max-w-2xl text-base leading-7 text-gray-600">
              Search, filter, and manage the products and extras customers can purchase from your website.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/websites/products/import-export"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-700 transition hover:border-purple-300 hover:bg-purple-100"
            >
              <FileSpreadsheet size={17} />
              Import / Export CSV
            </Link>

            <Link
              href={`/websites/preview/${website.previewSlug}`}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              Preview Website
            </Link>
          </div>
        </div>
      </div>

      <CatalogManagementClient products={productItems} addons={addonItems} />
    </div>
  );
}
