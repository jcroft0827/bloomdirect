import { Types } from "mongoose";

import { connectToDB } from "@/lib/mongoose";
import {
  parseBloomWebsiteProductRecipe,
  type BloomWebsiteProductRecipe,
} from "@/lib/bloom-websites/productRecipes";
import BloomWebsite from "@/models/BloomWebsite";
import BloomWebsiteAddon from "@/models/BloomWebsiteAddon";
import BloomWebsiteProduct from "@/models/BloomWebsiteProduct";

export type BloomWebsiteCartTier = "standard" | "deluxe" | "premium";

export type BloomWebsiteCartValidationItemInput = {
  productId: string;
  tier: BloomWebsiteCartTier;
  addonIds?: string[];
  quantity: number;
};

export type ValidateBloomWebsiteCartInput = {
  previewSlug: string;
  items: BloomWebsiteCartValidationItemInput[];

  /**
   * Optional YYYY-MM-DD delivery date.
   *
   * We can validate the cart before the customer
   * has selected a date, then validate it again
   * after Recipient + Delivery supplies one.
   */
  requestedDate?: string;
};

export type ValidatedBloomWebsiteCartAddon = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;

  unitPriceCents: number;
  lineTotalCents: number;

  taxable: boolean;
  taxRatePercent: number | null;

  quantity: number;
  maxQuantity: number;
};

export type ValidatedBloomWebsiteCartItem = {
  productId: string;

  slug: string;
  sku: string;
  name: string;
  imageUrl: string;
  category: string;

  tier: BloomWebsiteCartTier;
  tierLabel: string;
  recipe: BloomWebsiteProductRecipe;

  unitPriceCents: number;

  quantity: number;

  productSubtotalCents: number;
  addonSubtotalCents: number;
  lineTotalCents: number;

  taxable: boolean;
  taxRatePercent: number | null;
  localOnly: boolean;
  allowsSubstitutions: boolean;

  addons: ValidatedBloomWebsiteCartAddon[];
};

export type ValidatedBloomWebsiteCart = {
  websiteId: string;
  shopId: string;
  previewSlug: string;

  items: ValidatedBloomWebsiteCartItem[];

  itemCount: number;

  productSubtotalCents: number;
  addonSubtotalCents: number;
  subtotalCents: number;

  taxableSubtotalCents: number;

  containsLocalOnlyProducts: boolean;
};

export type BloomWebsiteCartValidationFailureCode =
  | "WEBSITE_NOT_FOUND"
  | "EMPTY_CART"
  | "INVALID_CART_ITEM"
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_INACTIVE"
  | "PRODUCT_SOLD_OUT"
  | "PRODUCT_UNAVAILABLE"
  | "PRODUCT_INVENTORY_EXCEEDED"
  | "TIER_UNAVAILABLE"
  | "ADDON_NOT_FOUND"
  | "ADDON_NOT_ALLOWED"
  | "ADDON_INACTIVE"
  | "ADDON_SOLD_OUT"
  | "ADDON_UNAVAILABLE"
  | "ADDON_INVENTORY_EXCEEDED"
  | "ADDON_QUANTITY_EXCEEDED";

export class BloomWebsiteCartValidationError extends Error {
  code: BloomWebsiteCartValidationFailureCode;

  productId?: string;
  addonId?: string;

  constructor(
    code: BloomWebsiteCartValidationFailureCode,
    message: string,
    details?: {
      productId?: string;
      addonId?: string;
    },
  ) {
    super(message);

    this.name = "BloomWebsiteCartValidationError";
    this.code = code;

    this.productId = details?.productId;
    this.addonId = details?.addonId;
  }
}

type LeanPricingTier = {
  label?: string;
  price?: number;
  enabled?: boolean;

  description?: string;
  imageUrl?: string;
  recipe?: unknown;
};

type LeanInventory = {
  trackInventory?: boolean;
  quantity?: number;
};

type LeanAvailability = {
  type?: "always" | "date_range";
  startDate?: string | Date | null;
  endDate?: string | Date | null;
};

type LeanProduct = {
  _id: unknown;

  shop: unknown;
  website: unknown;

  sku?: string;
  name?: string;
  slug?: string;

  category?: string;

  imageUrl?: string;

  pricingTiers?: LeanPricingTier[];

  taxable?: boolean;
  taxRatePercent?: number | null;
  localOnly?: boolean;
  allowsSubstitutions?: boolean;

  inventory?: LeanInventory;

  availability?: LeanAvailability;

  availableAddons?: unknown[];

  isActive?: boolean;
  soldOut?: boolean;
};

