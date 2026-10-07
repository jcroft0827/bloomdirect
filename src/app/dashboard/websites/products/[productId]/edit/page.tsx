// src/app/dashboard/websites/products/[productId]/edit/page.tsx

import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

import ProductForm, {
  type ProductFormInitialData,
} from "@/components/websites/products/ProductForm";
import authOptions from "@/lib/auth";
import { connectToDB } from "@/lib/mongoose";
import {
  parseBloomWebsiteProductRecipe,
  type BloomWebsiteProductRecipe,
} from "@/lib/bloom-websites/productRecipes";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

type PageProps = {
  params: Promise<{
    productId: string;
  }>;
};

type ProductLean = {
  _id: {
    toString(): string;
  };

  sku?: string;
  name?: string;
  shortDescription?: string;
  description?: string;

  category?: string;
  occasions?: string[];
  tags?: string[];

  imageUrl?: string;
  galleryImages?: string[];

  pricingTiers?: Array<{
    label?: string;
    price?: number;
    enabled?: boolean;
    imageUrl?: string;
    recipe?: BloomWebsiteProductRecipe;
  }>;

  allowsSubstitutions?: boolean;
  arrangementContainerNote?: {
    mode?: "default" | "custom" | "none";
    text?: string;
  };
  localOnly?: boolean;
  taxable?: boolean;
  taxRatePercent?: number | null;

  inventory?: {
    trackInventory?: boolean;
    quantity?: number;
  };

  availability?: {
    type?: string;
    startDate?: Date | string | null;
    endDate?: Date | string | null;
  };

  availableAddons?: Array<{
    toString(): string;
  }>;

  isFeatured?: boolean;
  isActive?: boolean;
  soldOut?: boolean;

  seo?: {
    title?: string;
    description?: string;
    imageAltText?: string;
    allowIndexing?: boolean;
    canonicalUrl?: string;
    socialTitle?: string;
    socialDescription?: string;
    socialImageUrl?: string;
  };
};

type AddonOptionLean = {
  _id: {
    toString(): string;
  };

  name?: string;
  price?: number;
  category?: string;
  imageUrl?: string;

  isUniversal?: boolean;

  eligibleProductCategories?: string[];
};

