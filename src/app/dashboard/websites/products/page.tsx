// src/app/dashboard/websites/products/page.tsx

import { ArrowLeft, FileSpreadsheet, Gift, Package2, Plus, Sparkles } from "lucide-react";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { redirect } from "next/navigation";

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
    .select("_id name category imageUrl isActive soldOut pricingTiers")
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

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <Link
          href={`/dashboard/websites/launch?website=${website._id.toString()}`}
          className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to Launch Setup
        </Link>

        <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600">
              BloomWebsites
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
              Products & Add-ons
            </h1>

            <p className="mt-3 max-w-2xl text-base leading-7 text-gray-600">
              Build the products your customers can purchase and the extras that
              help make every order more special.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard/websites/products/import-export"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-5 py-3 text-sm font-black text-purple-700 transition hover:border-purple-300 hover:bg-purple-100"
            >
              <FileSpreadsheet size={17} />
              Import / Export CSV
            </Link>

            <Link
              href={`/websites/preview/${website.previewSlug}`}
              className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
            >
              Preview Website
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-2">
        {/* PRODUCTS */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                <Package2 size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-950">Products</h2>

                <p className="text-sm text-gray-500">
                  {products.length}{" "}
                  {products.length === 1 ? "product" : "products"}
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/websites/products/new"
              className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-purple-800"
            >
              <Plus size={17} />
              Add Product
            </Link>
          </div>

          {products.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                <Sparkles size={29} />
              </div>

              <h3 className="mt-5 text-xl font-black text-gray-950">
                Add your first product.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                Create the arrangements, plants, gifts, and other products
                customers will be able to purchase from your website.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {products.map((product) => {
                const startingPrice = product.pricingTiers
                  ?.filter((tier) => tier.enabled)
                  .map((tier) => tier.price)
                  .sort((a, b) => a - b)[0];

                return (
                  <div
                    key={product._id.toString()}
                    className="flex items-center gap-4 p-5"
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-purple-50 text-purple-600">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package2 size={24} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-black text-gray-950">
                        {product.name}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {product.category}
                        {typeof startingPrice === "number" &&
                          ` · From $${startingPrice.toFixed(2)}`}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          !product.isActive
                            ? "bg-gray-100 text-gray-600"
                            : product.soldOut
                              ? "bg-amber-100 text-amber-700"
                              : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {!product.isActive
                          ? "Inactive"
                          : product.soldOut
                            ? "Sold Out"
                            : "Active"}
                      </span>

                      <Link
                        href={`/dashboard/websites/products/${product._id.toString()}/edit`}
                        className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ADD-ONS */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-gray-100 p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Gift size={22} />
              </div>

              <div>
                <h2 className="text-lg font-black text-gray-950">Add-ons</h2>

                <p className="text-sm text-gray-500">
                  {addons.length} {addons.length === 1 ? "add-on" : "add-ons"}
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/websites/addons/new"
              className="inline-flex items-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-800"
            >
              <Plus size={17} />
              Add Add-on
            </Link>
          </div>

          {addons.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-green-600">
                <Gift size={29} />
              </div>

              <h3 className="mt-5 text-xl font-black text-gray-950">
                Add something extra.
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
                Teddy bears, balloons, chocolates, premium vases, and other
                extras can increase the value of each order.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {addons.map((addon) => (
                <div
                  key={addon._id.toString()}
                  className="flex items-center gap-4 p-5"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-green-50 text-green-600">
                    {addon.imageUrl ? (
                      <img
                        src={addon.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Gift size={24} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-black text-gray-950">
                      {addon.name}
                    </p>

                    <p className="mt-1 text-sm text-gray-500">
                      {addon.category} · ${addon.price.toFixed(2)}
                      {addon.isUniversal && " · Universal"}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        !addon.isActive
                          ? "bg-gray-100 text-gray-600"
                          : addon.soldOut
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {!addon.isActive
                        ? "Inactive"
                        : addon.soldOut
                          ? "Sold Out"
                          : "Active"}
                    </span>

                    <Link
                      href={`/dashboard/websites/addons/${addon._id.toString()}/edit`}
                      className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-black text-gray-700 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
