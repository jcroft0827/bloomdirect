// src/app/api/websites/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import {
  normalizeBloomWebsiteHeroInfoCardContent,
  normalizeBloomWebsiteHomepageMerchandisingSections,
  normalizeBloomWebsiteHomepageSectionContent,
  normalizeBloomWebsiteHomepageSectionOrder,
  normalizeBloomWebsiteHomepageSectionVisibility,
  normalizeBloomWebsiteTrustPoints,
} from "@/lib/bloom-websites/storefront-content";
import {
  DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
  DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  normalizeBloomWebsiteLogoSize,
  normalizeStorefrontHexColor,
} from "@/lib/bloom-websites/storefront-theme";
import {
  buildBloomWebsiteHeroHeadline,
  buildBloomWebsiteHeroSubheadline,
  isBloomWebsiteGeneratedHeroHeadline,
} from "@/lib/bloom-websites/branding-copy";
import { normalizeBloomWebsiteHeroSlides } from "@/lib/bloom-websites/storefront-editor";

type BloomWebsiteLean = {
  _id: {
    toString(): string;
  };
  previewSlug: string;
  status: "preview" | "live" | "paused";
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}


export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const shop = await Shop.findById(session.user.id).select(
      [
        "businessName",
        "slug",
        "isSuspended",
        "branding.logo",
        "branding.bannerImage",
        "branding.bio",
        "branding.primaryColor",
      ].join(" "),
    );

    if (!shop) {
      return NextResponse.json({ error: "Shop not found." }, { status: 404 });
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "Suspended shops cannot create a BloomWebsite.",
          code: "SHOP_SUSPENDED",
        },
        { status: 403 },
      );
    }

    /*
     * Website creation is intentionally idempotent.
     *
     * If this florist already created a BloomWebsite,
     * return it rather than creating another one.
     */
    const existingWebsite = (await BloomWebsite.findOne({
      shop: shop._id,
    })
      .select("_id previewSlug status")
      .lean()) as BloomWebsiteLean | null;

    if (existingWebsite) {
      return NextResponse.json({
        success: true,
        created: false,
        website: {
          id: existingWebsite._id.toString(),
          previewSlug: existingWebsite.previewSlug,
          status: existingWebsite.status,
        },
      });
    }

    const businessSlug =
      typeof shop.slug === "string" && shop.slug.trim()
        ? shop.slug.trim().toLowerCase()
        : slugify(shop.businessName);

    /*
     * Shop.slug is already unique across GetBloomDirect.
     * The ObjectId fallback also protects older accounts
     * that may not have a usable slug.
     */
    const previewSlug =
      businessSlug || `florist-${shop._id.toString().slice(-8)}`;

    const primaryColor =
      shop.branding?.primaryColor && shop.branding.primaryColor !== "#000000"
        ? shop.branding.primaryColor
        : "#654783";

    try {
      const website = await BloomWebsite.create({
        shop: shop._id,

        previewSlug,

        siteName: shop.businessName,

        status: "preview",

        theme: "bloom-classic",

        branding: {
          logo: shop.branding?.logo || "",
          primaryColor,
          accentColor: "#37a156",
        },

        homepage: {
          heroHeadline: buildBloomWebsiteHeroHeadline(shop.businessName),

          heroSubheadline: buildBloomWebsiteHeroSubheadline(""),

          heroImage: shop.branding?.bannerImage || "",

          aboutText: shop.branding?.bio || "",
        },

        settings: {
          showPhone: true,
          showAddress: true,
          showSocialLinks: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          created: true,
          website: {
            id: website._id.toString(),
            previewSlug: website.previewSlug,
            status: website.status,
          },
        },
        { status: 201 },
      );
    } catch (error: unknown) {
      /*
       * Protect against two nearly simultaneous creation
       * requests. The unique Shop index remains the final
       * authority on one website per florist.
       */
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      ) {
        const website = (await BloomWebsite.findOne({
          shop: shop._id,
        })
          .select("_id previewSlug status")
          .lean()) as BloomWebsiteLean | null;

        if (website) {
          return NextResponse.json({
            success: true,
            created: false,
            website: {
              id: website._id.toString(),
              previewSlug: website.previewSlug,
              status: website.status,
            },
          });
        }
      }

      throw error;
    }
  } catch (error) {
    console.error("Failed to create BloomWebsite:", error);

    return NextResponse.json(
      {
        error: "Failed to create your BloomWebsite.",
      },
      { status: 500 },
    );
  }
}

