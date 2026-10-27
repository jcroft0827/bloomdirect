import { Facebook, Flower2, Instagram, Mail, MapPin, Music2, Phone, ShoppingBag } from "lucide-react";
import Link from "next/link";

import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import {
  BloomElegantFooter,
  BloomElegantHeader,
} from "@/components/websites/themes/BloomElegantChrome";
import { getBloomWebsiteHeaderLogoClassName } from "@/lib/bloom-websites/storefront-theme";
import type { BloomWebsiteStorefront, BloomWebsiteTextAlignment } from "@/types/bloom-website";

type Props = {
  storefront: BloomWebsiteStorefront;
  basePath?: string;
  editorPreview?: boolean;
};

function getTextAlignmentClass(alignment: BloomWebsiteTextAlignment) {
  if (alignment === "center") return "text-center";
  if (alignment === "right") return "text-right";
  return "text-left";
}

function getResponsiveTextAlignmentClass(
  mobile: BloomWebsiteTextAlignment,
  desktop: BloomWebsiteTextAlignment,
  breakpoint: "md" | "lg" = "md",
) {
  return `${getTextAlignmentClass(mobile)} ${breakpoint}:${getTextAlignmentClass(desktop)}`;
}

function paragraphs(value: string) {
  return value
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export default function BloomWebsiteAboutStorefront({
  storefront,
  basePath = "",
  editorPreview = false,
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

  const elegant = website.theme === "bloom-elegant";
  const fullAddress = [shop.address.street, cityState, shop.address.zip]
    .filter(Boolean)
    .join(" ");

  if (elegant) {
    return (
      <div className="min-h-screen bg-[#fffdf9] text-stone-950">
        <BloomElegantHeader
          siteName={website.siteName}
          logo={website.storefrontTheme.logo}
          logoSize={website.storefrontTheme.logoSize}
          basePath={storefrontBasePath}
          primaryColor={primaryColor}
          primaryForeground={primaryForeground}
          aboutEnabled={website.aboutPage?.enabled !== false}
          editorPreview={editorPreview}
          announcement={{
            isActive: website.announcement.isActive,
            message: website.announcement.message,
          }}
        />

        <main>
          <section className="border-b border-stone-200 bg-[#f3eee7] px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
            <div className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end lg:gap-20">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">
                  Our Story
                </p>
                <h1 className="mt-4 max-w-xl font-serif text-5xl font-medium leading-[1.05] tracking-tight text-stone-950 sm:text-6xl lg:text-7xl">
                  {website.aboutPage?.heading || "Flowers with a point of view."}
                </h1>
              </div>
              <div className="max-w-2xl lg:justify-self-end">
                <p className="text-base leading-8 text-stone-600 sm:text-lg sm:leading-9">
                  {website.storefrontTheme.tagline ||
                    `Thoughtful floral design and personal service from ${shop.businessName}.`}
                </p>
                {cityState ? (
                  <p className="mt-6 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-500">
                    <MapPin size={14} />
                    {cityState}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {(website.aboutPage?.useCustomImage && website.aboutPage?.customImageUrl ? website.aboutPage.customImageUrl : website.homepage.aboutImage) ? (
            <section className="mx-auto max-w-[1500px] px-5 pt-10 sm:px-8 sm:pt-14 lg:px-10">
              <div className="relative w-full min-w-0 overflow-hidden bg-stone-100 aspect-[4/3] sm:aspect-[16/7]">
                <img
                  src={(website.aboutPage?.useCustomImage && website.aboutPage?.customImageUrl ? website.aboutPage.customImageUrl : website.homepage.aboutImage)}
                  alt={`${website.siteName} florist and shop`}
                  className="block h-full w-full max-w-full object-cover"
                />
              </div>
            </section>
          ) : null}

          <div className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
            {sections.length ? (
              <div className="divide-y divide-stone-200 border-y border-stone-200">
                {sections.map((section, index) => {
                  const desktopAlignment = section.desktopTextAlignment ?? section.textAlignment ?? "left";
                  const mobileAlignment = section.mobileTextAlignment ?? section.textAlignment ?? desktopAlignment;
                  const alignmentClass = getResponsiveTextAlignmentClass(mobileAlignment, desktopAlignment, "lg");
                  return (
                  <section
                    key={section.key}
                    className={`grid gap-6 py-12 sm:py-16 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16 ${alignmentClass}`}
                  >
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-400">
                        {String(index + 1).padStart(2, "0")}
                      </p>
                      <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-stone-950 sm:text-4xl">
                        {section.title}
                      </h2>
                    </div>
                    <div className="space-y-5 text-base leading-8 text-stone-600">
                      {paragraphs(section.body).map((paragraph, paragraphIndex) => (
                        <p key={paragraphIndex}>{paragraph}</p>
                      ))}
                    </div>
                  </section>
                  );
                })}
              </div>
            ) : (
              <section className="border-y border-stone-200 py-16 text-center">
                <h2 className="font-serif text-3xl font-medium text-stone-950 sm:text-4xl">
                  A local florist you can count on.
                </h2>
                <p className="mx-auto mt-5 max-w-2xl leading-8 text-stone-600">
                  {shop.businessName} is proud to create and deliver flowers for the moments that matter most.
                </p>
              </section>
            )}

            {(website.settings.showAddress && fullAddress) || (website.settings.showPhone && shop.phone) || shop.email ? (
              <section className="mt-20 border-y border-stone-200 py-12">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">Visit &amp; Contact</p>
                <div className="mt-6 grid gap-6 sm:grid-cols-3">
                  {website.settings.showAddress && fullAddress ? <div><MapPin size={18} className="text-stone-500" /><p className="mt-3 text-sm font-medium text-stone-900">Studio</p><p className="mt-2 text-sm leading-6 text-stone-600">{fullAddress}</p></div> : null}
                  {website.settings.showPhone && shop.phone ? <div><Phone size={18} className="text-stone-500" /><p className="mt-3 text-sm font-medium text-stone-900">Phone</p><a href={`tel:${shop.phone}`} className="mt-2 block text-sm text-stone-600 hover:text-stone-950">{shop.phone}</a></div> : null}
                  {shop.email ? <div><Mail size={18} className="text-stone-500" /><p className="mt-3 text-sm font-medium text-stone-900">Email</p><a href={`mailto:${shop.email}`} className="mt-2 block break-all text-sm text-stone-600 hover:text-stone-950">{shop.email}</a></div> : null}
                </div>
              </section>
            ) : null}

            <section className="mt-20 grid gap-8 bg-[#f3eee7] px-7 py-12 sm:px-12 sm:py-14 lg:grid-cols-[1fr_auto] lg:items-center lg:px-16">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                  Send something beautiful
                </p>
                <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-stone-950 sm:text-4xl">
                  Flowers designed for the moments that matter.
                </h2>
              </div>
              <Link
                href={`${storefrontBasePath}/shop`}
                className="inline-flex w-fit items-center gap-2 border-b border-stone-600 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-800 transition hover:opacity-55"
              >
                Shop Flowers <ShoppingBag size={15} />
              </Link>
            </section>
          </div>
        </main>

        <BloomElegantFooter
          siteName={website.siteName}
          businessName={shop.businessName}
          tagline={website.storefrontTheme.tagline}
          basePath={storefrontBasePath}
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
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-950">
      <header className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-2 sm:px-8 sm:py-2.5">
          <Link href={homeHref} className="flex min-w-0 items-center gap-3">
            {website.storefrontTheme.logo ? (
              <img
                src={website.storefrontTheme.logo}
                alt={`${website.siteName} logo`}
                className={getBloomWebsiteHeaderLogoClassName(website.storefrontTheme.logoSize, "classic")}
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
            {editorPreview ? (
              <span aria-label="Cart (preview only)" className="flex h-11 items-center rounded-full px-4 text-sm font-black" style={{ backgroundColor: primaryColor, color: primaryForeground }}>Cart</span>
            ) : (
              <StorefrontCartButton
                primaryColor={primaryColor}
                primaryForeground={primaryForeground}
                compact
              />
            )}
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

        {(website.aboutPage?.useCustomImage && website.aboutPage?.customImageUrl ? website.aboutPage.customImageUrl : website.homepage.aboutImage) ? (
          <section className="mx-auto max-w-6xl px-5 pt-10 sm:px-8 sm:pt-14">
            <div className="relative w-full min-w-0 overflow-hidden rounded-2xl sm:rounded-[2rem] bg-gray-100 shadow-sm aspect-[4/3] sm:aspect-[16/7]">
              <img src={(website.aboutPage?.useCustomImage && website.aboutPage?.customImageUrl ? website.aboutPage.customImageUrl : website.homepage.aboutImage)} alt={`${website.siteName} florist and shop`} className="block h-full w-full max-w-full object-cover" />
            </div>
          </section>
        ) : null}

        <div className="mx-auto max-w-5xl space-y-6 px-5 py-14 sm:px-8 sm:py-20">
          {sections.length ? (
            sections.map((section, index) => {
              const desktopAlignment = section.desktopTextAlignment ?? section.textAlignment ?? "left";
              const mobileAlignment = section.mobileTextAlignment ?? section.textAlignment ?? desktopAlignment;
              const alignmentClass = getResponsiveTextAlignmentClass(mobileAlignment, desktopAlignment);
              return (
              <section
                key={section.key}
                className={`rounded-[2rem] border border-gray-200 p-7 shadow-sm sm:p-10 ${
                  index % 2 === 0 ? "bg-white" : "bg-[#faf9f7]"
                } ${alignmentClass}`}
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
              );
            })
          ) : (
            <section className="rounded-[2rem] border border-gray-200 bg-white p-8 text-center shadow-sm">
              <h2 className="text-2xl font-black">A local florist you can count on.</h2>
              <p className="mx-auto mt-4 max-w-2xl leading-7 text-gray-600">
                {shop.businessName} is proud to create and deliver flowers for the moments that matter most.
              </p>
            </section>
          )}

          {(website.settings.showAddress && fullAddress) || (website.settings.showPhone && shop.phone) || shop.email ? (
            <section className="grid gap-4 rounded-[2rem] border border-gray-200 bg-[#faf9f7] p-6 sm:grid-cols-3 sm:p-8">
              {website.settings.showAddress && fullAddress ? <div><MapPin size={19} style={{ color: accentColor }} /><p className="mt-3 font-black text-gray-950">Visit</p><p className="mt-2 text-sm leading-6 text-gray-600">{fullAddress}</p></div> : null}
              {website.settings.showPhone && shop.phone ? <div><Phone size={19} style={{ color: accentColor }} /><p className="mt-3 font-black text-gray-950">Call</p><a href={`tel:${shop.phone}`} className="mt-2 block text-sm font-semibold text-gray-600">{shop.phone}</a></div> : null}
              {shop.email ? <div><Mail size={19} style={{ color: accentColor }} /><p className="mt-3 font-black text-gray-950">Email</p><a href={`mailto:${shop.email}`} className="mt-2 block break-all text-sm font-semibold text-gray-600">{shop.email}</a></div> : null}
            </section>
          ) : null}

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
