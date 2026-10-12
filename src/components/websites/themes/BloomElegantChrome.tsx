import {
  Facebook,
  Instagram,
  Mail,
  MapPin,
  Music2,
  Phone,
} from "lucide-react";
import Link from "next/link";

import StorefrontCartButton from "@/components/websites/storefront/StorefrontCartButton";
import { getBloomWebsiteHeaderLogoClassName } from "@/lib/bloom-websites/storefront-theme";
import type { BloomWebsiteLogoSize } from "@/types/bloom-website";

type ElegantHeaderProps = {
  siteName: string;
  logo: string;
  logoSize?: BloomWebsiteLogoSize;
  basePath: string;
  primaryColor: string;
  primaryForeground: "#000000" | "#ffffff";
  aboutEnabled?: boolean;
  announcement?: {
    isActive: boolean;
    message: string;
  };
};

type ElegantFooterProps = {
  siteName: string;
  businessName: string;
  tagline?: string;
  basePath: string;
  aboutEnabled?: boolean;
  cityState?: string;
  fullAddress?: string;
  phone?: string;
  email?: string;
  showPhone?: boolean;
  showAddress?: boolean;
  showSocialLinks?: boolean;
  socialLinks?: {
    facebook?: string;
    instagram?: string;
    pinterest?: string;
    tiktok?: string;
  };
};

export function BloomElegantHeader({
  siteName,
  logo,
  logoSize,
  basePath,
  primaryColor,
  primaryForeground,
  aboutEnabled = true,
  announcement,
}: ElegantHeaderProps) {
  const homeHref = basePath || "/";

  return (
    <>
      {announcement?.isActive ? (
        <div className="border-b border-stone-200 bg-[#f3eee7] px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-700 sm:text-xs">
          {announcement.message}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-[#fffdf9]/95 backdrop-blur">
        <div className="mx-auto grid max-w-[1500px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 py-3 sm:px-8 lg:px-10">
          <nav className="hidden items-center gap-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-700 lg:flex">
            <Link href={`${basePath}/shop`} className="group relative py-1">
              Shop
              <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-stone-800 transition-transform duration-300 group-hover:scale-x-100" />
            </Link>
            {aboutEnabled ? (
              <Link href={`${basePath}/about`} className="group relative py-1">
                About
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-stone-800 transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ) : null}
          </nav>

          <Link
            href={homeHref}
            className="col-start-1 flex min-w-0 items-center lg:col-start-2 lg:justify-self-center"
          >
            {logo ? (
              <img
                src={logo}
                alt={`${siteName} logo`}
                className={getBloomWebsiteHeaderLogoClassName(logoSize, "elegant")}
              />
            ) : (
              <span className="truncate font-serif text-xl font-medium tracking-[0.02em] text-stone-950 sm:text-2xl">
                {siteName}
              </span>
            )}
          </Link>

          <div className="col-start-3 flex items-center justify-end gap-2 sm:gap-3">
            <Link
              href={`${basePath}/shop`}
              className="inline-flex border-b border-stone-400 pb-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-stone-700 lg:hidden"
            >
              Shop
            </Link>

            <StorefrontCartButton
              primaryColor={primaryColor}
              primaryForeground={primaryForeground}
              compact
              variant="elegant"
            />
          </div>
        </div>
      </header>
    </>
  );
}

export function BloomElegantFooter({
  siteName,
  businessName,
  tagline,
  basePath,
  aboutEnabled = true,
  cityState,
  fullAddress,
  phone,
  email,
  showPhone,
  showAddress,
  showSocialLinks,
  socialLinks,
}: ElegantFooterProps) {
  const homeHref = basePath || "/";
  const socialItems = [
    { label: "Facebook", href: socialLinks?.facebook, Icon: Facebook },
    { label: "Instagram", href: socialLinks?.instagram, Icon: Instagram },
    { label: "Pinterest", href: socialLinks?.pinterest, Icon: MapPin },
    { label: "TikTok", href: socialLinks?.tiktok, Icon: Music2 },
  ].filter((item) => Boolean(item.href));

  return (
    <footer className="border-t border-stone-200 bg-[#f3eee7] px-5 py-14 text-stone-800 sm:px-8 sm:py-16 lg:px-10">
      <div className="mx-auto grid max-w-[1500px] gap-10 md:grid-cols-[1.2fr_0.8fr_0.8fr] md:gap-14">
        <div>
          <p className="font-serif text-2xl font-medium tracking-tight text-stone-950">
            {siteName}
          </p>
          <p className="mt-4 max-w-md text-sm leading-7 text-stone-600">
            {tagline ||
              (cityState
                ? `Thoughtful floral design by ${businessName}, serving ${cityState} and surrounding communities.`
                : `Thoughtful floral design by ${businessName}.`)}
          </p>

          {showSocialLinks && socialItems.length > 0 ? (
            <div className="mt-6 flex flex-wrap gap-4">
              {socialItems.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={label}
                  className="text-stone-600 transition hover:text-stone-950"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Explore
          </p>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link href={homeHref} className="w-fit transition hover:opacity-55">
              Home
            </Link>
            <Link href={`${basePath}/shop`} className="w-fit transition hover:opacity-55">
              Shop Flowers
            </Link>
            {aboutEnabled ? (
              <Link href={`${basePath}/about`} className="w-fit transition hover:opacity-55">
                Our Story
              </Link>
            ) : null}
          </div>
        </div>

        {(showAddress && fullAddress) || (showPhone && phone) || email ? (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500">
            Studio &amp; Contact
          </p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-stone-600">
            {showAddress && fullAddress ? (
              <p className="flex items-start gap-2">
                <MapPin size={15} className="mt-1 shrink-0" />
                <span>{fullAddress}</span>
              </p>
            ) : null}
            {showPhone && phone ? (
              <a href={`tel:${phone}`} className="flex items-center gap-2 transition hover:opacity-55">
                <Phone size={15} />
                {phone}
              </a>
            ) : null}
            {email ? (
              <a href={`mailto:${email}`} className="flex items-center gap-2 transition hover:opacity-55">
                <Mail size={15} />
                {email}
              </a>
            ) : null}
          </div>
        </div>
        ) : null}
      </div>
    </footer>
  );
}
