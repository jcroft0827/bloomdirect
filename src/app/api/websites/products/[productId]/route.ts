// src/app/api/websites/products/[productId]/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { parseBloomWebsiteProductRecipe } from "@/lib/bloom-websites/productRecipes";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";
import Shop from "@/models/Shop";

type RouteContext = {
  params: Promise<{
    productId: string;
  }>;
};

type UpdateProductBody = {
  sku?: unknown;

  name?: unknown;
  shortDescription?: unknown;
  description?: unknown;

  category?: unknown;
  occasions?: unknown;
  tags?: unknown;

  imageUrl?: unknown;
  galleryImages?: unknown;

  standardPrice?: unknown;

  deluxeEnabled?: unknown;
  deluxePrice?: unknown;

  premiumEnabled?: unknown;
  premiumPrice?: unknown;

  standardTierImageUrl?: unknown;
  deluxeTierImageUrl?: unknown;
  premiumTierImageUrl?: unknown;

  standardRecipe?: unknown;
  deluxeRecipe?: unknown;
  premiumRecipe?: unknown;

  allowsSubstitutions?: unknown;
  arrangementNoteMode?: unknown;
  arrangementNoteText?: unknown;
  localOnly?: unknown;
  taxable?: unknown;
  taxRatePercent?: unknown;

  trackInventory?: unknown;
  inventoryQuantity?: unknown;

  availabilityType?: unknown;
  availabilityStartDate?: unknown;
  availabilityEndDate?: unknown;

  isFeatured?: unknown;
  isActive?: unknown;
  soldOut?: unknown;

  seoTitle?: unknown;
  seoDescription?: unknown;
  imageAltText?: unknown;
  allowIndexing?: unknown;
  canonicalUrl?: unknown;
  socialTitle?: unknown;
  socialDescription?: unknown;
  socialImageUrl?: unknown;

  availableAddons?: unknown;
};

function cleanStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string",
        )
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ];
}

function parsePrice(value: unknown): number | null {
  const price = Number(value);

  if (!Number.isFinite(price) || price < 0) {
    return null;
  }

  return Math.round(price * 100) / 100;
}

