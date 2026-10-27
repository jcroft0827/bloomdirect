import Link from "next/link";

import BloomWeddingInquiryForm from "@/components/websites/storefront/BloomWeddingInquiryForm";
import {
  BloomElegantFooter,
  BloomElegantHeader,
} from "@/components/websites/themes/BloomElegantChrome";
import type {
  BloomWebsiteStorefront,
  BloomWebsiteTextAlignment,
  BloomWebsiteWeddingFloralDecoration,
} from "@/types/bloom-website";

function getTextAlignmentClass(alignment: BloomWebsiteTextAlignment) {
  if (alignment === "center") return "text-center";
  if (alignment === "right") return "text-right";
  return "text-left";
}

function getResponsiveAlignmentClass(
  mobile: BloomWebsiteTextAlignment,
  desktop: BloomWebsiteTextAlignment,
) {
  return `${getTextAlignmentClass(mobile)} md:${getTextAlignmentClass(desktop)}`;
}

export default function BloomWebsiteWeddingsStorefront({
  storefront,
  basePath = "",
  editorPreview = false,
}: {
  storefront: BloomWebsiteStorefront;
  basePath?: string;
  editorPreview?: boolean;
}) {
  const { website, shop } = storefront;
  const details = website.weddingsPage;

  if (!details?.enabled) return null;

  const elegant = website.theme === "bloom-elegant";
  const base = basePath.replace(/\/$/, "");
  const email = shop.email || "";

  const headingDesktop = details.headingAlignmentDesktop ?? details.headingAlignment ?? "center";
  const headingMobile = details.headingAlignmentMobile ?? details.headingAlignmentDesktop ?? details.headingAlignment ?? headingDesktop;
  const contentDesktop = details.contentAlignmentDesktop ?? details.contentAlignment ?? "left";
  const contentMobile = details.contentAlignmentMobile ?? details.contentAlignmentDesktop ?? details.contentAlignment ?? contentDesktop;

  const headingAlign = getResponsiveAlignmentClass(headingMobile, headingDesktop);
  const contentAlign = getResponsiveAlignmentClass(contentMobile, contentDesktop);
  const lines = (value: string) =>
    value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

  return (
    <div
      className={
        elegant
          ? "min-h-screen bg-[#fffdf9] text-stone-900"
          : "min-h-screen bg-white text-slate-900"
      }
    >
      {elegant ? (
        <BloomElegantHeader
          siteName={website.siteName}
          logo={website.storefrontTheme.logo}
          logoSize={website.storefrontTheme.logoSize}
          basePath={base}
          primaryColor={website.storefrontTheme.primaryColor}
          primaryForeground={website.storefrontTheme.primaryForeground}
          aboutEnabled={website.aboutPage?.enabled !== false}
          editorPreview={editorPreview}
          announcement={{
            isActive: website.announcement.isActive,
            message: website.announcement.message,
          }}
        />
      ) : (
        <header className="border-b px-6 py-5">
          <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <Link href={base || "/"} className="text-lg font-bold">
              {website.siteName}
            </Link>
            <div className="flex gap-5 text-sm">
              <Link href={`${base}/shop`}>Shop</Link>
              <Link href={`${base}/about`}>About</Link>
            </div>
          </nav>
        </header>
      )}

      <main>
        <section
          className={`${
            elegant ? "bg-[#f3eee7] px-6 py-24 sm:py-32" : "bg-slate-50 px-6 py-20"
          } relative overflow-hidden ${headingAlign}`}
        >
          <div className="relative z-10 mx-auto max-w-6xl">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.26em]">
              Personal floral design
            </p>
            <h1
              className={
                elegant
                  ? "mx-auto max-w-4xl font-serif text-5xl leading-tight sm:text-7xl"
                  : "mx-auto max-w-4xl text-4xl font-bold sm:text-6xl"
              }
            >
              {details.heading}
            </h1>
            {details.introduction ? (
              <p
                className={`mt-8 max-w-2xl whitespace-pre-line text-lg leading-8 opacity-75 ${
                  headingDesktop === "center" && headingMobile === "center"
                    ? "mx-auto"
                    : headingDesktop === "right" && headingMobile === "right"
                      ? "md:ml-auto"
                      : headingMobile === "center"
                        ? "mx-auto md:mx-0"
                        : headingMobile === "right"
                          ? "ml-auto md:mx-0"
                          : headingDesktop === "center"
                            ? "md:mx-auto"
                            : headingDesktop === "right"
                              ? "md:ml-auto"
                              : ""
                }`}
              >
                {details.introduction}
              </p>
            ) : null}
          </div>
        </section>

        {details.portfolio.length > 0 ? (
          <section className="mx-auto max-w-7xl px-6 py-16 sm:py-24">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-2 text-xs uppercase tracking-[0.25em] opacity-60">
                  Our portfolio
                </p>
                <h2
                  className={
                    elegant
                      ? "font-serif text-4xl sm:text-5xl"
                      : "text-3xl font-bold sm:text-4xl"
                  }
                >
                  {details.portfolioHeading || "Selected Work"}
                </h2>
              </div>
              <span className="text-sm opacity-60">
                {details.portfolioDescription || "Weddings, events & meaningful moments"}
              </span>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {details.portfolio.map((photo, index) => (
                <figure
                  key={`${photo.url}-${index}`}
                  className={`group overflow-hidden ${
                    index === 0 && details.portfolio.length > 1
                      ? "sm:col-span-2 lg:col-span-2"
                      : ""
                  }`}
                >
                  <div className="overflow-hidden bg-stone-100">
                    <img
                      src={photo.url}
                      alt={photo.alt || `Floral event portfolio photo ${index + 1}`}
                      loading={index === 0 ? "eager" : "lazy"}
                      className={`w-full object-cover transition-transform duration-700 motion-safe:group-hover:scale-[1.035] ${
                        index === 0 && details.portfolio.length > 1
                          ? "aspect-[16/10]"
                          : "aspect-[4/5]"
                      }`}
                    />
                  </div>
                  {photo.caption ? (
                    <figcaption className="pt-3 text-sm leading-6 opacity-70">
                      {photo.caption}
                    </figcaption>
                  ) : null}
                </figure>
              ))}
            </div>
          </section>
        ) : null}

        <div className={`mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-2 ${contentAlign}`}>
          {details.services ? (
            <section>
              <h2 className={elegant ? "mb-5 font-serif text-3xl" : "mb-5 text-2xl font-bold"}>
                Floral services
              </h2>
              <div className="space-y-3">
                {lines(details.services).map((line, index) => (
                  <p key={index} className="leading-7 opacity-80">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {details.eventTypes ? (
            <section>
              <h2 className={elegant ? "mb-5 font-serif text-3xl" : "mb-5 text-2xl font-bold"}>
                Weddings &amp; celebrations
              </h2>
              <div className="space-y-3">
                {lines(details.eventTypes).map((line, index) => (
                  <p key={index} className="leading-7 opacity-80">
                    {line}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {details.serviceArea ? (
            <section className="md:col-span-2">
              <h2 className={elegant ? "mb-4 font-serif text-3xl" : "mb-4 text-2xl font-bold"}>
                Where we work
              </h2>
              <p className="whitespace-pre-line leading-7 opacity-80">{details.serviceArea}</p>
            </section>
          ) : null}
        </div>

        <section
          className={
            elegant
              ? "bg-[#f3eee7] px-6 py-20 text-center"
              : "bg-slate-50 px-6 py-20 text-center"
          }
        >
          <h2 className={elegant ? "font-serif text-4xl" : "text-3xl font-bold"}>
            Let’s talk flowers
          </h2>
          <p className="mx-auto my-6 max-w-xl whitespace-pre-line leading-7 opacity-80">
            {details.consultationText ||
              "Tell us about your celebration. We’d love to hear what you have in mind."}
          </p>
          {editorPreview ? (
            <p className="mx-auto my-5 max-w-lg text-sm opacity-70">
              Consultation inquiry form is disabled in editor preview.
            </p>
          ) : (
            <BloomWeddingInquiryForm
              previewSlug={website.previewSlug}
              enabled={website.status === "live"}
            />
          )}
          {email ? (
            <a
              href={`mailto:${email}?subject=${encodeURIComponent("Wedding or event floral inquiry")}`}
              className="inline-flex min-h-12 items-center justify-center rounded-full px-8 py-3 font-semibold text-white"
              style={{ backgroundColor: website.storefrontTheme.primaryColor }}
            >
              Prefer email? Contact us directly
            </a>
          ) : (
            <p>Contact the florist to discuss your event.</p>
          )}
        </section>
      </main>

      {elegant ? (
        <BloomElegantFooter
          siteName={website.siteName}
          businessName={shop.businessName}
          tagline={website.storefrontTheme.tagline}
          basePath={base}
          aboutEnabled={website.aboutPage?.enabled !== false}
        />
      ) : null}
    </div>
  );
}
