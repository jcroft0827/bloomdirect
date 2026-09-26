// src/app/api/websites/addons/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import Shop from "@/models/Shop";

type CreateAddonBody = {
  sku?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;

  imageUrl?: unknown;
  galleryImages?: unknown;
  imageAltText?: unknown;

  price?: unknown;
  taxable?: unknown;
  taxRatePercent?: unknown;

  isUniversal?: unknown;
  eligibleProductCategories?: unknown;
  maxQuantity?: unknown;

  trackInventory?: unknown;
  inventoryQuantity?: unknown;

  availabilityType?: unknown;
  availabilityStartDate?: unknown;
  availabilityEndDate?: unknown;

  isActive?: unknown;
  soldOut?: unknown;
  sortOrder?: unknown;
};

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanStringArray(
  value: unknown,
): string[] {
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

function parseOptionalTaxRate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const rate = Number(value);
  if (!Number.isFinite(rate) || rate < 0 || rate > 100) return "invalid" as const;
  return Math.round(rate * 1000) / 1000;
}

export async function POST(request: Request) {
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

    const body =
      (await request.json()) as CreateAddonBody;

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

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : "";

    const category =
      typeof body.category === "string" &&
      body.category.trim()
        ? body.category.trim()
        : "Extras";

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

    const imageAltText =
      typeof body.imageAltText === "string"
        ? body.imageAltText.trim()
        : "";

    // ===============================
    // PRICING
    // ===============================

    const price = Number(body.price);

    const taxable =
      body.taxable !== false;
    const taxRatePercent = parseOptionalTaxRate(body?.taxRatePercent);

    if (taxRatePercent === "invalid") {
      return NextResponse.json(
        { error: "Tax rate override must be between 0% and 100%." },
        { status: 400 },
      );
    }

    // ===============================
    // AVAILABILITY RULES
    // ===============================

    const isUniversal =
      body.isUniversal === true;

    const eligibleProductCategories =
      cleanStringArray(
        body.eligibleProductCategories,
      );

    const maxQuantity = Number(
      body.maxQuantity ?? 1,
    );

    // ===============================
    // INVENTORY
    // ===============================

    const trackInventory =
      body.trackInventory === true;

    const inventoryQuantity =
      trackInventory
        ? Number(
            body.inventoryQuantity ?? 0,
          )
        : 0;

    // ===============================
    // SEASONAL AVAILABILITY
    // ===============================

    const availabilityType =
      body.availabilityType ===
      "date_range"
        ? "date_range"
        : "always";

    const availabilityStartDate =
      availabilityType === "date_range" &&
      typeof body.availabilityStartDate ===
        "string" &&
      body.availabilityStartDate
        ? body.availabilityStartDate
        : null;

    const availabilityEndDate =
      availabilityType === "date_range" &&
      typeof body.availabilityEndDate ===
        "string" &&
      body.availabilityEndDate
        ? body.availabilityEndDate
        : null;

    // ===============================
    // STATUS
    // ===============================

    const isActive =
      body.isActive !== false;

    const soldOut =
      body.soldOut === true;

    const requestedSortOrder =
      Number(body.sortOrder);

    // ===============================
    // VALIDATION
    // ===============================

    if (!name) {
      return NextResponse.json(
        {
          error:
            "Add-on name is required.",
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
            "Add-on name cannot exceed 160 characters.",
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

    if (description.length > 1000) {
      return NextResponse.json(
        {
          error:
            "Description cannot exceed 1000 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (category.length > 120) {
      return NextResponse.json(
        {
          error:
            "Category cannot exceed 120 characters.",
        },
        {
          status: 400,
        },
      );
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json(
        {
          error:
            "Enter a valid add-on price.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !Number.isInteger(maxQuantity) ||
      maxQuantity < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Maximum quantity must be a whole number of at least 1.",
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
      new Date(availabilityEndDate) <
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

    if (imageAltText.length > 250) {
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

    // ===============================
    // OWNERSHIP
    // ===============================

    await connectToDB();

    const shop = await Shop.findById(
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
            "Suspended shops cannot create website add-ons.",
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
            "Create your BloomWebsite before adding add-ons.",
        },
        {
          status: 404,
        },
      );
    }

    // ===============================
    // UNIQUE SLUG
    // ===============================

    const baseSlug =
      createSlug(name) || "addon";

    let slug = baseSlug;
    let suffix = 2;

    while (
      await BloomWebsiteAddon.exists({
        website: website._id,
        slug,
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    // ===============================
    // SORT ORDER
    // ===============================

    let sortOrder = 0;

    if (
      Number.isFinite(
        requestedSortOrder,
      ) &&
      requestedSortOrder >= 0
    ) {
      sortOrder =
        requestedSortOrder;
    } else {
      const lastAddon =
        await BloomWebsiteAddon.findOne({
          website: website._id,
        })
          .sort({
            sortOrder: -1,
            createdAt: -1,
          })
          .select("sortOrder")
          .lean<{
            sortOrder?: number;
          }>();

      sortOrder =
        typeof lastAddon?.sortOrder ===
        "number"
          ? lastAddon.sortOrder + 1
          : 0;
    }

    // ===============================
    // CREATE
    // ===============================

    const addon =
      await BloomWebsiteAddon.create({
        shop: shop._id,
        website: website._id,

        sku,
        name,
        slug,
        description,
        category,

        imageUrl,
        galleryImages,
        imageAltText,

        price,
        taxable,
        taxRatePercent,

        isUniversal,

        /*
         * Category restrictions only make sense
         * for universal add-ons.
         */
        eligibleProductCategories:
          isUniversal
            ? eligibleProductCategories
            : [],

        maxQuantity,

        inventory: {
          trackInventory,
          quantity:
            inventoryQuantity,
        },

        availability: {
          type: availabilityType,
          startDate:
            availabilityStartDate,
          endDate:
            availabilityEndDate,
        },

        isActive,
        soldOut,
        sortOrder,
      });

    return NextResponse.json(
      {
        success: true,

        addon: {
          id: addon._id.toString(),
          name: addon.name,
          slug: addon.slug,
          price: addon.price,
          imageUrl: addon.imageUrl,
          isUniversal:
            addon.isUniversal,
        },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error(
      "Create BloomWebsite add-on error:",
      error,
    );

    return NextResponse.json(
      {
        error:
          "Unable to create add-on.",
      },
      {
        status: 500,
      },
    );
  }
}