type UpdateBloomWebsiteBrandingBody = {
  siteName?: unknown;
  theme?: unknown;

  branding?: {
    logo?: unknown;
    logoSize?: unknown;
    tagline?: unknown;
    primaryColor?: unknown;
    accentColor?: unknown;
  };

  homepage?: {
    heroHeadline?: unknown;
    heroSubheadline?: unknown;
    heroImage?: unknown;
    heroSlides?: unknown;
    heroInfoCard?: unknown;
    trustPoints?: unknown;
    aboutImage?: unknown;
    sectionContent?: unknown;
    sectionOrder?: unknown;
    sectionVisibility?: unknown;
    merchandisingSections?: unknown;
  };
};

function cleanBrandingString(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, maxLength);
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const body = (await request.json()) as UpdateBloomWebsiteBrandingBody;

    const siteName = cleanBrandingString(body.siteName, 120);

    if (!siteName) {
      return NextResponse.json(
        {
          error: "Your website needs a site name.",
        },
        {
          status: 400,
        },
      );
    }

    const themeWasProvided = typeof body.theme === "string";
    const theme =
      body.theme === "bloom-elegant" ? "bloom-elegant" : "bloom-classic";

    const brandingWasProvided = body.branding !== undefined;
    const logo = cleanBrandingString(body.branding?.logo, 2000);
    const tagline = cleanBrandingString(body.branding?.tagline, 180);
    const logoSize = normalizeBloomWebsiteLogoSize(
      typeof body.branding?.logoSize === "string" ? body.branding.logoSize : undefined,
    );

    const primaryColor = normalizeStorefrontHexColor(
      typeof body.branding?.primaryColor === "string"
        ? body.branding.primaryColor
        : "",
      DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
    );

    const accentColor = normalizeStorefrontHexColor(
      typeof body.branding?.accentColor === "string"
        ? body.branding.accentColor
        : "",
      DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
    );

    const heroHeadlineWasProvided =
      typeof body.homepage?.heroHeadline === "string";
    const heroHeadline = cleanBrandingString(
      body.homepage?.heroHeadline,
      160,
    );
    const heroSubheadlineWasProvided =
      typeof body.homepage?.heroSubheadline === "string";
    const heroSubheadline = cleanBrandingString(
      body.homepage?.heroSubheadline,
      300,
    );
    const heroImageWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "heroImage");
    const heroImage = cleanBrandingString(body.homepage?.heroImage, 2000);
    const heroSlidesWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "heroSlides");
    const heroSlides = normalizeBloomWebsiteHeroSlides(body.homepage?.heroSlides);
    const heroInfoCardWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "heroInfoCard");
    const heroInfoCard = normalizeBloomWebsiteHeroInfoCardContent(
      body.homepage?.heroInfoCard,
    );
    const trustPointsWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "trustPoints");
    const trustPoints = normalizeBloomWebsiteTrustPoints(
      body.homepage?.trustPoints,
    );
    const sectionContentWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "sectionContent");
    const aboutImageWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "aboutImage");
    const aboutImage = cleanBrandingString(body.homepage?.aboutImage, 2000);
    const sectionOrderWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "sectionOrder");
    const sectionOrder = normalizeBloomWebsiteHomepageSectionOrder(
      body.homepage?.sectionOrder,
    );
    const sectionVisibilityWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "sectionVisibility");
    const sectionVisibility = normalizeBloomWebsiteHomepageSectionVisibility(
      body.homepage?.sectionVisibility,
    );
    const merchandisingSectionsWasProvided =
      body.homepage !== undefined &&
      Object.prototype.hasOwnProperty.call(body.homepage, "merchandisingSections");
    const merchandisingSections = normalizeBloomWebsiteHomepageMerchandisingSections(
      body.homepage?.merchandisingSections,
    );

    const sectionContent = normalizeBloomWebsiteHomepageSectionContent(
      body.homepage?.sectionContent,
    );

    if (heroHeadlineWasProvided && !heroHeadline) {
      return NextResponse.json(
        { error: "Your homepage needs a hero headline." },
        { status: 400 },
      );
    }

    await connectToDB();

    const shop = await Shop.findById(session.user.id)
      .select("_id businessName isSuspended")
      .lean<{
        _id: unknown;
        businessName: string;
        isSuspended?: boolean;
      } | null>();

    if (!shop) {
      return NextResponse.json(
        {
          error: "Shop not found.",
        },
        {
          status: 404,
        },
      );
    }

    if (shop.isSuspended) {
      return NextResponse.json(
        {
          error: "Suspended shops cannot update their BloomWebsite.",
        },
        {
          status: 403,
        },
      );
    }

    const existingWebsite = await BloomWebsite.findOne({
      shop: session.user.id,
    })
      .select(
        "_id siteName theme branding.tagline homepage.heroHeadline homepage.heroSubheadline homepage.heroImage homepage.heroSlides",
      )
      .lean<{
        _id: unknown;
        siteName: string;
        theme?: "bloom-classic" | "bloom-elegant";
        branding?: {
          tagline?: string;
        };
        homepage?: {
          heroHeadline?: string;
          heroSubheadline?: string;
          heroImage?: string;
          heroSlides?: unknown;
        };
      } | null>();

    if (!existingWebsite) {
      return NextResponse.json(
        {
          error: "BloomWebsite not found.",
        },
        {
          status: 404,
        },
      );
    }

    const updateSet: Record<string, unknown> = { siteName };

    if (themeWasProvided) {
      updateSet.theme = theme;
    }

    if (brandingWasProvided) {
      updateSet["branding.logo"] = logo;
      updateSet["branding.logoSize"] = logoSize;
      updateSet["branding.tagline"] = tagline;
      updateSet["branding.primaryColor"] = primaryColor;
      updateSet["branding.accentColor"] = accentColor;
    }

    if (heroImageWasProvided) {
      updateSet["homepage.heroImage"] = heroImage;
    }

    if (heroSlidesWasProvided) {
      if (heroSlides.length === 0) {
        return NextResponse.json(
          { error: "Add at least one hero before saving your storefront." },
          { status: 400 },
        );
      }

      const primaryHero = heroSlides[0];
      updateSet["homepage.heroSlides"] = heroSlides;

      // Keep legacy single-hero fields synchronized for metadata and older surfaces.
      updateSet["homepage.heroHeadline"] = primaryHero.headline;
      updateSet["homepage.heroSubheadline"] = primaryHero.subheadline;
      updateSet["homepage.heroImage"] = primaryHero.imageUrl;
    }

    /*
     * Keep Bloom's generated hero copy in sync with Site Name, but never
     * overwrite a headline that has been customized outside the default
     * generation path.
     */
    const heroHeadlineIsGenerated =
      isBloomWebsiteGeneratedHeroHeadline(
        existingWebsite.homepage?.heroHeadline,
        existingWebsite.siteName,
      ) ||
      isBloomWebsiteGeneratedHeroHeadline(
        existingWebsite.homepage?.heroHeadline,
        shop.businessName,
      );

    if (heroHeadlineWasProvided) {
      updateSet["homepage.heroHeadline"] = heroHeadline;
    } else if (!heroSlidesWasProvided && heroHeadlineIsGenerated) {
      const generatedHeadline = buildBloomWebsiteHeroHeadline(siteName);
      updateSet["homepage.heroHeadline"] = generatedHeadline;

      const storedSlides = Array.isArray(existingWebsite.homepage?.heroSlides)
        ? existingWebsite.homepage.heroSlides
        : [];
      const firstStoredSlide =
        storedSlides[0] && typeof storedSlides[0] === "object"
          ? (storedSlides[0] as Record<string, unknown>)
          : null;

      if (
        firstStoredSlide &&
        firstStoredSlide.headline === existingWebsite.homepage?.heroHeadline
      ) {
        updateSet["homepage.heroSlides.0.headline"] = generatedHeadline;
      }
    }

    if (heroSubheadlineWasProvided) {
      updateSet["homepage.heroSubheadline"] = heroSubheadline;
    }

    if (heroInfoCardWasProvided) {
      updateSet["homepage.heroInfoCard"] = heroInfoCard;
    }

    if (trustPointsWasProvided) {
      updateSet["homepage.trustPoints"] = trustPoints;
    }

    if (aboutImageWasProvided) {
      updateSet["homepage.aboutImage"] = aboutImage;
    }

    if (sectionOrderWasProvided) {
      updateSet["homepage.sectionOrder"] = sectionOrder;
    }

    if (sectionVisibilityWasProvided) {
      updateSet["homepage.sectionVisibility"] = sectionVisibility;
    }

    if (merchandisingSectionsWasProvided) {
      updateSet["homepage.merchandisingSections"] = merchandisingSections;
    }

    if (sectionContentWasProvided) {
      updateSet["homepage.sectionContent"] = sectionContent;
    }

    const website = await BloomWebsite.findOneAndUpdate(
      {
        _id: existingWebsite._id,
        shop: session.user.id,
      },
      {
        $set: updateSet,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .select(
        [
          "_id",
          "previewSlug",
          "siteName",
          "theme",
          "branding.logo",
          "branding.logoSize",
          "branding.tagline",
          "branding.primaryColor",
          "branding.accentColor",
          "homepage.heroHeadline",
          "homepage.heroSubheadline",
          "homepage.heroImage",
          "homepage.heroSlides",
          "homepage.heroInfoCard",
          "homepage.trustPoints",
          "homepage.aboutImage",
          "homepage.sectionOrder",
          "homepage.sectionVisibility",
          "homepage.merchandisingSections",
          "homepage.sectionContent",
        ].join(" "),
      )
      .lean<{
        _id: {
          toString(): string;
        };

        previewSlug: string;
        siteName: string;
        theme?: "bloom-classic" | "bloom-elegant";

        branding?: {
          logo?: string;
          logoSize?: string;
          tagline?: string;
          primaryColor?: string;
          accentColor?: string;
        };

        homepage?: {
          heroHeadline?: string;
          heroSubheadline?: string;
          heroImage?: string;
          heroSlides?: unknown;
          heroInfoCard?: unknown;
          trustPoints?: unknown;
          aboutImage?: string;
          sectionOrder?: unknown;
          sectionVisibility?: unknown;
          merchandisingSections?: unknown;
          sectionContent?: unknown;
        };
      } | null>();

    if (!website) {
      return NextResponse.json(
        {
          error: "BloomWebsite not found.",
        },
        {
          status: 404,
        },
      );
    }

    return NextResponse.json({
      success: true,

      website: {
        id: website._id.toString(),

        previewSlug: website.previewSlug,

        siteName: website.siteName,
        theme: website.theme || "bloom-classic",

        branding: {
          logo: website.branding?.logo || "",
          logoSize: normalizeBloomWebsiteLogoSize(website.branding?.logoSize),

          tagline: website.branding?.tagline || "",

          primaryColor:
            website.branding?.primaryColor ||
            DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,

          accentColor:
            website.branding?.accentColor || DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
        },

        homepage: {
          heroHeadline: website.homepage?.heroHeadline || "",
          heroSubheadline: website.homepage?.heroSubheadline || "",
          heroImage: website.homepage?.heroImage || "",
          heroSlides: normalizeBloomWebsiteHeroSlides(
            website.homepage?.heroSlides,
            {
              headline: website.homepage?.heroHeadline || "",
              subheadline: website.homepage?.heroSubheadline || "",
              imageUrl: website.homepage?.heroImage || "",
            },
          ),
          heroInfoCard: normalizeBloomWebsiteHeroInfoCardContent(
            website.homepage?.heroInfoCard,
          ),
          trustPoints: normalizeBloomWebsiteTrustPoints(
            website.homepage?.trustPoints,
          ),
          aboutImage: website.homepage?.aboutImage || "",
          sectionOrder: normalizeBloomWebsiteHomepageSectionOrder(
            website.homepage?.sectionOrder,
          ),
          sectionVisibility: normalizeBloomWebsiteHomepageSectionVisibility(
            website.homepage?.sectionVisibility,
          ),
          merchandisingSections: normalizeBloomWebsiteHomepageMerchandisingSections(
            website.homepage?.merchandisingSections,
          ),
          sectionContent: normalizeBloomWebsiteHomepageSectionContent(
            website.homepage?.sectionContent,
          ),
        },
      },
    });
  } catch (error) {
    console.error("Failed to update BloomWebsite settings:", error);

    return NextResponse.json(
      {
        error: "Failed to save your BloomWebsite settings.",
      },
      {
        status: 500,
      },
    );
  }
}
