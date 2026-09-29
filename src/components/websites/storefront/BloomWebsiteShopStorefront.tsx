import { ArrowLeft, Flower2 } from "lucide-react";
import Link from "next/link";

import BloomWebsiteCatalogBrowser from "@/components/websites/storefront/BloomWebsiteCatalogBrowser";
import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import WebsitePreviewBar from "@/components/websites/WebsitePreviewBar";
import type { BloomWebsiteStorefrontCatalog } from "@/lib/bloom-websites/getBloomWebsiteStorefrontCatalog";
import { getStorefrontContrastText } from "@/lib/bloom-websites/storefront-theme";

type SearchParams = {
  q?: string | string[];
  occasion?: string | string[];
  category?: string | string[];
  sort?: string | string[];
};

type BloomWebsiteShopStorefrontProps = {
  catalog: BloomWebsiteStorefrontCatalog;
  basePath: string;
  searchParams?: SearchParams;
  showPreviewBar?: boolean;
};

function getSearchParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export default function BloomWebsiteShopStorefront({
  catalog,
  basePath,
  searchParams = {},
  showPreviewBar = false,
}: BloomWebsiteShopStorefrontProps) {
  const { website, shop, products } = catalog;

  const primaryColor = website.branding.primaryColor || "#654783";
  const accentColor = website.branding.accentColor || "#37a156";
  const primaryForeground = getStorefrontContrastText(primaryColor);
  const accentForeground = getStorefrontContrastText(accentColor);
  const homeHref = basePath || "/";

  return (
    <div className="min-h-screen bg-[#fafafa] pb-28 text-gray-950 sm:pb-20">
      <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-8 sm:py-3">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            {website.branding.logo ? (
              <img
                src={website.branding.logo}
                alt={website.siteName}
                className="h-14 w-auto max-w-[220px] object-contain object-left sm:h-16 sm:max-w-[260px] lg:h-20 lg:max-w-[320px]"
              />
            ) : (
              <>
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Flower2 size={20} />
                </div>

                <span className="truncate text-base font-black tracking-tight text-gray-950 sm:text-lg">
                  {website.siteName}
                </span>
              </>
            )}
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={homeHref}
              className="hidden items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50 sm:inline-flex"
            >
              <ArrowLeft size={16} />
              Home
            </Link>

            <StorefrontCartButton
              primaryColor={primaryColor}
              primaryForeground={primaryForeground}
              compact
            />
          </div>
        </div>
      </header>

      <main>
        <section className="border-b border-gray-100 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14 lg:py-16">
            <div className="max-w-3xl">
              <div
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] sm:text-sm"
                style={{ color: primaryColor }}
              >
                <Flower2 size={17} />
                Shop Flowers
              </div>

              <h1 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                Flowers for every moment.
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base sm:leading-7">
                Browse fresh arrangements designed by{" "}
                <span className="font-bold text-gray-800">
                  {shop.businessName}
                </span>
                . Choose your favorite, customize it, and we&apos;ll take care
                of the rest.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-3 py-8 sm:px-8 sm:py-12 lg:py-14">
          {products.length > 0 ? (
            <BloomWebsiteCatalogBrowser
              products={products}
              basePath={basePath}
              primaryColor={primaryColor}
              accentColor={accentColor}
              primaryForeground={primaryForeground}
              accentForeground={accentForeground}
              initialFilters={{
                query: getSearchParam(searchParams.q),
                occasion: getSearchParam(searchParams.occasion),
                category: getSearchParam(searchParams.category),
                sort: getSearchParam(searchParams.sort),
              }}
            />
          ) : (
            <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center shadow-sm sm:px-10 sm:py-20">
              <div
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${primaryColor}12`,
                  color: primaryColor,
                }}
              >
                <Flower2 size={30} />
              </div>

              <h2 className="mt-5 text-xl font-black text-gray-950 sm:text-2xl">
                Fresh flowers are coming soon.
              </h2>

              <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
                {shop.businessName} hasn&apos;t added products to this
                collection yet.
              </p>

              <Link
                href={homeHref}
                className="mt-7 inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black text-white"
                style={{ backgroundColor: primaryColor }}
              >
                <ArrowLeft size={16} />
                Return Home
              </Link>
            </div>
          )}
        </section>

        {products.length > 0 && (
          <section className="border-t border-gray-100 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-12">
              <div className="mx-auto max-w-2xl text-center">
                <Flower2
                  size={25}
                  className="mx-auto"
                  style={{ color: accentColor }}
                />

                <h2 className="mt-3 text-xl font-black tracking-tight text-gray-950 sm:text-2xl">
                  Designed by your local florist.
                </h2>

                <p className="mt-3 text-sm leading-6 text-gray-500 sm:text-base">
                  Every arrangement is prepared by {shop.businessName} and
                  delivered locally with care.
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {showPreviewBar && <WebsitePreviewBar websiteId={website.id} />}
    </div>
  );
}
