import { Facebook, Flower2, Instagram, MapPin, Music2, ShoppingBag } from "lucide-react";
import Link from "next/link";

import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import type { BloomWebsiteStorefront } from "@/types/bloom-website";

type Props = {
  storefront: BloomWebsiteStorefront;
  basePath?: string;
};

function paragraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function BloomWebsiteAboutStorefront({
  storefront,
  basePath = "",
}: Props) {
  const { website, shop } = storefront;
  const storefrontBasePath = basePath.replace(/\/$/, "");
  const homeHref = storefrontBasePath || "/";
  const primaryColor = website.storefrontTheme.primaryColor;
  const accentColor = website.storefrontTheme.accentColor;
  const primaryForeground = website.storefrontTheme.primaryForeground;
  const cityState = [shop.address.city, shop.address.state].filter(Boolean).join(", ");

  const configuredSections = website.aboutPage?.sections || [];
  const sections = (configuredSections.length
    ? configuredSections
    : [
        {
          key: "story" as const,
          enabled: true,
          title: "Our Story",
          body: website.homepage.aboutText || website.storefrontTheme.tagline,
          sortOrder: 0,
        },
      ])
    .filter((section) => section.enabled && section.body.trim())
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 sm:px-8 sm:py-2.5">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            {website.storefrontTheme.logo ? (
              <img
                src={website.storefrontTheme.logo}
                alt={`${website.siteName} logo`}
                className="h-16 w-auto max-w-[240px] object-contain object-left sm:h-[4.5rem] sm:max-w-[300px] lg:h-20 lg:max-w-[360px]"
              />
            ) : (
              <>
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: primaryColor, color: primaryForeground }}
                >
                  <Flower2 size={22} />
                </div>
                <p className="truncate text-xl font-black">{website.siteName}</p>
              </>
            )}
          </Link>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <nav className="hidden items-center gap-7 text-sm font-bold text-gray-700 lg:flex">
              <Link href={homeHref} className="transition hover:opacity-60">Home</Link>
              <Link href={`${storefrontBasePath}/shop`} className="transition hover:opacity-60">Shop</Link>
              <Link href={`${storefrontBasePath}/about`} className="transition hover:opacity-60">About</Link>
            </nav>
            <StorefrontCartButton
              primaryColor={primaryColor}
              primaryForeground={primaryForeground}
              compact
            />
          </div>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-[#f8f6f3] px-5 py-16 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-5xl text-center">
            <p
              className="text-xs font-black uppercase tracking-[0.2em] sm:text-sm"
              style={{ color: accentColor }}
            >
              Meet your local florist
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              {website.aboutPage?.heading || "About Us"}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
              {website.storefrontTheme.tagline ||
                `Thoughtful floral design and personal service from ${shop.businessName}.`}
            </p>
            {cityState ? (
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm">
                <MapPin size={16} style={{ color: accentColor }} />
                {cityState}
              </p>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-5xl space-y-6 px-5 py-14 sm:px-8 sm:py-20">
          {sections.length ? (
            sections.map((section, index) => (
              <section
                key={section.key}
                className={`rounded-[2rem] border border-gray-200 p-7 shadow-sm sm:p-10 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#faf9f7]"
                }`}
              >
                <h2 className="text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                  {section.title}
                </h2>
                <div className="mt-5 space-y-5 text-base leading-8 text-gray-650">
                  {paragraphs(section.body).map((paragraph, paragraphIndex) => (
                    <p key={paragraphIndex} className="text-gray-600">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))
          ) : (
            <section className="rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black">A local florist you can count on.</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
                {shop.businessName} is proud to create and deliver flowers for the moments that matter most.
              </p>
            </section>
          )}

          <section className="rounded-[2rem] p-8 text-center text-white sm:p-10" style={{ backgroundColor: primaryColor }}>
            <h2 className="text-2xl font-black sm:text-3xl">Ready to send something beautiful?</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 opacity-90 sm:text-base">
              Browse flowers designed by {shop.businessName} and choose the arrangement that fits the moment.
            </p>
            <Link
              href={`${storefrontBasePath}/shop`}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-gray-950 transition hover:-translate-y-0.5"
            >
              Shop Flowers <ShoppingBag size={17} />
            </Link>
          </section>
        </div>
      </main>

      <footer className="bg-gray-950 px-5 py-10 text-white sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="font-black">{website.siteName}</p>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {website.storefrontTheme.tagline ||
                (cityState
                  ? `Serving ${cityState} and surrounding communities.`
                  : "Local flowers, thoughtfully designed.")}
            </p>

            {website.settings.showSocialLinks &&
              (shop.socialLinks.facebook ||
                shop.socialLinks.instagram ||
                shop.socialLinks.pinterest ||
                shop.socialLinks.tiktok) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {[
                    { label: "Facebook", href: shop.socialLinks.facebook, Icon: Facebook },
                    { label: "Instagram", href: shop.socialLinks.instagram, Icon: Instagram },
                    { label: "Pinterest", href: shop.socialLinks.pinterest, Icon: MapPin },
                    { label: "TikTok", href: shop.socialLinks.tiktok, Icon: Music2 },
                  ]
                    .filter((item) => Boolean(item.href))
                    .map(({ label, href, Icon }) => (
                      <a
                        key={label}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                      >
                        <Icon size={15} />
                        {label}
                      </a>
                    ))}
                </div>
              )}
          </div>
          <div className="flex gap-5 text-sm font-bold text-gray-300">
            <Link href={homeHref} className="hover:text-white">Home</Link>
            <Link href={`${storefrontBasePath}/shop`} className="hover:text-white">Shop</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
