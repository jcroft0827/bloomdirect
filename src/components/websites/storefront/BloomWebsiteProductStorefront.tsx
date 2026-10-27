import { ArrowLeft, Flower2 } from "lucide-react";
import Link from "next/link";

import ProductConfigurator from "@/components/websites/storefront/ProductConfigurator";
import ProductDetailsSections from "@/components/websites/storefront/ProductDetailsSections";
import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import WebsitePreviewBar from "@/components/websites/WebsitePreviewBar";
import {
  BloomElegantFooter,
  BloomElegantHeader,
} from "@/components/websites/themes/BloomElegantChrome";
import { getBloomWebsiteHeaderLogoClassName } from "@/lib/bloom-websites/storefront-theme";
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
  const elegant = website.theme === "bloom-elegant";
  const cityState = [shop.address.city, shop.address.state].filter(Boolean).join(", ");
  const fullAddress = [shop.address.street, cityState, shop.address.zip]
    .filter(Boolean)
    .join(" ");

  if (elegant) {
    return (
      <div className="min-h-screen bg-[#fffdf9] pb-28 text-stone-950 sm:pb-20">
        <BloomElegantHeader
          siteName={website.siteName}
          logo={website.storefrontTheme.logo}
          logoSize={website.storefrontTheme.logoSize}
          basePath={basePath}
          primaryColor={primaryColor}
          primaryForeground={primaryForeground}
          aboutEnabled={website.aboutPage?.enabled !== false}
          announcement={{
            isActive: website.announcement.isActive,
            message: website.announcement.message,
          }}
        />

        <main>
          <div className="mx-auto max-w-[1500px] px-5 py-8 sm:px-8 sm:py-12 lg:px-10 lg:py-14">
            <nav
              aria-label="Breadcrumb"
              className="mb-7 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-500 sm:mb-10"
            >
              <Link href={homeHref} className="transition hover:text-stone-900">
                Home
              </Link>
              <span aria-hidden="true">/</span>
              <Link href={shopHref} className="transition hover:text-stone-900">
                Shop
              </Link>
              <span aria-hidden="true">/</span>
              <span className="text-stone-800">{product.name}</span>
            </nav>

            <ProductConfigurator
              product={product}
              primaryColor={primaryColor}
              accentColor={accentColor}
              variant="elegant"
            />

            <ProductDetailsSections product={product} businessName={shop.businessName} elegant primaryColor={primaryColor} />

          </div>
        </main>

        <BloomElegantFooter
          siteName={website.siteName}
          businessName={shop.businessName}
          tagline={website.storefrontTheme.tagline}
          basePath={basePath}
          aboutEnabled={website.aboutPage?.enabled !== false}
          cityState={cityState}
          fullAddress={fullAddress}
          phone={shop.phone}
          email={shop.email}
          showPhone={website.settings.showPhone}
          showAddress={website.settings.showAddress}
          showSocialLinks={website.settings.showSocialLinks}
          socialLinks={shop.socialLinks}
        />

        {showPreviewBar && <WebsitePreviewBar websiteId={website.id} />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-28 text-gray-950 sm:pb-20">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-2.5 sm:px-8 sm:py-3">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            {website.branding.logo ? (
              <img
                src={website.branding.logo}
                alt={website.siteName}
                className={getBloomWebsiteHeaderLogoClassName(website.branding.logoSize, "classic")}
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
            className="mb-7 flex flex-wrap items-center gap-2 text-sm text-gray-500 sm:mb-9"
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

          <ProductDetailsSections product={product} businessName={shop.businessName} primaryColor={primaryColor} />

        </div>
      </main>

      {showPreviewBar && <WebsitePreviewBar websiteId={website.id} />}
    </div>
  );
}
