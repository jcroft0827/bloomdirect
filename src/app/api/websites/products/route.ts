// src/app/api/websites/products/route.ts

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import { parseBloomWebsiteProductRecipe } from "@/lib/bloom-websites/productRecipes";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parsePrice(value: unknown) {
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

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = await request.json();

    const name = typeof body?.name === "string" ? body.name.trim() : "";

    const description =
      typeof body?.description === "string" ? body.description.trim() : "";

    const category =
      typeof body?.category === "string" ? body.category.trim() : "";

    const imageUrl =
      typeof body?.imageUrl === "string" ? body.imageUrl.trim() : "";

    const sku = typeof body?.sku === "string" ? body.sku.trim() : "";

    const shortDescription =
      typeof body?.shortDescription === "string"
        ? body.shortDescription.trim()
        : "";

    const occasions = Array.isArray(body?.occasions)
      ? body.occasions
          .filter(
            (occasion: unknown): occasion is string =>
              typeof occasion === "string",
          )
          .map((occasion: string) => occasion.trim())
          .filter(Boolean)
      : [];

    const tags = Array.isArray(body?.tags)
      ? body.tags
          .filter((tag: unknown): tag is string => typeof tag === "string")
          .map((tag: string) => tag.trim())
          .filter(Boolean)
      : [];

    const galleryImages = Array.isArray(body?.galleryImages)
      ? body.galleryImages.filter(
          (image: unknown): image is string =>
            typeof image === "string" && image.trim().length > 0,
        )
      : [];

    const taxable = body?.taxable !== false;
    const taxRatePercent = parseOptionalTaxRate(body?.taxRatePercent);

    if (taxRatePercent === "invalid") {
      return NextResponse.json(
        { error: "Tax rate override must be between 0% and 100%." },
        { status: 400 },
      );
    }

    const trackInventory = body?.trackInventory === true;

    const inventoryQuantity = trackInventory
      ? Number(body?.inventoryQuantity)
      : 0;

    const availabilityType =
      body?.availabilityType === "date_range" ? "date_range" : "always";

    const availabilityStartDate =
      availabilityType === "date_range" &&
      typeof body?.availabilityStartDate === "string" &&
      body.availabilityStartDate
        ? body.availabilityStartDate
        : null;

    const availabilityEndDate =
      availabilityType === "date_range" &&
      typeof body?.availabilityEndDate === "string" &&
      body.availabilityEndDate
        ? body.availabilityEndDate
        : null;

    const seoTitle =
      typeof body?.seoTitle === "string" ? body.seoTitle.trim() : "";

    const seoDescription =
      typeof body?.seoDescription === "string"
        ? body.seoDescription.trim()
        : "";

    const imageAltText =
      typeof body?.imageAltText === "string" ? body.imageAltText.trim() : "";

    const allowIndexing = body?.allowIndexing !== false;

    const canonicalUrl =
      typeof body?.canonicalUrl === "string" ? body.canonicalUrl.trim() : "";

    const socialTitle =
      typeof body?.socialTitle === "string" ? body.socialTitle.trim() : "";

    const socialDescription =
      typeof body?.socialDescription === "string"
        ? body.socialDescription.trim()
        : "";

    const socialImageUrl =
      typeof body?.socialImageUrl === "string"
        ? body.socialImageUrl.trim()
        : "";

    const standardPrice = parsePrice(body?.standardPrice);

    const deluxePrice =
      body?.deluxeEnabled === true ? parsePrice(body?.deluxePrice) : null;

    const premiumPrice =
      body?.premiumEnabled === true ? parsePrice(body?.premiumPrice) : null;

    const standardRecipe = parseBloomWebsiteProductRecipe(body?.standardRecipe);
    const deluxeRecipe = parseBloomWebsiteProductRecipe(body?.deluxeRecipe);
    const premiumRecipe = parseBloomWebsiteProductRecipe(body?.premiumRecipe);

    if (!name) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 },
      );
    }

    if (name.length > 160) {
      return NextResponse.json(
        {
          error: "Product name cannot exceed 160 characters.",
        },
        { status: 400 },
      );
    }

    if (description.length > 3000) {
      return NextResponse.json(
        {
          error: "Description cannot exceed 3,000 characters.",
        },
        { status: 400 },
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required." },
        { status: 400 },
      );
    }

    if (category.length > 120) {
      return NextResponse.json(
        {
          error: "Category cannot exceed 120 characters.",
        },
        { status: 400 },
      );
    }

    if (standardPrice === null) {
      return NextResponse.json(
        {
          error: "A valid Standard price is required.",
        },
        { status: 400 },
      );
    }

    if (body?.deluxeEnabled === true && deluxePrice === null) {
      return NextResponse.json(
        {
          error: "Enter a valid Deluxe price.",
        },
        { status: 400 },
      );
    }

    if (body?.premiumEnabled === true && premiumPrice === null) {
      return NextResponse.json(
        {
          error: "Enter a valid Premium price.",
        },
        { status: 400 },
      );
    }

    if (sku.length > 100) {
      return NextResponse.json(
        {
          error: "SKU cannot exceed 100 characters.",
        },
        { status: 400 },
      );
    }

    if (shortDescription.length > 500) {
      return NextResponse.json(
        {
          error: "Short description cannot exceed 500 characters.",
        },
        { status: 400 },
      );
    }

    if (
      trackInventory &&
      (!Number.isInteger(inventoryQuantity) || inventoryQuantity < 0)
    ) {
      return NextResponse.json(
        {
          error: "Inventory quantity must be a whole number of 0 or greater.",
        },
        { status: 400 },
      );
    }

    if (
      availabilityType === "date_range" &&
      (!availabilityStartDate || !availabilityEndDate)
    ) {
      return NextResponse.json(
        {
          error: "Start and end dates are required for seasonal availability.",
        },
        { status: 400 },
      );
    }

    if (
      availabilityType === "date_range" &&
      availabilityStartDate &&
      availabilityEndDate &&
      new Date(availabilityEndDate) < new Date(availabilityStartDate)
    ) {
      return NextResponse.json(
        {
          error: "Availability end date must be after the start date.",
        },
        { status: 400 },
      );
    }

    if (seoTitle.length > 70) {
      return NextResponse.json(
        {
          error: "SEO title cannot exceed 70 characters.",
        },
        { status: 400 },
      );
    }

    if (seoDescription.length > 170) {
      return NextResponse.json(
        {
          error: "SEO description cannot exceed 170 characters.",
        },
        { status: 400 },
      );
    }

    await connectToDB();

    const website = await BloomWebsite.findOne({
      shop: session.user.id,
    }).select("_id");

    if (!website) {
      return NextResponse.json(
        {
          error: "Create your BloomWebsite before adding products.",
        },
        { status: 404 },
      );
    }

    /*
     * Build a unique product slug within this website.
     *
     * If the florist creates:
     *
     * Designer's Choice
     * Designer's Choice
     *
     * the resulting slugs become:
     *
     * designers-choice
     * designers-choice-2
     */
    const baseSlug = slugify(name) || "product";

    let slug = baseSlug;
    let suffix = 2;

    while (
      await BloomWebsiteProduct.exists({
        website: website._id,
        slug,
      })
    ) {
      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    const pricingTiers = [
      {
        label: "standard",
        price: standardPrice,
        enabled: true,
        recipe: standardRecipe,
      },
    ];

    if (body?.deluxeEnabled === true && deluxePrice !== null) {
      pricingTiers.push({
        label: "deluxe",
        price: deluxePrice,
        enabled: true,
        recipe: deluxeRecipe,
      });
    }

    if (body?.premiumEnabled === true && premiumPrice !== null) {
      pricingTiers.push({
        label: "premium",
        price: premiumPrice,
        enabled: true,
        recipe: premiumRecipe,
      });
    }

    const product = await BloomWebsiteProduct.create({
      shop: session.user.id,
      website: website._id,

      sku,

      name,
      slug,

      shortDescription,
      description,

      category,
      occasions,
      tags,

      imageUrl,
      galleryImages,

      pricingTiers,

      allowsSubstitutions: body?.allowsSubstitutions !== false,

      localOnly: body?.localOnly !== false,

      taxable,
      taxRatePercent,

      inventory: {
        trackInventory,
        quantity: inventoryQuantity,
      },

      availability: {
        type: availabilityType,
        startDate: availabilityStartDate,
        endDate: availabilityEndDate,
      },

      seo: {
        title: seoTitle,
        description: seoDescription,

        imageAltText,
        allowIndexing,
        canonicalUrl,

        socialTitle,
        socialDescription,
        socialImageUrl,
      },

      isActive: body?.isActive !== false,

      isFeatured: body?.isFeatured === true,

      soldOut: false,
    });

    return NextResponse.json(
      {
        success: true,

        product: {
          id: product._id.toString(),
          name: product.name,
          slug: product.slug,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create BloomWebsite product:", error);

    return NextResponse.json(
      {
        error: "Failed to create product.",
      },
      { status: 500 },
    );
  }
}
