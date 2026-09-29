import { ArrowLeft, Flower2, ShieldCheck } from "lucide-react";
import Link from "next/link";

import ProductConfigurator from "@/components/websites/storefront/ProductConfigurator";
import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import WebsitePreviewBar from "@/components/websites/WebsitePreviewBar";
import type { BloomWebsiteStorefrontProductPage } from "@/types/bloom-website";

type BloomWebsiteProductStorefrontProps = {
  storefront: BloomWebsiteStorefrontProductPage;
  basePath: string;
  showPreviewBar?: boolean;
};

export default function BloomWebsiteProductStorefront({
  storefront,
  basePath,
  showPreviewBar = false,
}: BloomWebsiteProductStorefrontProps) {
  const { website, shop, product } = storefront;
  const { primaryColor, accentColor, primaryForeground } =
    website.storefrontTheme;

  const homeHref = basePath || "/";
  const shopHref = `${basePath}/shop`;

  return (
    <div className="min-h-screen bg-white pb-28 text-gray-950 sm:pb-20">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-2.5 sm:px-8 sm:py-3">
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
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: primaryColor,
                    color: primaryForeground,
                  }}
                >
                  <Flower2 size={20} />
                </div>

                <span className="truncate text-lg font-black text-gray-950">
                  {website.siteName}
                </span>
              </>
            )}
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href={shopHref}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Keep Shopping</span>
              <span className="sm:hidden">Back</span>
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
        <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
          <nav
            aria-label="Breadcrumb"
            className="mb-7 flex flex-wrap items-center gap-2 text-sm text-gray-500"
          >
            <Link
              href={homeHref}
              className="font-semibold transition hover:text-gray-900"
            >
              Home
            </Link>

            <span aria-hidden="true">/</span>
            <span className="font-semibold">{product.category}</span>
            <span aria-hidden="true">/</span>
            <span className="text-gray-900">{product.name}</span>
          </nav>

          <ProductConfigurator
            product={product}
            primaryColor={primaryColor}
            accentColor={accentColor}
          />

          {product.description && (
            <section className="mx-auto mt-16 max-w-4xl border-t border-gray-100 pt-10 sm:mt-20">
              <p
                className="text-sm font-black uppercase tracking-[0.18em]"
                style={{ color: primaryColor }}
              >
                About this arrangement
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                Designed for the moment.
              </h2>

              <p className="mt-5 whitespace-pre-line text-base leading-8 text-gray-600">
                {product.description}
              </p>
            </section>
          )}

          <section className="mx-auto mt-12 grid max-w-4xl gap-3 border-t border-gray-100 pt-10 sm:grid-cols-2">
            <div className="flex gap-3 rounded-2xl bg-gray-50 p-5">
              <Flower2
                size={21}
                className="mt-0.5 shrink-0"
                style={{ color: primaryColor }}
              />

              <div>
                <p className="text-sm font-black text-gray-950">
                  Designed locally
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Hand-designed by {shop.businessName}, not shipped from a
                  warehouse.
                </p>
              </div>
            </div>

            <div className="flex gap-3 rounded-2xl bg-gray-50 p-5">
              <ShieldCheck
                size={21}
                className="mt-0.5 shrink-0"
                style={{ color: accentColor }}
              />

              <div>
                <p className="text-sm font-black text-gray-950">
                  Local florist delivery
                </p>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  Prepared and delivered by a real local flower shop.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {showPreviewBar && <WebsitePreviewBar websiteId={website.id} />}
    </div>
  );
}