function parseOptionalTaxRate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "invalid" as const;
  return Math.round(rate * 1000) / 1000;
}

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const session =
      await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    const { productId } = await params;

    if (!productId) {
      return NextResponse.json(
        {
          error: "Product ID is required.",
        },
        {
          status: 400,
        },
      );
    }

    const body =
      (await request.json()) as UpdateProductBody;

    // ===============================
    // IDENTITY
    // ===============================

    const sku =
      typeof body.sku === "string"
        ? body.sku.trim()
        : "";

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const shortDescription =
      typeof body.shortDescription === "string"
        ? body.shortDescription.trim()
        : "";

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const category =
      typeof body.category === "string"
        ? body.category.trim()
        : "";

    const occasions =
      cleanStringArray(body.occasions);

    const tags =
      cleanStringArray(body.tags);

    const availableAddons =
      cleanStringArray(
        body.availableAddons,
      );

    // ===============================
    // MEDIA
    // ===============================

    const imageUrl =
      typeof body.imageUrl === "string"
        ? body.imageUrl.trim()
        : "";

    const galleryImages =
      cleanStringArray(
        body.galleryImages,
      );

    // ===============================
    // PRICING
    // ===============================

    const standardPrice =
      parsePrice(body.standardPrice);

    const deluxeEnabled =
      body.deluxeEnabled === true;

    const deluxePrice =
      deluxeEnabled
        ? parsePrice(body.deluxePrice)
        : null;

    const premiumEnabled =
      body.premiumEnabled === true;

    const premiumPrice =
      premiumEnabled
        ? parsePrice(body.premiumPrice)
        : null;

    const standardTierImageUrl =
      typeof body.standardTierImageUrl === "string"
        ? body.standardTierImageUrl.trim()
        : "";
    const deluxeTierImageUrl =
      typeof body.deluxeTierImageUrl === "string"
        ? body.deluxeTierImageUrl.trim()
        : "";
    const premiumTierImageUrl =
      typeof body.premiumTierImageUrl === "string"
        ? body.premiumTierImageUrl.trim()
        : "";

    const standardRecipe = parseBloomWebsiteProductRecipe(body.standardRecipe);
    const deluxeRecipe = parseBloomWebsiteProductRecipe(body.deluxeRecipe);
    const premiumRecipe = parseBloomWebsiteProductRecipe(body.premiumRecipe);

    // ===============================
    // ORDERING
    // ===============================

    const allowsSubstitutions =
      body.allowsSubstitutions !== false;

    const arrangementNoteMode =
      body.arrangementNoteMode === "custom" || body.arrangementNoteMode === "none"
        ? body.arrangementNoteMode
        : "default";
    const arrangementNoteText =
      typeof body.arrangementNoteText === "string"
        ? body.arrangementNoteText.trim()
        : "";

    if (arrangementNoteText.length > 1000) {
      return NextResponse.json(
        { error: "Arrangement & container note must be 1000 characters or fewer." },
        { status: 400 },
      );
    }

    if (arrangementNoteMode === "custom" && !arrangementNoteText) {
      return NextResponse.json(
        { error: "Enter a custom arrangement & container note or choose another note option." },
        { status: 400 },
      );
    }

    const localOnly =
      body.localOnly !== false;

    const taxable =
      body.taxable !== false;
    const taxRatePercent = parseOptionalTaxRate(body?.taxRatePercent);

    if (taxRatePercent === "invalid") {
      return NextResponse.json(
        { error: "Tax rate override must be between 0% and 100%." },
        { status: 400 },
      );
    }

    const isFeatured =
      body.isFeatured === true;

    const isActive =
      body.isActive !== false;

    const soldOut =
      body.soldOut === true;

    // ===============================
    // INVENTORY
    // ===============================

    const trackInventory =
      body.trackInventory === true;

    const inventoryQuantity =
      trackInventory
        ? Number(
            body.inventoryQuantity,
          )
        : 0;

    // ===============================
    // AVAILABILITY
    // ===============================

    const availabilityType =
      body.availabilityType ===
      "date_range"
        ? "date_range"
        : "always";

    const availabilityStartDate =
      availabilityType ===
        "date_range" &&
      typeof body.availabilityStartDate ===
        "string" &&
      body.availabilityStartDate
        ? body.availabilityStartDate
        : null;

    const availabilityEndDate =
      availabilityType ===
        "date_range" &&
      typeof body.availabilityEndDate ===
        "string" &&
      body.availabilityEndDate
        ? body.availabilityEndDate
        : null;

    // ===============================
    // SEO
    // ===============================

    const seoTitle =
      typeof body.seoTitle === "string"
        ? body.seoTitle.trim()
        : "";

    const seoDescription =
      typeof body.seoDescription ===
      "string"
        ? body.seoDescription.trim()
        : "";

    const imageAltText =
      typeof body.imageAltText ===
      "string"
        ? body.imageAltText.trim()
        : "";

    const allowIndexing =
      body.allowIndexing !== false;

    const canonicalUrl =
      typeof body.canonicalUrl ===
      "string"
        ? body.canonicalUrl.trim()
        : "";

    const socialTitle =
      typeof body.socialTitle ===
      "string"
        ? body.socialTitle.trim()
        : "";

    const socialDescription =
      typeof body.socialDescription ===
      "string"
        ? body.socialDescription.trim()
        : "";

    const socialImageUrl =
      typeof body.socialImageUrl ===
      "string"
        ? body.socialImageUrl.trim()
        : "";

    // ===============================
    // VALIDATION
    // ===============================

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Product name is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (name.length > 160) {
      return NextResponse.json(
        {
          error:
            "Product name cannot exceed 160 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (sku.length > 100) {
      return NextResponse.json(
        {
          error:
            "SKU cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      shortDescription.length > 500
    ) {
      return NextResponse.json(
        {
          error:
            "Short description cannot exceed 500 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (description.length > 3000) {
      return NextResponse.json(
        {
          error:
            "Description cannot exceed 3,000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!category) {
      return NextResponse.json(
        {
          error:
            "Category is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (standardPrice === null) {
      return NextResponse.json(
        {
          error:
            "Enter a valid Standard price.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      deluxeEnabled &&
      deluxePrice === null
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid Deluxe price.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      premiumEnabled &&
      premiumPrice === null
    ) {
      return NextResponse.json(
        {
          error:
            "Enter a valid Premium price.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      trackInventory &&
      (!Number.isInteger(
        inventoryQuantity,
      ) ||
        inventoryQuantity < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Inventory quantity must be a whole number of 0 or greater.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      availabilityType ===
        "date_range" &&
      (!availabilityStartDate ||
        !availabilityEndDate)
    ) {
      return NextResponse.json(
        {
          error:
            "Start and end dates are required for seasonal availability.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      availabilityType ===
        "date_range" &&
      availabilityStartDate &&
      availabilityEndDate &&
      new Date(
        availabilityEndDate,
      ) <
        new Date(
          availabilityStartDate,
        )
    ) {
      return NextResponse.json(
        {
          error:
            "Availability end date must be after the start date.",
        },
        {
          status: 400,
        },
      );
    }

    if (seoTitle.length > 70) {
      return NextResponse.json(
        {
          error:
            "SEO title cannot exceed 70 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      seoDescription.length > 170
    ) {
      return NextResponse.json(
        {
          error:
            "SEO description cannot exceed 170 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      imageAltText.length > 250
    ) {
      return NextResponse.json(
        {
          error:
            "Image description cannot exceed 250 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      socialTitle.length > 100
    ) {
      return NextResponse.json(
        {
          error:
            "Social sharing title cannot exceed 100 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      socialDescription.length >
      250
    ) {
      return NextResponse.json(
        {
          error:
            "Social sharing description cannot exceed 250 characters.",
        },
        {
          status: 400,
        },
      );
    }

    // ===============================
    // OWNERSHIP
    // ===============================

    await connectToDB();

    const shop =
      await Shop.findById(
        session.user.id,
      ).select("_id isSuspended");

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
          error:
            "Suspended shops cannot update website products.",
        },
        {
          status: 403,
        },
      );
    }

    const website =
      await BloomWebsite.findOne({
        shop: shop._id,
      }).select("_id");

    if (!website) {
      return NextResponse.json(
        {
          error:
            "BloomWebsite not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ===============================
    // ADD-ON OWNERSHIP
    // ===============================

    /*
     * Never trust add-on IDs coming from
     * the browser.
     *
     * Every manually attached add-on must:
     *
     * 1. exist,
     * 2. belong to this shop,
     * 3. belong to this BloomWebsite,
     * 4. be non-universal.
     *
     * Universal add-ons are resolved
     * automatically and should not be stored
     * in product.availableAddons.
     */
    let validAvailableAddonIds:
      string[] = [];

    if (
      availableAddons.length > 0
    ) {
      const matchingAddons =
        await BloomWebsiteAddon.find({
          _id: {
            $in: availableAddons,
          },

          shop: shop._id,

          website: website._id,

          isUniversal: false,
        })
          .select("_id")
          .lean();

      validAvailableAddonIds =
        matchingAddons.map(
          (addon) =>
            String(
              (
                addon as {
                  _id: unknown;
                }
              )._id,
            ),
        );
    }

    /*
     * Critical ownership check:
     *
     * productId alone is not enough.
     *
     * The product must belong to BOTH the
     * authenticated shop and its BloomWebsite.
     */
    const product =
      await BloomWebsiteProduct.findOne({
        _id: productId,

        shop: shop._id,

        website: website._id,
      });

    if (!product) {
      return NextResponse.json(
        {
          error:
            "Product not found.",
        },
        {
          status: 404,
        },
      );
    }

    // ===============================
    // PRICING TIERS
    // ===============================

    const pricingTiers = [
      {
        label: "standard",
        price: standardPrice,
        enabled: true,
        imageUrl: standardTierImageUrl,
        recipe: standardRecipe,
      },
    ];

    if (
      deluxeEnabled &&
      deluxePrice !== null
    ) {
      pricingTiers.push({
        label: "deluxe",
        price: deluxePrice,
        enabled: true,
        imageUrl: deluxeTierImageUrl,
        recipe: deluxeRecipe,
      });
    }

    if (
      premiumEnabled &&
      premiumPrice !== null
    ) {
      pricingTiers.push({
        label: "premium",
        price: premiumPrice,
        enabled: true,
        imageUrl: premiumTierImageUrl,
        recipe: premiumRecipe,
      });
    }

    // ===============================
    // UPDATE
    // ===============================

    /*
     * Slug is intentionally NOT updated.
     *
     * Changing the product's display name
     * should not silently change its public
     * URL.
     */
    product.sku = sku;

    product.name = name;

    product.shortDescription =
      shortDescription;

    product.description =
      description;

    product.category = category;

    product.occasions =
      occasions;

    product.tags = tags;

    product.imageUrl =
      imageUrl;

    product.galleryImages =
      galleryImages;

    product.pricingTiers =
      pricingTiers;

    product.allowsSubstitutions =
      allowsSubstitutions;

    product.arrangementContainerNote = {
      mode: arrangementNoteMode,
      text: arrangementNoteMode === "custom" ? arrangementNoteText : "",
    };

    product.localOnly =
      localOnly;

    product.taxable = taxable;
    product.taxRatePercent = taxRatePercent;

    product.inventory = {
      trackInventory,

      quantity:
        inventoryQuantity,
    };

    product.availability = {
      type: availabilityType,

      startDate:
        availabilityStartDate,

      endDate:
        availabilityEndDate,
    };

    /*
     * Only validated, shop-owned,
     * non-universal add-ons are stored.
     */
    product.availableAddons =
      validAvailableAddonIds;

    product.isFeatured =
      isFeatured;

    product.isActive =
      isActive;

    product.soldOut =
      soldOut;

    product.seo = {
      title: seoTitle,

      description:
        seoDescription,

      imageAltText,

      allowIndexing,

      canonicalUrl,

      socialTitle,

      socialDescription,

      socialImageUrl,
    };

    await product.save();

    return NextResponse.json({
      success: true,

      product: {
        id: product._id.toString(),

        name: product.name,

        slug: product.slug,

        availableAddons:
          product.availableAddons.map(
            (addonId: {
              toString(): string;
            }) =>
              addonId.toString(),
          ),

        updatedAt:
          product.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "Update BloomWebsite product error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to update product.",
      },
      {
        status: 500,
      },
    );
  }
}