function formatDateForInput(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

export default async function EditProductPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { productId } = await params;

  await connectToDB();

  // ===============================
  // WEBSITE
  // ===============================

  /*
   * Find the authenticated shop's
   * BloomWebsite first.
   *
   * Everything below is scoped to this
   * website so shops can never load another
   * florist's products or add-ons.
   */
  const website = await BloomWebsite.findOne({
    shop: session.user.id,
  })
    .select("_id settings.arrangementContainerNote")
    .lean<{
      _id: unknown;
      settings?: {
        arrangementContainerNote?: string;
      };
    } | null>();

  if (!website) {
    notFound();
  }

  const websiteId = String(website._id);

  // ===============================
  // PRODUCT
  // ===============================

  const product = (await BloomWebsiteProduct.findOne({
    _id: productId,

    shop: session.user.id,

    website: websiteId,
  })
    .select(
      [
        "_id",

        "sku",
        "name",
        "shortDescription",
        "description",

        "category",
        "occasions",
        "tags",

        "imageUrl",
        "galleryImages",

        "pricingTiers",

        "allowsSubstitutions",
        "arrangementContainerNote",
        "localOnly",
        "taxable",
        "taxRatePercent",

        "inventory",
        "availability",

        "availableAddons",

        "isFeatured",
        "isActive",
        "soldOut",

        "seo",
      ].join(" "),
    )
    .lean()) as ProductLean | null;

  if (!product) {
    notFound();
  }

  // ===============================
  // ADD-ON OPTIONS
  // ===============================

  /*
   * Load the florist's active add-ons.
   *
   * ProductForm will use these in two ways:
   *
   * 1. Universal add-ons are displayed as
   *    automatically available according
   *    to their product-category rules.
   *
   * 2. Non-universal add-ons can be manually
   *    attached to this specific product.
   */
  const addonOptionsRaw = (await BloomWebsiteAddon.find({
    shop: session.user.id,

    website: websiteId,

    isActive: true,
  })
    .select(
      [
        "_id",
        "name",
        "price",
        "category",
        "imageUrl",
        "isUniversal",
        "eligibleProductCategories",
      ].join(" "),
    )
    .sort({
      isUniversal: -1,
      sortOrder: 1,
      createdAt: 1,
    })
    .lean()) as unknown as AddonOptionLean[];

  /*
   * Convert Mongoose values into plain,
   * serializable values before passing them
   * to the Client Component.
   */
  const addonOptions = addonOptionsRaw.map((addon) => ({
    id: addon._id.toString(),

    name: addon.name ?? "",

    price: addon.price ?? 0,

    category: addon.category ?? "Extras",

    imageUrl: addon.imageUrl ?? "",

    isUniversal: addon.isUniversal === true,

    eligibleProductCategories: addon.eligibleProductCategories ?? [],
  }));

  // ===============================
  // PRICING TIERS
  // ===============================

  /*
   * Normalize pricing tiers before
   * crossing the Server Component ->
   * Client Component boundary.
   */
  const pricingTiers: ProductFormInitialData["pricingTiers"] = (
    product.pricingTiers ?? []
  )
    .filter(
      (
        tier,
      ): tier is {
        label: "standard" | "deluxe" | "premium";

        price: number;

        enabled?: boolean;
        imageUrl?: string;
        recipe?: BloomWebsiteProductRecipe;
      } =>
        (tier.label === "standard" ||
          tier.label === "deluxe" ||
          tier.label === "premium") &&
        typeof tier.price === "number",
    )
    .map((tier) => ({
      label: tier.label,

      price: tier.price,

      enabled: tier.enabled !== false,

      imageUrl: tier.imageUrl ?? "",

      recipe: parseBloomWebsiteProductRecipe(tier.recipe),
    }));

  // ===============================
  // INITIAL FORM DATA
  // ===============================

  /*
   * Build one plain serializable object
   * containing every existing product
   * setting.
   *
   * ProductForm uses this to preload the
   * Edit Product screen.
   */
  const initialData: ProductFormInitialData = {
    id: product._id.toString(),

    sku: product.sku ?? "",

    name: product.name ?? "",

    shortDescription: product.shortDescription ?? "",

    description: product.description ?? "",

    category: product.category ?? "Flowers",

    occasions: product.occasions ?? [],

    tags: product.tags ?? [],

    imageUrl: product.imageUrl ?? "",

    galleryImages: product.galleryImages ?? [],

    pricingTiers,

    allowsSubstitutions: product.allowsSubstitutions ?? true,

    arrangementContainerNote: {
      mode:
        product.arrangementContainerNote?.mode === "custom" ||
        product.arrangementContainerNote?.mode === "none"
          ? product.arrangementContainerNote.mode
          : "default",
      text: product.arrangementContainerNote?.text ?? "",
    },

    localOnly: product.localOnly ?? true,

    taxable: product.taxable ?? true,
    taxRatePercent:
      typeof product.taxRatePercent === "number"
        ? product.taxRatePercent
        : null,

    inventory: {
      trackInventory: product.inventory?.trackInventory ?? false,

      quantity: product.inventory?.quantity ?? 0,
    },

    availability: {
      type:
        product.availability?.type === "date_range" ? "date_range" : "always",

      startDate: formatDateForInput(product.availability?.startDate),

      endDate: formatDateForInput(product.availability?.endDate),
    },

    /*
     * These are the manually attached,
     * non-universal add-ons already saved
     * on the product.
     */
    availableAddons:
      product.availableAddons?.map((addonId) => addonId.toString()) ?? [],

    isFeatured: product.isFeatured ?? false,

    isActive: product.isActive ?? true,

    soldOut: product.soldOut ?? false,

    seo: {
      title: product.seo?.title ?? "",

      description: product.seo?.description ?? "",

      imageAltText: product.seo?.imageAltText ?? "",

      allowIndexing: product.seo?.allowIndexing ?? true,

      canonicalUrl: product.seo?.canonicalUrl ?? "",

      socialTitle: product.seo?.socialTitle ?? "",

      socialDescription: product.seo?.socialDescription ?? "",

      socialImageUrl: product.seo?.socialImageUrl ?? "",
    },
  };

  // ===============================
  // RENDER
  // ===============================

  const websiteSettings = website.settings;

  return (
    <ProductForm
      initialData={initialData}
      addonOptions={addonOptions}
      defaultArrangementContainerNote={
        websiteSettings?.arrangementContainerNote ?? ""
      }
    />
  );
}