type LeanAddon = {
  _id: unknown;

  shop: unknown;
  website: unknown;

  sku?: string;
  name?: string;
  category?: string;

  imageUrl?: string;

  price?: number;
  taxable?: boolean;
  taxRatePercent?: number | null;

  isUniversal?: boolean;
  eligibleProductCategories?: string[];

  maxQuantity?: number;

  inventory?: LeanInventory;

  availability?: LeanAvailability;

  isActive?: boolean;
  soldOut?: boolean;
};

type LeanWebsite = {
  _id: unknown;
  shop: unknown;
  previewSlug?: string;
};

function toIdString(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "toString" in value &&
    typeof value.toString === "function"
  ) {
    return value.toString();
  }

  return "";
}

function dollarsToCents(value: unknown) {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }

  return Math.round(amount * 100);
}

function normalizeCategory(value: string | null | undefined) {
  return (value || "")
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeDateOnly(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    return value.toISOString().slice(0, 10);
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function isAvailableForDate(
  availability: LeanAvailability | undefined,
  requestedDate: string | undefined,
) {
  if (!availability) {
    return true;
  }

  if (availability.type !== "date_range") {
    return true;
  }

  /*
   * Before the customer chooses a delivery date,
   * do not reject seasonal products merely because
   * "today" is outside their range.
   *
   * We will validate again once requestedDate exists.
   */
  if (!requestedDate) {
    return true;
  }

  const requested = normalizeDateOnly(requestedDate);
  const start = normalizeDateOnly(availability.startDate);
  const end = normalizeDateOnly(availability.endDate);

  if (!requested || !start || !end) {
    return false;
  }

  return requested >= start && requested <= end;
}

function getUniqueIds(values: string[] | undefined) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [
    ...new Set(
      values
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
}

function isAddonAllowedForProduct(product: LeanProduct, addon: LeanAddon) {
  const addonId = toIdString(addon._id);

  const explicitlyAttached = (product.availableAddons || []).some(
    (availableAddonId) => toIdString(availableAddonId) === addonId,
  );

  if (explicitlyAttached) {
    return true;
  }

  if (!addon.isUniversal) {
    return false;
  }

  const eligibleCategories = addon.eligibleProductCategories || [];

  /*
   * An empty universal category list means
   * the add-on applies to every product category.
   */
  if (eligibleCategories.length === 0) {
    return true;
  }

  const productCategory = normalizeCategory(product.category);

  return eligibleCategories.some(
    (category) => normalizeCategory(category) === productCategory,
  );
}

function validateInputItem(item: BloomWebsiteCartValidationItemInput) {
  if (!item.productId || !Types.ObjectId.isValid(item.productId)) {
    throw new BloomWebsiteCartValidationError(
      "INVALID_CART_ITEM",
      "One of the items in your cart is no longer valid.",
    );
  }

  if (
    item.tier !== "standard" &&
    item.tier !== "deluxe" &&
    item.tier !== "premium"
  ) {
    throw new BloomWebsiteCartValidationError(
      "INVALID_CART_ITEM",
      "One of the product options in your cart is no longer valid.",
      {
        productId: item.productId,
      },
    );
  }

  if (!Number.isInteger(item.quantity) || item.quantity < 1) {
    throw new BloomWebsiteCartValidationError(
      "INVALID_CART_ITEM",
      "One of the quantities in your cart is invalid.",
      {
        productId: item.productId,
      },
    );
  }

  const addonIds = getUniqueIds(item.addonIds);

  if (addonIds.some((addonId) => !Types.ObjectId.isValid(addonId))) {
    throw new BloomWebsiteCartValidationError(
      "INVALID_CART_ITEM",
      "One of the add-ons in your cart is no longer valid.",
      {
        productId: item.productId,
      },
    );
  }

  return addonIds;
}

export async function validateBloomWebsiteCart(
  input: ValidateBloomWebsiteCartInput,
): Promise<ValidatedBloomWebsiteCart> {
  const previewSlug = input.previewSlug?.trim();

  if (!previewSlug) {
    throw new BloomWebsiteCartValidationError(
      "WEBSITE_NOT_FOUND",
      "This storefront could not be found.",
    );
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new BloomWebsiteCartValidationError(
      "EMPTY_CART",
      "Your cart is empty.",
    );
  }

  /*
   * Hard guard against abusive payloads.
   *
   * A legitimate flower order should never need
   * hundreds of separately configured cart lines.
   */
  if (input.items.length > 50) {
    throw new BloomWebsiteCartValidationError(
      "INVALID_CART_ITEM",
      "There are too many items in this cart.",
    );
  }

  const requestedDate = input.requestedDate?.trim() || undefined;

  const normalizedInputItems = input.items.map((item) => ({
    ...item,
    addonIds: validateInputItem(item),
  }));

  await connectToDB();

  const website = (await BloomWebsite.findOne({
    previewSlug,
  })
    .select("_id shop previewSlug")
    .lean()) as unknown as LeanWebsite | null;

  if (!website) {
    throw new BloomWebsiteCartValidationError(
      "WEBSITE_NOT_FOUND",
      "This storefront could not be found.",
    );
  }

  const websiteId = toIdString(website._id);
  const shopId = toIdString(website.shop);

  const productIds = [
    ...new Set(normalizedInputItems.map((item) => item.productId)),
  ];

  const products = (await BloomWebsiteProduct.find({
    _id: {
      $in: productIds,
    },

    website: website._id,
    shop: website.shop,
  })
    .select(
      [
        "_id",
        "shop",
        "website",
        "sku",
        "name",
        "slug",
        "category",
        "imageUrl",
        "pricingTiers",
        "taxable",
        "localOnly",
        "allowsSubstitutions",
        "inventory",
        "availability",
        "availableAddons",
        "isActive",
        "soldOut",
      ].join(" "),
    )
    .lean()) as unknown as LeanProduct[];

  const productMap = new Map(
    products.map((product) => [toIdString(product._id), product]),
  );

  const requestedAddonIds = [
    ...new Set(normalizedInputItems.flatMap((item) => item.addonIds)),
  ];

  const addons =
    requestedAddonIds.length > 0
      ? ((await BloomWebsiteAddon.find({
          _id: {
            $in: requestedAddonIds,
          },

          website: website._id,
          shop: website.shop,
        })
          .select(
            [
              "_id",
              "shop",
              "website",
              "sku",
              "name",
              "category",
              "imageUrl",
              "price",
              "taxable",
              "isUniversal",
              "eligibleProductCategories",
              "maxQuantity",
              "inventory",
              "availability",
              "isActive",
              "soldOut",
            ].join(" "),
          )
          .lean()) as unknown as LeanAddon[])
      : [];

  const addonMap = new Map(
    addons.map((addon) => [toIdString(addon._id), addon]),
  );

  const validatedItems: ValidatedBloomWebsiteCartItem[] = [];

  let productSubtotalCents = 0;
  let addonSubtotalCents = 0;
  let taxableSubtotalCents = 0;
  let itemCount = 0;

  for (const inputItem of normalizedInputItems) {
    const product = productMap.get(inputItem.productId);

    if (!product) {
      throw new BloomWebsiteCartValidationError(
        "PRODUCT_NOT_FOUND",
        "A product in your cart is no longer available.",
        {
          productId: inputItem.productId,
        },
      );
    }

    const productName = product.name?.trim() || "This product";

    if (product.isActive === false) {
      throw new BloomWebsiteCartValidationError(
        "PRODUCT_INACTIVE",
        `${productName} is no longer available for online ordering.`,
        {
          productId: inputItem.productId,
        },
      );
    }

    const productInventory = product.inventory || {};

    const productSoldOut =
      product.soldOut === true ||
      (productInventory.trackInventory === true &&
        Number(productInventory.quantity) <= 0);

    if (productSoldOut) {
      throw new BloomWebsiteCartValidationError(
        "PRODUCT_SOLD_OUT",
        `${productName} is currently sold out.`,
        {
          productId: inputItem.productId,
        },
      );
    }

    if (
      productInventory.trackInventory === true &&
      Number.isFinite(Number(productInventory.quantity)) &&
      inputItem.quantity > Number(productInventory.quantity)
    ) {
      throw new BloomWebsiteCartValidationError(
        "PRODUCT_INVENTORY_EXCEEDED",
        `Only ${productInventory.quantity} of ${productName} ${
          Number(productInventory.quantity) === 1 ? "is" : "are"
        } currently available.`,
        {
          productId: inputItem.productId,
        },
      );
    }

    if (!isAvailableForDate(product.availability, requestedDate)) {
      throw new BloomWebsiteCartValidationError(
        "PRODUCT_UNAVAILABLE",
        `${productName} isn't available for the selected delivery date.`,
        {
          productId: inputItem.productId,
        },
      );
    }

    const tier = (product.pricingTiers || []).find(
      (pricingTier) =>
        pricingTier.label === inputItem.tier && pricingTier.enabled !== false,
    );

    if (!tier) {
      throw new BloomWebsiteCartValidationError(
        "TIER_UNAVAILABLE",
        `The selected ${inputItem.tier} option for ${productName} is no longer available.`,
        {
          productId: inputItem.productId,
        },
      );
    }

    const unitPriceCents = dollarsToCents(tier.price);

    if (unitPriceCents === null) {
      throw new BloomWebsiteCartValidationError(
        "TIER_UNAVAILABLE",
        `The selected price for ${productName} could not be verified.`,
        {
          productId: inputItem.productId,
        },
      );
    }

    const validatedAddons: ValidatedBloomWebsiteCartAddon[] = [];

    let itemAddonSubtotalCents = 0;

    for (const addonId of inputItem.addonIds) {
      const addon = addonMap.get(addonId);

      if (!addon) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_NOT_FOUND",
          "An add-on in your cart is no longer available.",
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      const addonName = addon.name?.trim() || "This add-on";

      if (!isAddonAllowedForProduct(product, addon)) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_NOT_ALLOWED",
          `${addonName} is no longer available with ${productName}.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      if (addon.isActive === false) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_INACTIVE",
          `${addonName} is no longer available.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      const addonInventory = addon.inventory || {};

      const addonSoldOut =
        addon.soldOut === true ||
        (addonInventory.trackInventory === true &&
          Number(addonInventory.quantity) <= 0);

      if (addonSoldOut) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_SOLD_OUT",
          `${addonName} is currently sold out.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      if (!isAvailableForDate(addon.availability, requestedDate)) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_UNAVAILABLE",
          `${addonName} isn't available for the selected delivery date.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      /*
       * The current cart selects an add-on once
       * per configured product line.
       *
       * Therefore addon quantity follows the
       * product line quantity.
       */
      const addonQuantity = inputItem.quantity;

      const maxQuantity = Math.max(
        1,
        Number.isInteger(Number(addon.maxQuantity))
          ? Number(addon.maxQuantity)
          : 1,
      );

      if (addonQuantity > maxQuantity) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_QUANTITY_EXCEEDED",
          `${addonName} is limited to ${maxQuantity} per order.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      if (
        addonInventory.trackInventory === true &&
        Number.isFinite(Number(addonInventory.quantity)) &&
        addonQuantity > Number(addonInventory.quantity)
      ) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_INVENTORY_EXCEEDED",
          `Only ${addonInventory.quantity} of ${addonName} ${
            Number(addonInventory.quantity) === 1 ? "is" : "are"
          } currently available.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      const addonUnitPriceCents = dollarsToCents(addon.price);

      if (addonUnitPriceCents === null) {
        throw new BloomWebsiteCartValidationError(
          "ADDON_NOT_FOUND",
          `${addonName} could not be priced.`,
          {
            productId: inputItem.productId,
            addonId,
          },
        );
      }

      const addonLineTotalCents = addonUnitPriceCents * addonQuantity;

      itemAddonSubtotalCents += addonLineTotalCents;

      addonSubtotalCents += addonLineTotalCents;

      if (addon.taxable !== false) {
        taxableSubtotalCents += addonLineTotalCents;
      }

      validatedAddons.push({
        id: addonId,

        name: addonName,
        sku: addon.sku?.trim() || "",
        category: addon.category?.trim() || "",
        imageUrl: addon.imageUrl?.trim() || "",

        unitPriceCents: addonUnitPriceCents,

        lineTotalCents: addonLineTotalCents,

        taxable: addon.taxable !== false,

        taxRatePercent:
          typeof addon.taxRatePercent === "number" &&
          Number.isFinite(addon.taxRatePercent)
            ? addon.taxRatePercent
            : null,

        quantity: addonQuantity,
        maxQuantity,
      });
    }

    const productLineSubtotalCents = unitPriceCents * inputItem.quantity;

    const lineTotalCents = productLineSubtotalCents + itemAddonSubtotalCents;

    productSubtotalCents += productLineSubtotalCents;

    if (product.taxable !== false) {
      taxableSubtotalCents += productLineSubtotalCents;
    }

    itemCount += inputItem.quantity;

    validatedItems.push({
      productId: toIdString(product._id),

      slug: product.slug?.trim() || "",
      sku: product.sku?.trim() || "",
      name: productName,
      imageUrl: product.imageUrl?.trim() || "",
      category: product.category?.trim() || "",

      tier: inputItem.tier,

      tierLabel: tier.label?.trim() || inputItem.tier,
      recipe: parseBloomWebsiteProductRecipe(tier.recipe),

      unitPriceCents,

      quantity: inputItem.quantity,

      productSubtotalCents: productLineSubtotalCents,

      addonSubtotalCents: itemAddonSubtotalCents,

      lineTotalCents,

      taxable: product.taxable !== false,

      taxRatePercent:
        typeof product.taxRatePercent === "number" &&
        Number.isFinite(product.taxRatePercent)
          ? product.taxRatePercent
          : null,

      localOnly: product.localOnly !== false,

      allowsSubstitutions: product.allowsSubstitutions !== false,

      addons: validatedAddons,
    });
  }

  return {
    websiteId,
    shopId,
    previewSlug,

    items: validatedItems,

    itemCount,

    productSubtotalCents,
    addonSubtotalCents,

    subtotalCents: productSubtotalCents + addonSubtotalCents,

    taxableSubtotalCents,

    containsLocalOnlyProducts: validatedItems.some((item) => item.localOnly),
  };
}
