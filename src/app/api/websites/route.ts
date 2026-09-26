// src/app/api/websites/route.ts

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import Shop from "@/models/Shop";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import {
  DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
  DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,
  normalizeStorefrontHexColor,
} from "@/lib/bloom-websites/storefront-theme";

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

function buildHeroHeadline(businessName: string) {
  const headline = `Beautiful flowers, thoughtfully designed by ${businessName}.`;

  if (headline.length <= 160) {
    return headline;
  }

  return `Beautiful flowers from ${businessName}.`.slice(0, 160);
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
          heroHeadline: buildHeroHeadline(shop.businessName),

          heroSubheadline:
            "Fresh flowers for life's meaningful moments, designed and delivered by your local florist.",

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

  branding?: {
    logo?: unknown;
    tagline?: unknown;
    primaryColor?: unknown;
    accentColor?: unknown;
  };

  homepage?: {
    heroImage?: unknown;
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

    const logo = cleanBrandingString(body.branding?.logo, 2000);

    const tagline = cleanBrandingString(body.branding?.tagline, 180);

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

    const heroImage = cleanBrandingString(body.homepage?.heroImage, 2000);

    await connectToDB();

    const shop = await Shop.findById(session.user.id)
      .select("_id isSuspended")
      .lean<{
        _id: unknown;
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

    const website = await BloomWebsite.findOneAndUpdate(
      {
        shop: session.user.id,
      },
      {
        $set: {
          siteName,

          "branding.logo": logo,

          "branding.tagline": tagline,

          "branding.primaryColor": primaryColor,

          "branding.accentColor": accentColor,

          "homepage.heroImage": heroImage,
        },
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
          "branding.logo",
          "branding.tagline",
          "branding.primaryColor",
          "branding.accentColor",
          "homepage.heroImage",
        ].join(" "),
      )
      .lean<{
        _id: {
          toString(): string;
        };

        previewSlug: string;
        siteName: string;

        branding?: {
          logo?: string;
          tagline?: string;
          primaryColor?: string;
          accentColor?: string;
        };

        homepage?: {
          heroImage?: string;
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

        branding: {
          logo: website.branding?.logo || "",

          tagline: website.branding?.tagline || "",

          primaryColor:
            website.branding?.primaryColor ||
            DEFAULT_BLOOM_WEBSITE_PRIMARY_COLOR,

          accentColor:
            website.branding?.accentColor || DEFAULT_BLOOM_WEBSITE_ACCENT_COLOR,
        },

        homepage: {
          heroImage: website.homepage?.heroImage || "",
        },
      },
    });
  } catch (error) {
    console.error("Failed to update BloomWebsite branding:", error);

    return NextResponse.json(
      {
        error: "Failed to save your BloomWebsite branding.",
      },
      {
        status: 500,
      },
    );
  }
}
