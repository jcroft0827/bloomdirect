import BloomWebsiteThemeSurface from "@/components/websites/storefront/BloomWebsiteThemeSurface";
import { normalizeBloomWebsiteStorefrontTheme } from "@/lib/bloom-websites/storefront-theme";
import BloomWebsite from "@/models/BloomWebsite";
import { connectToDB } from "@/lib/mongoose";
import type { BloomWebsiteBackgroundStyle } from "@/types/bloom-website";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import authOptions from "@/lib/auth";

type PageProps = {
  params: Promise<{
    previewSlug: string;
  }>;
};

type WebsiteLean = {
  shop?: unknown;

  siteName?: string;

  theme?: string;

  branding?: {
    logo?: string;
    primaryColor?: string;
    accentColor?: string;
    tagline?: string;
    backgroundStyle?: string;
  };
};

const backgroundStyles: Array<{
  value: BloomWebsiteBackgroundStyle;
  label: string;
  description: string;
}> = [
  {
    value: "clean",
    label: "Clean",
    description: "Crisp, neutral and product-focused.",
  },
  {
    value: "soft_floral",
    label: "Soft Floral",
    description: "Subtle floral linework with soft brand-color atmosphere.",
  },
  {
    value: "botanical",
    label: "Botanical",
    description: "Elegant greenery-inspired linework for an organic feel.",
  },
  {
    value: "romantic",
    label: "Romantic",
    description: "Soft flowing color and delicate floral movement.",
  },
  {
    value: "minimal_texture",
    label: "Minimal Texture",
    description:
      "A restrained pattern that adds depth without obvious florals.",
  },
];

export default async function ThemePreviewPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { previewSlug } = await params;

  await connectToDB();

  const website = await BloomWebsite.findOne({
    previewSlug,
    shop: session.user.id,
  })
    .select(
      [
        "shop",
        "siteName",
        "theme",
        "branding.logo",
        "branding.primaryColor",
        "branding.accentColor",
        "branding.tagline",
        "branding.backgroundStyle",
      ].join(" "),
    )
    .lean<WebsiteLean | null>();

  if (!website) {
    notFound();
  }

  const baseTheme = normalizeBloomWebsiteStorefrontTheme({
    themeName: website.theme,
    logo: website.branding?.logo,
    primaryColor: website.branding?.primaryColor,
    accentColor: website.branding?.accentColor,
    tagline: website.branding?.tagline,
    backgroundStyle: website.branding?.backgroundStyle,
  });

  return (
    <main className="min-h-screen bg-gray-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
            BloomWebsites Theme System
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-950 sm:text-4xl">
            {website.siteName || "Your Website"}
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            These are the five curated background treatments available to
            BloomWebsites. Each treatment automatically inherits the
            florist&apos;s primary and accent colors.
          </p>
        </div>

        <div className="space-y-8">
          {backgroundStyles.map((option) => {
            const theme = {
              ...baseTheme,
              backgroundStyle: option.value,
            };

            return (
              <section
                key={option.value}
                className="overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-sm"
              >
                <div className="border-b border-gray-200 bg-white px-5 py-4 sm:px-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="font-semibold text-gray-950">
                        {option.label}
                      </h2>

                      <p className="mt-1 text-sm text-gray-500">
                        {option.description}
                      </p>
                    </div>

                    <code className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600">
                      {option.value}
                    </code>
                  </div>
                </div>

                <BloomWebsiteThemeSurface theme={theme} className="min-h-0">
                  <ThemeExample
                    siteName={website.siteName || "Your Flower Shop"}
                    theme={theme}
                  />
                </BloomWebsiteThemeSurface>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}

function ThemeExample({
  siteName,
  theme,
}: {
  siteName: string;
  theme: ReturnType<typeof normalizeBloomWebsiteStorefrontTheme>;
}) {
  return (
    <div className="px-5 py-10 sm:px-8 sm:py-14 lg:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-5 border-b border-black/5 pb-5">
          <div className="flex min-w-0 items-center gap-3">
            {theme.logo ? (
              <img
                src={theme.logo}
                alt=""
                className="h-11 w-11 rounded-xl object-contain"
              />
            ) : (
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl text-sm font-bold"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: theme.primaryForeground,
                }}
              >
                {siteName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-950">{siteName}</p>

              <p className="text-xs text-gray-500">Local Florist</p>
            </div>
          </div>

          <button
            type="button"
            className="rounded-full px-5 py-2.5 text-sm font-semibold shadow-sm"
            style={{
              backgroundColor: theme.primaryColor,
              color: theme.primaryForeground,
            }}
          >
            Shop Flowers
          </button>
        </div>

        <div className="grid gap-8 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: `${theme.accentColor}18`,
                color: theme.accentColor,
              }}
            >
              Locally designed
            </div>

            <h3 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              Flowers made for life&apos;s meaningful moments.
            </h3>

            <p className="mt-5 max-w-xl text-base leading-7 text-gray-600">
              {theme.tagline ||
                "Beautiful flowers, thoughtfully designed and delivered by your local florist."}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                className="rounded-full px-6 py-3 text-sm font-semibold shadow-sm"
                style={{
                  backgroundColor: theme.primaryColor,
                  color: theme.primaryForeground,
                }}
              >
                Shop Flowers
              </button>

              <button
                type="button"
                className="rounded-full border px-6 py-3 text-sm font-semibold"
                style={{
                  borderColor: `${theme.accentColor}55`,
                  color: theme.accentColor,
                  backgroundColor: `${theme.accentColor}0d`,
                }}
              >
                Same-Day Delivery
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <ThemeProductCard label="Birthday" theme={theme} />

            <ThemeProductCard label="Anniversary" theme={theme} />

            <ThemeProductCard label="Sympathy" theme={theme} />

            <ThemeProductCard label="Just Because" theme={theme} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ThemeProductCard({
  label,
  theme,
}: {
  label: string;
  theme: ReturnType<typeof normalizeBloomWebsiteStorefrontTheme>;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/5 bg-white/80 shadow-sm backdrop-blur-sm">
      <div
        className="aspect-[4/3]"
        style={{
          background: `linear-gradient(
            135deg,
            ${theme.primaryColor}20,
            ${theme.accentColor}30
          )`,
        }}
      />

      <div className="p-4">
        <p className="text-sm font-semibold text-gray-950">{label}</p>

        <p className="mt-1 text-xs text-gray-500">Shop flowers</p>
      </div>
    </div>
  );
}
