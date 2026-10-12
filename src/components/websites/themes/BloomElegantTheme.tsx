import { Clock3, Flower2, MapPin, Sparkles, Truck } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import StorefrontReveal from "@/components/websites/storefront/StorefrontReveal";
import BloomWebsiteStorefrontProductCard, {
  type BloomWebsiteStorefrontProductCardProduct,
} from "@/components/websites/storefront/BloomWebsiteStorefrontProductCard";
import {
  BloomElegantFooter,
  BloomElegantHeader,
} from "@/components/websites/themes/BloomElegantChrome";
import BloomElegantHeroCarousel from "@/components/websites/themes/BloomElegantHeroCarousel";
import {
  getBloomWebsiteHomepageSectionDefaults,
  resolveBloomWebsiteTrustPoints,
} from "@/lib/bloom-websites/storefront-content";
import type {
  BloomWebsiteHomepageMerchandisingSection,
  BloomWebsiteHomepageSectionKey,
  BloomWebsiteStorefront,
  BloomWebsiteStorefrontProduct,
} from "@/types/bloom-website";

type Props = {
  storefront: BloomWebsiteStorefront;
  basePath?: string;
};

function formatCutoff(value: string) {
  const [hourString, minuteString] = value.split(":");
  const hour = Number(hourString);
  const minute = Number(minuteString || "0");
  if (Number.isNaN(hour)) return value;
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

function formatLocalList(values: string[], limit = 8) {
  const visible = values.slice(0, limit);
  const remaining = values.length - visible.length;
  if (!visible.length) return "";
  return remaining > 0 ? `${visible.join(", ")}, and ${remaining} more` : visible.join(", ");
}

function toProductCard(product: BloomWebsiteStorefrontProduct): BloomWebsiteStorefrontProductCardProduct {
  const enabledPrices = product.pricingTiers.filter((tier) => tier.enabled).map((tier) => tier.price);
  const startingPrice = enabledPrices.length ? Math.min(...enabledPrices) : null;

  return {
    name: product.name,
    slug: product.slug,
    description: product.description,
    shortDescription: product.shortDescription,
    category: product.category,
    imageUrl: product.imageUrl,
    startingPrice,
    isFeatured: product.isFeatured,
    availabilityState: product.soldOut ? "sold_out" : startingPrice === null ? "unavailable" : "available",
  };
}

function selectProducts(
  products: BloomWebsiteStorefrontProduct[],
  section: BloomWebsiteHomepageMerchandisingSection,
) {
  let selected = products;

  if ((section.sourceType === "occasion" || section.sourceType === "category") && !section.sourceValue.trim()) {
    return [];
  }

  if (section.sourceType === "featured") {
    selected = products.filter((product) => product.isFeatured);
  } else if (section.sourceType === "occasion" && section.sourceValue) {
    selected = products.filter((product) =>
      product.occasions.some((occasion) => occasion.toLowerCase() === section.sourceValue.toLowerCase()),
    );
  } else if (section.sourceType === "category" && section.sourceValue) {
    selected = products.filter((product) => product.category.toLowerCase() === section.sourceValue.toLowerCase());
  }

  return selected.slice(0, section.productLimit).map(toProductCard);
}

function ProductCollection({
  eyebrow,
  heading,
  description,
  products,
  basePath,
  primaryColor,
  accentColor,
  primaryForeground,
}: {
  eyebrow: string;
  heading: string;
  description: string;
  products: BloomWebsiteStorefrontProductCardProduct[];
  basePath: string;
  primaryColor: string;
  accentColor: string;
  primaryForeground: "#000000" | "#ffffff";
}) {
  if (!products.length) return null;

  return (
    <section className="bg-white px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
      <div className="mx-auto max-w-[1500px]">
        <StorefrontReveal>
          <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              {eyebrow ? <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">{eyebrow}</p> : null}
              <h2 className="mt-3 max-w-xl font-serif text-4xl font-medium leading-tight tracking-tight text-stone-950 sm:text-5xl">
                {heading}
              </h2>
            </div>
            <div className="lg:pb-1">
              {description ? <p className="max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">{description}</p> : null}
              <Link href={`${basePath}/shop`} className="mt-5 inline-block border-b border-stone-500 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-700 transition hover:opacity-55">
                View the full collection
              </Link>
            </div>
          </div>
        </StorefrontReveal>

        <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 sm:gap-x-7 lg:grid-cols-3 lg:gap-y-16">
          {products.map((product, index) => (
            <StorefrontReveal key={product.slug} delayMs={Math.min(index, 5) * 70}>
              <BloomWebsiteStorefrontProductCard
                product={product}
                basePath={basePath}
                primaryColor={primaryColor}
                accentColor={accentColor}
                primaryForeground={primaryForeground}
                variant="elegant"
              />
            </StorefrontReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function BloomElegantTheme({ storefront, basePath }: Props) {
  const { website, shop, products } = storefront;
  const storefrontBasePath = basePath ?? `/websites/preview/${website.previewSlug}`;
  const { primaryColor, primaryForeground, accentColor } = website.storefrontTheme;

  const showPhone = website.settings.showPhone;
  const showAddress = website.settings.showAddress;
  const showSocialLinks = website.settings.showSocialLinks;
  const cityState = [shop.address.city, shop.address.state].filter(Boolean).join(", ");
  const fullAddress = [shop.address.street, cityState, shop.address.zip].filter(Boolean).join(" ");

  const defaults = getBloomWebsiteHomepageSectionDefaults({
    businessName: website.siteName,
    cityState: showAddress ? cityState : "",
    localDeliveryNote: website.seo?.localDelivery.localDeliveryNote,
  });

  const copyFor = (key: keyof typeof defaults) => ({
    eyebrow: website.homepage.sectionContent[key].eyebrow || defaults[key].eyebrow,
    heading: website.homepage.sectionContent[key].heading || defaults[key].heading,
    description:
      website.homepage.sectionContent[key].description ||
      (key === "about" ? website.homepage.aboutText : "") ||
      defaults[key].description,
  });

  const featuredCopy = copyFor("featured");
  const occasionsCopy = copyFor("occasions");
  const aboutCopy = copyFor("about");
  const trustCopy = copyFor("trust");
  const deliveryCopy = copyFor("delivery");
  const contactCopy = copyFor("contact");
  const trustPoints = resolveBloomWebsiteTrustPoints(website.homepage.trustPoints);

  const occasions = Array.from(
    new Map(
      products
        .flatMap((product) => product.occasions)
        .map((occasion) => occasion.trim())
        .filter(Boolean)
        .map((occasion) => [toFilterSlug(occasion), occasion]),
    ).values(),
  ).slice(0, 8);

  const primaryProducts = products.slice(0, 6).map(toProductCard);
  const visualProducts = primaryProducts.filter((product) => product.imageUrl).slice(0, 3);
  const localDelivery = website.seo?.localDelivery;
  const localAreas = [...(localDelivery?.serviceCities || []), ...(localDelivery?.neighborhoods || [])];
  const hasMap = showAddress && Boolean(fullAddress);
  const mapSrc = hasMap ? `https://www.google.com/maps?q=${encodeURIComponent(fullAddress)}&output=embed` : "";

  const sectionNodes: Record<BloomWebsiteHomepageSectionKey, ReactNode> = {
    occasions:
      occasions.length > 0 ? (
        <section className="border-b border-stone-200 bg-[#fffdf9] px-5 py-14 sm:px-8 lg:px-10">
          <StorefrontReveal className="mx-auto max-w-[1500px]">
            <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-end">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">{occasionsCopy.eyebrow}</p>
                <h2 className="mt-3 font-serif text-3xl font-medium tracking-tight text-stone-950 sm:text-4xl">{occasionsCopy.heading}</h2>
                <p className="mt-4 max-w-lg text-sm leading-7 text-stone-600">{occasionsCopy.description}</p>
              </div>
              <div className="grid grid-cols-2 border-l border-t border-stone-200 sm:grid-cols-4">
                {occasions.map((occasion) => (
                  <Link key={occasion} href={`${storefrontBasePath}/shop?occasion=${encodeURIComponent(toFilterSlug(occasion))}`} className="group border-b border-r border-stone-200 px-4 py-5 transition-colors hover:bg-stone-50 sm:px-6 sm:py-7">
                    <p className="font-serif text-lg font-medium text-stone-900 sm:text-xl">{occasion}</p>
                    <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-500 transition group-hover:text-stone-950">Explore →</p>
                  </Link>
                ))}
              </div>
            </div>
          </StorefrontReveal>
        </section>
      ) : null,

    featured: (
      <ProductCollection
        eyebrow={featuredCopy.eyebrow}
        heading={featuredCopy.heading}
        description={featuredCopy.description}
        products={primaryProducts}
        basePath={storefrontBasePath}
        primaryColor={primaryColor}
        accentColor={accentColor}
        primaryForeground={primaryForeground}
      />
    ),

    merchandising: (
      <>
        {website.homepage.merchandisingSections
          .filter((section) => section.enabled)
          .map((section) => (
            <ProductCollection
              key={section.id}
              eyebrow={section.eyebrow}
              heading={section.heading}
              description={section.description}
              products={selectProducts(products, section)}
              basePath={storefrontBasePath}
              primaryColor={primaryColor}
              accentColor={accentColor}
              primaryForeground={primaryForeground}
            />
          ))}
      </>
    ),

    about: (
      <section className="overflow-hidden bg-[#f4efe8] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <StorefrontReveal className="mx-auto grid max-w-[1500px] gap-12 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-20">
          <div className="order-2 lg:order-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">{aboutCopy.eyebrow}</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-medium leading-tight tracking-tight text-stone-950 sm:text-5xl">{aboutCopy.heading}</h2>
            <p className="mt-6 max-w-xl whitespace-pre-line text-sm leading-8 text-stone-600 sm:text-base">{aboutCopy.description}</p>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
              {showAddress && cityState ? <span>{cityState}</span> : null}
              {showPhone && shop.phone ? <a href={`tel:${shop.phone}`} className="transition hover:opacity-55">{shop.phone}</a> : null}
            </div>
            {website.aboutPage?.enabled !== false ? (
              <Link href={`${storefrontBasePath}/about`} className="mt-8 inline-block border-b border-stone-700 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-800 transition hover:opacity-55">Meet the florist</Link>
            ) : null}
          </div>

          <div className="order-1 lg:order-2">
            {website.homepage.aboutImage ? (
              <div className="relative aspect-[5/4] overflow-hidden bg-white shadow-[0_30px_80px_rgba(28,25,23,0.08)]">
                <img src={website.homepage.aboutImage} alt={`${website.siteName} florist story`} className="h-full w-full object-cover transition duration-700 hover:scale-[1.025]" />
              </div>
            ) : (
              <div className="flex aspect-[5/4] items-center justify-center border border-stone-200 bg-[#fffdf9] text-center">
                <div className="max-w-xs px-8"><Flower2 size={32} className="mx-auto text-stone-400" /><p className="mt-4 font-serif text-2xl text-stone-800">Your florist story belongs here.</p><p className="mt-2 text-sm leading-6 text-stone-500">Add a team, shop, or behind-the-scenes photo in the Storefront Editor.</p></div>
              </div>
            )}
          </div>
        </StorefrontReveal>
      </section>
    ),

    trust: (
      <section className="border-y border-stone-200 bg-[#fffdf9] px-5 py-16 sm:px-8 lg:px-10">
        <StorefrontReveal className="mx-auto max-w-[1500px]">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">{trustCopy.eyebrow}</p>
            <h2 className="mt-3 font-serif text-3xl font-medium text-stone-950 sm:text-4xl">{trustCopy.heading}</h2>
            {trustCopy.description ? <p className="mt-4 text-sm leading-7 text-stone-600">{trustCopy.description}</p> : null}
          </div>
          <div className="mt-10 grid border-l border-t border-stone-200 sm:grid-cols-2 lg:grid-cols-4">
            {trustPoints.map((point, index) => (
              <div key={`${point.title}-${index}`} className="border-b border-r border-stone-200 px-6 py-8">
                <p className="font-serif text-xl text-stone-900">{point.title}</p>
                <p className="mt-3 text-sm leading-7 text-stone-500">{point.description}</p>
              </div>
            ))}
          </div>
        </StorefrontReveal>
      </section>
    ),

    delivery: (
      <section id="delivery" className="bg-stone-950 px-5 py-20 text-white sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <StorefrontReveal className="mx-auto grid max-w-[1500px] gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:gap-20">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/50">{deliveryCopy.eyebrow}</p>
            <h2 className="mt-3 max-w-2xl font-serif text-4xl font-medium leading-tight sm:text-5xl">{deliveryCopy.heading}</h2>
            <p className="mt-6 max-w-xl text-sm leading-8 text-white/70 sm:text-base">{deliveryCopy.description}</p>
            <Link href={`${storefrontBasePath}/shop`} className="mt-8 inline-block border-b border-white/70 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">Shop for delivery</Link>
          </div>
          <div className="grid gap-px bg-white/15 sm:grid-cols-3">
            <div className="bg-stone-950 p-6"><Truck size={20} className="text-white/70" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">Local delivery</p><p className="mt-2 text-sm leading-6 text-white/60">{localAreas.length ? formatLocalList(localAreas) : cityState ? `Serving ${cityState} and nearby communities.` : "Hand delivered by your local florist."}</p></div>
            <div className="bg-stone-950 p-6"><Flower2 size={20} className="text-white/70" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">Designed with care</p><p className="mt-2 text-sm leading-6 text-white/60">Every order is prepared by a real local floral team.</p></div>
            <div className="bg-stone-950 p-6"><Clock3 size={20} className="text-white/70" /><p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em]">Ordering</p><p className="mt-2 text-sm leading-6 text-white/60">{website.orderPolicy.allowsSameDay ? `Same-day orders accepted until ${formatCutoff(website.orderPolicy.sameDayCutoff)} when available.` : "Order online anytime for upcoming delivery dates."}</p></div>
          </div>
        </StorefrontReveal>
      </section>
    ),

    contact: (
      <section id="contact" className="bg-[#fffdf9] px-5 py-20 sm:px-8 sm:py-24 lg:px-10 lg:py-28">
        <StorefrontReveal className="mx-auto max-w-[1500px]">
          <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-start lg:gap-16">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-stone-500">{contactCopy.eyebrow}</p>
              <h2 className="mt-3 font-serif text-4xl font-medium tracking-tight text-stone-950 sm:text-5xl">{contactCopy.heading}</h2>
              <p className="mt-5 max-w-lg text-sm leading-8 text-stone-600">{contactCopy.description}</p>
              <div className="mt-8 space-y-4 text-sm text-stone-700">
                {showAddress && fullAddress ? <p className="flex items-start gap-3"><MapPin size={17} className="mt-0.5 shrink-0" /><span>{fullAddress}</span></p> : null}
                {showPhone && shop.phone ? <a href={`tel:${shop.phone}`} className="block w-fit border-b border-stone-400 pb-1 font-medium">{shop.phone}</a> : null}
                {shop.email ? <a href={`mailto:${shop.email}`} className="block w-fit border-b border-stone-400 pb-1 font-medium">{shop.email}</a> : null}
              </div>
            </div>
            {hasMap ? (
              <div className="overflow-hidden border border-stone-200 bg-stone-100 shadow-[0_24px_60px_rgba(28,25,23,0.08)]">
                <iframe title={`Map to ${website.siteName}`} src={mapSrc} className="h-[380px] w-full border-0 sm:h-[460px]" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
              </div>
            ) : (
              <div className="flex min-h-[340px] items-center justify-center border border-stone-200 bg-[#f4efe8] px-8 text-center"><div><MapPin size={30} className="mx-auto text-stone-400" /><p className="mt-4 font-serif text-2xl text-stone-800">Add your shop address to show a map.</p></div></div>
            )}
          </div>
        </StorefrontReveal>
      </section>
    ),
  };

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
        announcement={website.announcement}
      />

      <main>
        <BloomElegantHeroCarousel
          slides={website.homepage.heroSlides}
          basePath={storefrontBasePath}
          cityState={cityState}
          showAddress={showAddress}
          showPhone={showPhone}
          phone={shop.phone}
          allowsSameDay={website.orderPolicy.allowsSameDay}
          sameDayCutoff={website.orderPolicy.sameDayCutoff}
          primaryColor={primaryColor}
          primaryForeground={primaryForeground}
          visualProducts={visualProducts.map((product) => ({ name: product.name, imageUrl: product.imageUrl }))}
        />

        {website.homepage.sectionOrder.map((key) =>
          website.homepage.sectionVisibility[key] ? <div key={key}>{sectionNodes[key]}</div> : null,
        )}
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
        showPhone={showPhone}
        showAddress={showAddress}
        showSocialLinks={showSocialLinks}
        socialLinks={shop.socialLinks}
      />
    </div>
  );
}
