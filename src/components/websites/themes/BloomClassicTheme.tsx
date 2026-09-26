// src/components/websites/themes/BloomClassicTheme.tsx

import {
  Clock3,
  Facebook,
  Flower2,
  Heart,
  Instagram,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import BloomWebsiteStorefrontProductCard, {
  type BloomWebsiteStorefrontProductCardProduct,
} from "@/components/websites/storefront/BloomWebsiteStorefrontProductCard";

import Link from "next/link";
import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import type { BloomWebsiteStorefront } from "@/types/bloom-website";

type BloomClassicThemeProps = {
  storefront: BloomWebsiteStorefront;
  basePath?: string;
};

function formatCutoff(value: string) {
  const [hourString, minuteString] = value.split(":");

  const hour = Number(hourString);

  const minute = Number(minuteString || "0");

  if (Number.isNaN(hour)) {
    return value;
  }

  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
}

function toFilterSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BloomClassicTheme({
  storefront,
  basePath,
}: BloomClassicThemeProps) {
  const { website, shop, products } = storefront;

  const storefrontBasePath =
    basePath ?? `/websites/preview/${website.previewSlug}`;
  const storefrontHomeHref = storefrontBasePath || "/";

  const homepageOccasions = Array.from(
    new Map(
      products
        .flatMap((product) => product.occasions)
        .map((occasion) => occasion.trim())
        .filter(Boolean)
        .map((occasion) => [toFilterSlug(occasion), occasion]),
    ).values(),
  ).slice(0, 4);

  const {
    primaryColor,
    accentColor,

    primaryForeground,
    accentForeground,
  } = website.storefrontTheme;

  const showPhone = website.settings.showPhone;

  const showAddress = website.settings.showAddress;

  const showSocialLinks = website.settings.showSocialLinks;

  const hasAddress = Boolean(
    shop.address.street ||
    shop.address.city ||
    shop.address.state ||
    shop.address.zip,
  );

  const cityState = [shop.address.city, shop.address.state]
    .filter(Boolean)
    .join(", ");

  const fullAddress = [shop.address.street, cityState, shop.address.zip]
    .filter(Boolean)
    .join(" ");

  /*
   * Homepage merchandising should use real florist products.
   *
   * No fake arrangements are shown anymore. This keeps the
   * preview truthful and gives us the correct foundation for
   * the upcoming homepage redesign.
   */
  const storefrontProducts = products.slice(0, 6);

  const homepageProductCards: BloomWebsiteStorefrontProductCardProduct[] =
    storefrontProducts.map((product) => {
      const enabledPrices = product.pricingTiers
        .filter((tier) => tier.enabled)
        .map((tier) => tier.price);

      const startingPrice =
        enabledPrices.length > 0 ? Math.min(...enabledPrices) : null;

      return {
        name: product.name,
        slug: product.slug,
        description: product.description,
        shortDescription: product.shortDescription,
        category: product.category,
        imageUrl: product.imageUrl,
        startingPrice,
        isFeatured: product.isFeatured,

        availabilityState: product.soldOut
          ? "sold_out"
          : startingPrice === null
            ? "unavailable"
            : "available",
      };
    });

  return (
    <div className="min-h-screen bg-white text-gray-950">
      {/* ANNOUNCEMENT */}
      {website.announcement.isActive && (
        <div
          className="px-4 py-2.5 text-center text-xs font-bold sm:text-sm"
          style={{
            backgroundColor: primaryColor,

            color: primaryForeground,
          }}
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
            <Sparkles size={15} className="shrink-0" />

            <span>{website.announcement.message}</span>
          </div>
        </div>
      )}

      {/* HEADER */}
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href={storefrontHomeHref}
            className="flex min-w-0 items-center gap-3"
          >
            {website.storefrontTheme.logo ? (
              <img
                src={website.storefrontTheme.logo}
                alt={`${website.siteName} logo`}
                className="h-12 w-auto max-w-[180px] object-contain object-left sm:h-14 sm:max-w-[220px]"
              />
            ) : (
              <>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full sm:h-12 sm:w-12"
                  style={{
                    backgroundColor: primaryColor,

                    color: primaryForeground,
                  }}
                >
                  <Flower2 size={23} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-lg font-black tracking-tight sm:text-xl">
                    {website.siteName}
                  </p>

                  {showAddress && cityState && (
                    <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-gray-400">
                      {cityState}
                    </p>
                  )}
                </div>
              </>
            )}
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-7 text-sm font-bold text-gray-700 lg:flex">
              <Link
                href={`${storefrontBasePath}/shop`}
                className="transition hover:opacity-60"
              >
                Shop
              </Link>

              <a href="#about" className="transition hover:opacity-60">
                About
              </a>

              <a href="#delivery" className="transition hover:opacity-60">
                Delivery
              </a>

              <a href="#contact" className="transition hover:opacity-60">
                Contact
              </a>
            </nav>

            <Link
              href={`${storefrontBasePath}/shop`}
              className="hidden rounded-full border border-gray-200 bg-white px-4 py-2.5 text-xs font-black text-gray-800 transition hover:bg-gray-50 sm:inline-flex lg:hidden"
            >
              Shop
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
        {/* HERO */}
        <section
          className={`relative overflow-hidden ${
            website.homepage.heroImage ? "bg-gray-950" : "bg-[#f8f6f3]"
          }`}
        >
          {website.homepage.heroImage ? (
            <>
              <img
                src={website.homepage.heroImage}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />

              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            </>
          ) : (
            <>
              <div
                className="absolute -right-24 -top-32 h-[28rem] w-[28rem] rounded-full opacity-[0.09] blur-3xl"
                style={{
                  backgroundColor: primaryColor,
                }}
              />

              <div
                className="absolute -bottom-40 left-[15%] h-[30rem] w-[30rem] rounded-full opacity-[0.08] blur-3xl"
                style={{
                  backgroundColor: accentColor,
                }}
              />
            </>
          )}

          <div className="relative mx-auto grid min-h-[600px] max-w-7xl items-center gap-12 px-5 py-16 sm:min-h-[650px] sm:px-8 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black sm:text-sm"
                  style={{
                    backgroundColor: accentColor,

                    color: accentForeground,
                  }}
                >
                  <Flower2 size={16} />
                  Local florist
                </div>

                {website.orderPolicy.allowsSameDay && (
                  <div
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black sm:text-sm ${
                      website.homepage.heroImage
                        ? "border-white/25 bg-white/10 text-white backdrop-blur"
                        : "border-gray-200 bg-white text-gray-700"
                    }`}
                  >
                    <Clock3 size={15} />
                    Same-day until{" "}
                    {formatCutoff(website.orderPolicy.sameDayCutoff)}
                  </div>
                )}
              </div>

              <h1
                className={`mt-7 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.035em] sm:text-5xl lg:text-6xl xl:text-7xl ${
                  website.homepage.heroImage ? "text-white" : "text-gray-950"
                }`}
              >
                {website.homepage.heroHeadline}
              </h1>

              <p
                className={`mt-6 max-w-2xl text-base leading-7 sm:text-lg sm:leading-8 ${
                  website.homepage.heroImage ? "text-white/85" : "text-gray-600"
                }`}
              >
                {website.homepage.heroSubheadline}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href={`${storefrontBasePath}/shop`}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-7 py-3.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
                  style={{
                    backgroundColor: primaryColor,

                    color: primaryForeground,
                  }}
                >
                  Shop Flowers
                  <ShoppingBag size={17} />
                </Link>

                {showPhone && shop.phone && (
                  <a
                    href={`tel:${shop.phone}`}
                    className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border px-7 py-3.5 text-sm font-black transition ${
                      website.homepage.heroImage
                        ? "border-white/35 bg-white/10 text-white backdrop-blur hover:bg-white/15"
                        : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <Phone size={17} />
                    Call the Florist
                  </a>
                )}
              </div>

              <div
                className={`mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-bold sm:text-sm ${
                  website.homepage.heroImage ? "text-white/75" : "text-gray-500"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles size={16} />
                  Designed locally
                </span>

                <span className="inline-flex items-center gap-2">
                  <Truck size={16} />
                  Hand delivered
                </span>

                {showAddress && cityState && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} />

                    {cityState}
                  </span>
                )}
              </div>
            </div>

            {!website.homepage.heroImage && (
              <div className="hidden lg:block">
                <div className="relative mx-auto max-w-md">
                  <div
                    className="absolute -inset-5 rounded-[3rem] opacity-[0.10] blur-2xl"
                    style={{
                      backgroundColor: primaryColor,
                    }}
                  />

                  <div className="relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white p-9 shadow-xl shadow-gray-900/5">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: primaryColor,

                        color: primaryForeground,
                      }}
                    >
                      <Flower2 size={31} />
                    </div>

                    <p
                      className="mt-8 text-xs font-black uppercase tracking-[0.18em]"
                      style={{
                        color: accentColor,
                      }}
                    >
                      Your neighborhood florist
                    </p>

                    <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950">
                      {shop.businessName}
                    </h2>

                    <p className="mt-4 text-sm leading-7 text-gray-600">
                      Fresh flowers, personal service, and thoughtful designs
                      created right here in your community.
                    </p>

                    <div className="mt-8 space-y-4 border-t border-gray-100 pt-7">
                      {showAddress && cityState && (
                        <div className="flex items-start gap-3">
                          <MapPin
                            size={19}
                            className="mt-0.5 shrink-0"
                            style={{
                              color: accentColor,
                            }}
                          />

                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                              Serving
                            </p>

                            <p className="mt-1 font-bold text-gray-800">
                              {cityState}
                            </p>
                          </div>
                        </div>
                      )}

                      {website.orderPolicy.allowsSameDay && (
                        <div className="flex items-start gap-3">
                          <Clock3
                            size={19}
                            className="mt-0.5 shrink-0"
                            style={{
                              color: accentColor,
                            }}
                          />

                          <div>
                            <p className="text-xs font-black uppercase tracking-wide text-gray-400">
                              Same-day delivery
                            </p>

                            <p className="mt-1 font-bold text-gray-800">
                              Order by{" "}
                              {formatCutoff(website.orderPolicy.sameDayCutoff)}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SHOP BY OCCASION */}
        {homepageOccasions.length > 0 && (
          <section className="bg-[#faf9f7] px-5 py-16 sm:px-8 sm:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mx-auto max-w-2xl text-center">
                <p
                  className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm"
                  style={{
                    color: accentColor,
                  }}
                >
                  Find the right flowers
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                  Shop by Occasion
                </h2>

                <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                  Thoughtful flowers for life&apos;s celebrations, milestones,
                  and meaningful moments.
                </p>
              </div>

              <div
                className={`mt-10 grid gap-4 ${
                  homepageOccasions.length === 1
                    ? "grid-cols-1"
                    : homepageOccasions.length === 2
                      ? "grid-cols-2"
                      : homepageOccasions.length === 3
                        ? "grid-cols-2 sm:grid-cols-3"
                        : "grid-cols-2 lg:grid-cols-4"
                }`}
              >
                {homepageOccasions.map((occasion, index) => (
                  <Link
                    key={toFilterSlug(occasion)}
                    href={`${storefrontBasePath}/shop?occasion=${encodeURIComponent(
                      toFilterSlug(occasion),
                    )}`}
                    className="group relative min-h-40 overflow-hidden rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg sm:min-h-48 sm:p-6"
                  >
                    <div
                      className="absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-[0.08] transition duration-300 group-hover:scale-125"
                      style={{
                        backgroundColor:
                          index % 2 === 0 ? primaryColor : accentColor,
                      }}
                    />

                    <div className="relative flex h-full flex-col justify-between">
                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-2xl sm:h-12 sm:w-12"
                        style={{
                          backgroundColor:
                            index % 2 === 0 ? primaryColor : accentColor,

                          color:
                            index % 2 === 0
                              ? primaryForeground
                              : accentForeground,
                        }}
                      >
                        <Flower2 size={22} />
                      </div>

                      <div className="mt-8">
                        <h3 className="text-lg font-black tracking-tight text-gray-950 sm:text-xl">
                          {occasion}
                        </h3>

                        <p className="mt-2 text-xs font-bold text-gray-500 sm:text-sm">
                          Shop collection →
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Link
                  href={`${storefrontBasePath}/shop`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-black text-gray-800 transition hover:bg-gray-50"
                >
                  Browse All Flowers
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* FEATURED FLOWERS */}
        <section id="shop" className="bg-white px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div className="max-w-2xl">
                <p
                  className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm"
                  style={{
                    color: accentColor,
                  }}
                >
                  Fresh from our shop
                </p>

                <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                  Featured Flowers
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
                  Hand-designed arrangements created locally and delivered with
                  care.
                </p>
              </div>

              {homepageProductCards.length > 0 && (
                <Link
                  href={`${storefrontBasePath}/shop`}
                  className="hidden shrink-0 rounded-full border border-gray-300 bg-white px-5 py-3 text-sm font-black text-gray-800 transition hover:bg-gray-50 sm:inline-flex"
                >
                  View All Flowers
                </Link>
              )}
            </div>

            {homepageProductCards.length > 0 ? (
              <>
                <div className="mt-10 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-3">
                  {homepageProductCards.map((product) => (
                    <BloomWebsiteStorefrontProductCard
                      key={product.slug}
                      product={product}
                      basePath={storefrontBasePath}
                      primaryColor={primaryColor}
                      accentColor={accentColor}
                      primaryForeground={primaryForeground}
                    />
                  ))}
                </div>

                <div className="mt-8 text-center sm:hidden">
                  <Link
                    href={`${storefrontBasePath}/shop`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-black text-gray-800 transition hover:bg-gray-50"
                  >
                    View All Flowers
                  </Link>
                </div>
              </>
            ) : (
              <div className="mt-10 rounded-3xl border border-dashed border-gray-300 bg-gray-50 px-6 py-14 text-center">
                <div
                  className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: primaryColor,

                    color: primaryForeground,
                  }}
                >
                  <Flower2 size={27} />
                </div>

                <h3 className="mt-5 text-xl font-black text-gray-950">
                  Fresh designs coming soon
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  Our florist is preparing the collection. Please check back
                  soon.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* ABOUT + LOCAL TRUST */}
        <section
          id="about"
          className="overflow-hidden bg-[#f8f6f3] px-5 py-16 sm:px-8 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
              {/* STORY */}
              <div>
                <p
                  className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm"
                  style={{
                    color: accentColor,
                  }}
                >
                  Meet your local florist
                </p>

                <h2 className="mt-3 max-w-2xl text-3xl font-black tracking-tight text-gray-950 sm:text-4xl lg:text-5xl">
                  Flowers mean more when they&apos;re personal.
                </h2>

                <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-8 text-gray-600">
                  {website.homepage.aboutText ||
                    `${shop.businessName} is proud to serve ${
                      showAddress && cityState
                        ? cityState
                        : "our local community"
                    } with fresh flowers, thoughtful designs, and personal service for life's meaningful moments.`}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {showAddress && cityState && (
                    <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm">
                      <MapPin
                        size={16}
                        style={{
                          color: accentColor,
                        }}
                      />
                      Local to {cityState}
                    </div>
                  )}

                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm">
                    <Flower2
                      size={16}
                      style={{
                        color: accentColor,
                      }}
                    />
                    Florist designed
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm">
                    <Truck
                      size={16}
                      style={{
                        color: accentColor,
                      }}
                    />
                    Hand delivered
                  </div>
                </div>

                <div className="mt-9">
                  <Link
                    href={`${storefrontBasePath}/shop`}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:opacity-95"
                    style={{
                      backgroundColor: primaryColor,
                      color: primaryForeground,
                    }}
                  >
                    Shop Our Flowers
                    <ShoppingBag size={17} />
                  </Link>
                </div>
              </div>

              {/* TRUST CARD */}
              <div className="relative">
                <div
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-[0.08] blur-3xl"
                  style={{
                    backgroundColor: accentColor,
                  }}
                />

                <div className="relative overflow-hidden rounded-[2rem] border border-gray-200 bg-white p-6 shadow-xl shadow-gray-900/5 sm:p-8">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p
                        className="text-xs font-black uppercase tracking-[0.18em]"
                        style={{
                          color: accentColor,
                        }}
                      >
                        Why shop local?
                      </p>

                      <h3 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                        Real flowers. Real people.
                      </h3>
                    </div>

                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                      style={{
                        backgroundColor: primaryColor,
                        color: primaryForeground,
                      }}
                    >
                      <Heart size={23} />
                    </div>
                  </div>

                  <div className="mt-8 divide-y divide-gray-100">
                    <div className="flex gap-4 py-5 first:pt-0">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${accentColor}14`,
                          color: accentColor,
                        }}
                      >
                        <Flower2 size={19} />
                      </div>

                      <div>
                        <p className="font-black text-gray-950">
                          Designed by a local florist
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Your arrangement is created by the florist serving
                          your community.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 py-5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${accentColor}14`,
                          color: accentColor,
                        }}
                      >
                        <Sparkles size={19} />
                      </div>

                      <div>
                        <p className="font-black text-gray-950">
                          Thoughtfully prepared
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Each order is prepared with care for the person and
                          moment you&apos;re celebrating.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 py-5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${accentColor}14`,
                          color: accentColor,
                        }}
                      >
                        <Truck size={19} />
                      </div>

                      <div>
                        <p className="font-black text-gray-950">
                          Delivered locally
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Your flowers stay local from the design table through
                          delivery.
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4 py-5 last:pb-0">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${accentColor}14`,
                          color: accentColor,
                        }}
                      >
                        <ShieldCheck size={19} />
                      </div>

                      <div>
                        <p className="font-black text-gray-950">
                          Personal service
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Questions about your order? You&apos;re working with a
                          real local flower shop.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* LOCAL DELIVERY */}
        <section
          id="delivery"
          className="bg-white px-5 py-16 sm:px-8 sm:py-20 lg:py-24"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid overflow-hidden rounded-[2rem] border border-gray-200 bg-gray-950 shadow-xl shadow-gray-900/5 lg:grid-cols-[0.9fr_1.1fr]">
              {/* DELIVERY SUMMARY */}
              <div
                className="relative overflow-hidden p-7 sm:p-10 lg:p-12"
                style={{
                  backgroundColor: primaryColor,
                  color: primaryForeground,
                }}
              >
                <div
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-10"
                  style={{
                    backgroundColor: primaryForeground,
                  }}
                />

                <div className="relative">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: primaryForeground,
                      color: primaryColor,
                    }}
                  >
                    <Truck size={27} />
                  </div>

                  <p className="mt-8 text-xs font-black uppercase tracking-[0.2em] opacity-70 sm:text-sm">
                    Local delivery
                  </p>

                  <h2 className="mt-3 max-w-xl text-3xl font-black tracking-tight sm:text-4xl">
                    From our flower shop to their door.
                  </h2>

                  <p className="mt-5 max-w-xl text-sm leading-7 opacity-80 sm:text-base">
                    Order online from {shop.businessName} and send flowers
                    locally with delivery handled right here in the community.
                  </p>

                  <div className="mt-8">
                    <Link
                      href={`${storefrontBasePath}/shop`}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-black shadow-sm transition hover:opacity-90"
                      style={{
                        backgroundColor: primaryForeground,
                        color: primaryColor,
                      }}
                    >
                      Shop for Delivery
                      <ShoppingBag size={17} />
                    </Link>
                  </div>
                </div>
              </div>

              {/* DELIVERY DETAILS */}
              <div className="bg-[#faf9f7] p-7 sm:p-10 lg:p-12">
                <p
                  className="text-xs font-black uppercase tracking-[0.18em] sm:text-sm"
                  style={{
                    color: accentColor,
                  }}
                >
                  Sending flowers locally
                </p>

                <h3 className="mt-3 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                  A simple way to brighten their day.
                </h3>

                <div className="mt-8 space-y-5">
                  {showAddress && cityState && (
                    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${accentColor}14`,
                          color: accentColor,
                        }}
                      >
                        <MapPin size={19} />
                      </div>

                      <div>
                        <p className="font-black text-gray-950">
                          Locally based
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Proudly serving customers from {cityState} and the
                          surrounding delivery area.
                        </p>
                      </div>
                    </div>
                  )}

                  {website.orderPolicy.allowsSameDay && (
                    <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                        style={{
                          backgroundColor: `${accentColor}14`,
                          color: accentColor,
                        }}
                      >
                        <Clock3 size={19} />
                      </div>

                      <div>
                        <p className="font-black text-gray-950">
                          Same-day delivery available
                        </p>

                        <p className="mt-1 text-sm leading-6 text-gray-500">
                          Order by{" "}
                          <span className="font-bold text-gray-700">
                            {formatCutoff(website.orderPolicy.sameDayCutoff)}
                          </span>{" "}
                          for eligible same-day orders.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-5">
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{
                        backgroundColor: `${accentColor}14`,
                        color: accentColor,
                      }}
                    >
                      <Flower2 size={19} />
                    </div>

                    <div>
                      <p className="font-black text-gray-950">
                        Designed before delivery
                      </p>

                      <p className="mt-1 text-sm leading-6 text-gray-500">
                        Your arrangement is prepared by the florist before it
                        heads out for local delivery.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="border-t border-gray-100 bg-[#faf9f7] px-5 py-16 sm:px-8 sm:py-20"
        >
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <p
                className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm"
                style={{
                  color: accentColor,
                }}
              >
                We&apos;re here to help
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
                Get in touch with {shop.businessName}.
              </h2>

              <p className="mt-4 text-sm leading-7 text-gray-600 sm:text-base">
                Have a question about flowers, delivery, or your order? Reach
                out directly to your local florist.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
              {showAddress && hasAddress && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: `${accentColor}14`,
                      color: accentColor,
                    }}
                  >
                    <MapPin size={21} />
                  </div>

                  <p className="mt-5 font-black text-gray-950">
                    Visit Our Shop
                  </p>

                  <p className="mt-2 text-sm leading-6 text-gray-600">
                    {fullAddress}
                  </p>
                </div>
              )}

              {showPhone && shop.phone && (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: `${accentColor}14`,
                      color: accentColor,
                    }}
                  >
                    <Phone size={21} />
                  </div>

                  <p className="mt-5 font-black text-gray-950">Call Us</p>

                  <a
                    href={`tel:${shop.phone}`}
                    className="mt-2 block text-sm font-semibold text-gray-600 transition hover:text-gray-950"
                  >
                    {shop.phone}
                  </a>
                </div>
              )}

              <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-7">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-2xl"
                  style={{
                    backgroundColor: `${accentColor}14`,
                    color: accentColor,
                  }}
                >
                  <Mail size={21} />
                </div>

                <p className="mt-5 font-black text-gray-950">Email Us</p>

                <a
                  href={`mailto:${shop.email}`}
                  className="mt-2 block break-all text-sm font-semibold text-gray-600 transition hover:text-gray-950"
                >
                  {shop.email}
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-gray-950 px-5 text-white sm:px-8">
        <div className="mx-auto max-w-7xl py-12 sm:py-14">
          <div className="grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-start lg:grid-cols-[1.35fr_0.65fr]">
            {/* BRAND */}
            <div className="max-w-xl">
              <Link
                href={storefrontHomeHref}
                className="inline-flex max-w-full items-center gap-3"
              >
                {website.storefrontTheme.logo ? (
                  <div className="rounded-2xl bg-white p-3">
                    <img
                      src={website.storefrontTheme.logo}
                      alt={`${website.siteName} logo`}
                      className="h-10 w-auto max-w-[180px] object-contain sm:h-12 sm:max-w-[220px]"
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: primaryColor,
                        color: primaryForeground,
                      }}
                    >
                      <Flower2 size={22} />
                    </div>

                    <p className="truncate text-xl font-black">
                      {website.siteName}
                    </p>
                  </>
                )}
              </Link>

              <p className="mt-5 max-w-md text-sm leading-7 text-gray-400">
                {website.storefrontTheme.tagline ||
                  `Fresh flowers, thoughtful design, and personal service from ${shop.businessName}.`}
              </p>

              {showAddress && cityState && (
                <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gray-500">
                  <MapPin size={15} />
                  {cityState}
                </p>
              )}

              {showSocialLinks &&
                (shop.socialLinks.facebook || shop.socialLinks.instagram) && (
                  <div className="mt-6 flex items-center gap-3">
                    {shop.socialLinks.facebook && (
                      <a
                        href={shop.socialLinks.facebook}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${website.siteName} on Facebook`}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                      >
                        <Facebook size={18} />
                      </a>
                    )}

                    {shop.socialLinks.instagram && (
                      <a
                        href={shop.socialLinks.instagram}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${website.siteName} on Instagram`}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                      >
                        <Instagram size={18} />
                      </a>
                    )}
                  </div>
                )}
            </div>

            {/* NAVIGATION */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  Shop
                </p>

                <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-gray-300">
                  <Link
                    href={`${storefrontBasePath}/shop`}
                    className="transition hover:text-white"
                  >
                    All Flowers
                  </Link>

                  <a href="#about" className="transition hover:text-white">
                    About Us
                  </a>

                  <a href="#delivery" className="transition hover:text-white">
                    Delivery
                  </a>
                </div>
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">
                  Contact
                </p>

                <div className="mt-4 flex flex-col gap-3 text-sm font-bold text-gray-300">
                  {showPhone && shop.phone && (
                    <a
                      href={`tel:${shop.phone}`}
                      className="transition hover:text-white"
                    >
                      Call Us
                    </a>
                  )}

                  <a
                    href={`mailto:${shop.email}`}
                    className="transition hover:text-white"
                  >
                    Email Us
                  </a>

                  {showAddress && hasAddress && (
                    <a href="#contact" className="transition hover:text-white">
                      Visit Our Shop
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {website.siteName}. All rights
              reserved.
            </p>

            <p>Local flowers. Thoughtfully delivered.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
