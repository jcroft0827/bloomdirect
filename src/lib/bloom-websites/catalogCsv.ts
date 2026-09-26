export type CatalogImportFieldKey =
  | "name"
  | "sku"
  | "category"
  | "shortDescription"
  | "description"
  | "standardPrice"
  | "deluxePrice"
  | "premiumPrice"
  | "standardTierDescription"
  | "deluxeTierDescription"
  | "premiumTierDescription"
  | "standardTierImageUrl"
  | "deluxeTierImageUrl"
  | "premiumTierImageUrl"
  | "standardRecipeJson"
  | "deluxeRecipeJson"
  | "premiumRecipeJson"
  | "imageUrl"
  | "galleryImages"
  | "taxable"
  | "taxRatePercent"
  | "trackInventory"
  | "inventoryQuantity"
  | "availabilityType"
  | "availabilityStartDate"
  | "availabilityEndDate"
  | "occasions"
  | "tags"
  | "allowsSubstitutions"
  | "localOnly"
  | "isActive"
  | "isFeatured"
  | "soldOut"
  | "sortOrder"
  | "seoTitle"
  | "seoDescription"
  | "imageAltText"
  | "allowIndexing"
  | "canonicalUrl"
  | "socialTitle"
  | "socialDescription"
  | "socialImageUrl";

export type CatalogCsvMapping = Partial<
  Record<CatalogImportFieldKey, string>
>;

export type CatalogCsvRow = Record<string, string>;

export type CatalogImportFieldDefinition = {
  key: CatalogImportFieldKey;
  label: string;
  description: string;
  required?: boolean;
  group: "core" | "advanced";
  aliases: string[];
};

export const CATALOG_IMPORT_FIELDS: CatalogImportFieldDefinition[] = [
  {
    key: "name",
    label: "Product Name",
    description: "The customer-facing product or arrangement name.",
    required: true,
    group: "core",
    aliases: ["product name", "name", "title", "item name", "product"],
  },
  {
    key: "sku",
    label: "SKU / Item Number",
    description: "Used to identify duplicate products during import.",
    group: "core",
    aliases: ["sku", "item number", "item #", "item no", "item code", "product code"],
  },
  {
    key: "category",
    label: "Category",
    description: "Defaults to Everyday when no category is supplied.",
    group: "core",
    aliases: ["category", "product category", "collection", "department"],
  },
  {
    key: "shortDescription",
    label: "Short Description",
    description: "Short storefront summary.",
    group: "core",
    aliases: ["short description", "summary", "excerpt", "short_desc"],
  },
  {
    key: "description",
    label: "Full Description",
    description: "Full storefront product description.",
    group: "core",
    aliases: ["description", "full description", "product description", "body", "details"],
  },
  {
    key: "standardPrice",
    label: "Standard Price",
    description: "Required base selling price.",
    required: true,
    group: "core",
    aliases: ["standard price", "price", "retail price", "regular price", "base price", "unit price"],
  },
  {
    key: "deluxePrice",
    label: "Deluxe Price",
    description: "Optional Deluxe tier price.",
    group: "core",
    aliases: ["deluxe price", "deluxe", "price deluxe"],
  },
  {
    key: "premiumPrice",
    label: "Premium Price",
    description: "Optional Premium tier price.",
    group: "core",
    aliases: ["premium price", "premium", "price premium"],
  },
  {
    key: "imageUrl",
    label: "Primary Image URL",
    description: "Existing public product image URL.",
    group: "core",
    aliases: ["image url", "image", "photo url", "photo", "image_url", "main image", "primary image"],
  },
  {
    key: "galleryImages",
    label: "Gallery Image URLs",
    description: "Multiple URLs separated by |, ;, or commas.",
    group: "core",
    aliases: ["gallery images", "gallery", "additional images", "image urls", "gallery urls"],
  },
  {
    key: "inventoryQuantity",
    label: "Inventory Quantity",
    description: "Whole-number quantity available. Mapping this automatically enables inventory tracking unless Track Inventory says otherwise.",
    group: "core",
    aliases: ["inventory quantity", "quantity", "qty", "inventory", "stock", "stock quantity", "quantity available"],
  },
  {
    key: "taxable",
    label: "Taxable",
    description: "Yes/No, True/False, 1/0. Defaults to Yes.",
    group: "core",
    aliases: ["taxable", "is taxable", "tax status"],
  },
  {
    key: "taxRatePercent",
    label: "Tax Rate Override %",
    description: "Optional product-specific tax percentage.",
    group: "core",
    aliases: ["tax rate", "tax rate percent", "tax percentage", "tax %", "tax override"],
  },
  {
    key: "isActive",
    label: "Active / Published",
    description: "Defaults to active.",
    group: "core",
    aliases: ["active", "is active", "published", "visible", "enabled", "status"],
  },
  {
    key: "isFeatured",
    label: "Featured",
    description: "Marks a product as featured on the storefront.",
    group: "core",
    aliases: ["featured", "is featured"],
  },
  {
    key: "soldOut",
    label: "Sold Out",
    description: "Marks the product sold out.",
    group: "core",
    aliases: ["sold out", "soldout", "out of stock"],
  },
  {
    key: "occasions",
    label: "Occasions",
    description: "Multiple values separated by |, ;, or commas.",
    group: "core",
    aliases: ["occasions", "occasion", "events"],
  },
  {
    key: "tags",
    label: "Tags",
    description: "Multiple values separated by |, ;, or commas.",
    group: "core",
    aliases: ["tags", "tag", "keywords", "labels"],
  },
  {
    key: "trackInventory",
    label: "Track Inventory",
    description: "Explicitly turn quantity tracking on or off.",
    group: "advanced",
    aliases: ["track inventory", "inventory tracking", "manage stock", "track stock"],
  },
  {
    key: "allowsSubstitutions",
    label: "Allows Substitutions",
    description: "Defaults to Yes.",
    group: "advanced",
    aliases: ["allows substitutions", "substitutions", "allow substitutions"],
  },
  {
    key: "localOnly",
    label: "Local Only",
    description: "Defaults to Yes.",
    group: "advanced",
    aliases: ["local only", "local delivery only"],
  },
  {
    key: "sortOrder",
    label: "Sort Order",
    description: "Optional whole-number storefront ordering value.",
    group: "advanced",
    aliases: ["sort order", "display order", "position", "sort"],
  },
  {
    key: "availabilityType",
    label: "Availability Type",
    description: "Use always or date_range.",
    group: "advanced",
    aliases: ["availability type", "availability"],
  },
  {
    key: "availabilityStartDate",
    label: "Availability Start Date",
    description: "Optional seasonal start date.",
    group: "advanced",
    aliases: ["availability start date", "start date", "available from"],
  },
  {
    key: "availabilityEndDate",
    label: "Availability End Date",
    description: "Optional seasonal end date.",
    group: "advanced",
    aliases: ["availability end date", "end date", "available through", "available until"],
  },
  {
    key: "standardTierDescription",
    label: "Standard Tier Description",
    description: "Optional text describing the Standard upgrade level.",
    group: "advanced",
    aliases: ["standard tier description", "standard description"],
  },
  {
    key: "deluxeTierDescription",
    label: "Deluxe Tier Description",
    description: "Optional text describing the Deluxe upgrade level.",
    group: "advanced",
    aliases: ["deluxe tier description", "deluxe description"],
  },
  {
    key: "premiumTierDescription",
    label: "Premium Tier Description",
    description: "Optional text describing the Premium upgrade level.",
    group: "advanced",
    aliases: ["premium tier description", "premium description"],
  },
  {
    key: "standardTierImageUrl",
    label: "Standard Tier Image URL",
    description: "Optional Standard-tier image.",
    group: "advanced",
    aliases: ["standard tier image url", "standard image url"],
  },
  {
    key: "deluxeTierImageUrl",
    label: "Deluxe Tier Image URL",
    description: "Optional Deluxe-tier image.",
    group: "advanced",
    aliases: ["deluxe tier image url", "deluxe image url"],
  },
  {
    key: "premiumTierImageUrl",
    label: "Premium Tier Image URL",
    description: "Optional Premium-tier image.",
    group: "advanced",
    aliases: ["premium tier image url", "premium image url"],
  },
  {
    key: "standardRecipeJson",
    label: "Standard Recipe JSON",
    description: "Bloom backup field for the Standard design recipe.",
    group: "advanced",
    aliases: ["standard recipe json", "standard recipe"],
  },
  {
    key: "deluxeRecipeJson",
    label: "Deluxe Recipe JSON",
    description: "Bloom backup field for the Deluxe design recipe.",
    group: "advanced",
    aliases: ["deluxe recipe json", "deluxe recipe"],
  },
  {
    key: "premiumRecipeJson",
    label: "Premium Recipe JSON",
    description: "Bloom backup field for the Premium design recipe.",
    group: "advanced",
    aliases: ["premium recipe json", "premium recipe"],
  },
  {
    key: "seoTitle",
    label: "SEO Title",
    description: "Optional SEO page title.",
    group: "advanced",
    aliases: ["seo title", "meta title"],
  },
  {
    key: "seoDescription",
    label: "SEO Description",
    description: "Optional meta description.",
    group: "advanced",
    aliases: ["seo description", "meta description"],
  },
  {
    key: "imageAltText",
    label: "Image Alt Text",
    description: "Accessibility/SEO image description.",
    group: "advanced",
    aliases: ["image alt text", "alt text", "image alt"],
  },
  {
    key: "allowIndexing",
    label: "Allow Indexing",
    description: "Defaults to Yes.",
    group: "advanced",
    aliases: ["allow indexing", "indexing", "indexable"],
  },
  {
    key: "canonicalUrl",
    label: "Canonical URL",
    description: "Optional canonical URL.",
    group: "advanced",
    aliases: ["canonical url", "canonical"],
  },
  {
    key: "socialTitle",
    label: "Social Title",
    description: "Optional social sharing title.",
    group: "advanced",
    aliases: ["social title", "og title", "open graph title"],
  },
  {
    key: "socialDescription",
    label: "Social Description",
    description: "Optional social sharing description.",
    group: "advanced",
    aliases: ["social description", "og description", "open graph description"],
  },
  {
    key: "socialImageUrl",
    label: "Social Image URL",
    description: "Optional social sharing image URL.",
    group: "advanced",
    aliases: ["social image url", "og image", "og image url", "open graph image"],
  },
];

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function autoMapCatalogHeaders(headers: string[]): CatalogCsvMapping {
  const normalizedHeaders = headers.map((header) => ({
    original: header,
    normalized: normalizeHeader(header),
  }));

  const used = new Set<string>();
  const mapping: CatalogCsvMapping = {};

  /*
   * Exact matches run for every field before fuzzy matching. This prevents a
   * generic header such as "Description" from being consumed by
   * "Short Description" simply because the words overlap.
   */
  for (const field of CATALOG_IMPORT_FIELDS) {
    const aliases = [field.label, ...field.aliases].map(normalizeHeader);
    const exact = normalizedHeaders.find(
      (header) => !used.has(header.original) && aliases.includes(header.normalized),
    );

    if (exact) {
      mapping[field.key] = exact.original;
      used.add(exact.original);
    }
  }

  for (const field of CATALOG_IMPORT_FIELDS) {
    if (mapping[field.key]) continue;

    const aliases = [field.label, ...field.aliases].map(normalizeHeader);
    const fuzzy = normalizedHeaders.find((header) => {
      if (used.has(header.original) || !header.normalized) return false;
      return aliases.some(
        (alias) =>
          alias.length >= 5 &&
          header.normalized.length >= 5 &&
          (header.normalized.includes(alias) || alias.includes(header.normalized)),
      );
    });

    if (fuzzy) {
      mapping[field.key] = fuzzy.original;
      used.add(fuzzy.original);
    }
  }

  return mapping;
}

export function parseCsvText(input: string): {
  headers: string[];
  rows: CatalogCsvRow[];
} {
  const text = input.replace(/^\uFEFF/, "");
  const records: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
      continue;
    }

    if (character === ",") {
      row.push(cell);
      cell = "";
      continue;
    }

    if (character === "\n" || character === "\r") {
      if (character === "\r" && text[index + 1] === "\n") {
        index += 1;
      }

      row.push(cell);
      cell = "";

      if (row.some((value) => value.trim().length > 0)) {
        records.push(row);
      }

      row = [];
      continue;
    }

    cell += character;
  }

  if (quoted) {
    throw new Error("The CSV contains an unfinished quoted field.");
  }

  row.push(cell);
  if (row.some((value) => value.trim().length > 0)) {
    records.push(row);
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = records[0].map((header) => header.trim());
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((header, index) => {
    const base = header || `Column ${index + 1}`;
    const count = (seen.get(base) || 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base} (${count})`;
  });

  const rows = records.slice(1).map((record) => {
    const csvRow: CatalogCsvRow = {};
    headers.forEach((header, index) => {
      csvRow[header] = record[index] ?? "";
    });
    return csvRow;
  });

  return { headers, rows };
}

function mappedValue(
  row: CatalogCsvRow,
  mapping: CatalogCsvMapping,
  key: CatalogImportFieldKey,
) {
  const header = mapping[key];
  return header ? String(row[header] ?? "").trim() : "";
}

function parseMoney(value: string) {
  if (!value.trim()) return null;

  const negative = /^\(.*\)$/.test(value.trim());
  const cleaned = value.replace(/[$,%()\s]/g, "").replace(/,/g, "");
  const parsed = Number(cleaned);

  if (!Number.isFinite(parsed)) return "invalid" as const;
  const result = negative ? -parsed : parsed;
  if (result < 0) return "invalid" as const;
  return Math.round(result * 100) / 100;
}

function parseOptionalNumber(value: string) {
  if (!value.trim()) return null;
  const cleaned = value.replace(/[,%\s]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : "invalid" as const;
}

function parseOptionalInteger(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/,/g, "").trim());
  if (!Number.isInteger(parsed)) return "invalid" as const;
  return parsed;
}

function parseBooleanValue(value: string) {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;

  if (
    [
      "true",
      "yes",
      "y",
      "1",
      "active",
      "enabled",
      "published",
      "visible",
      "taxable",
      "in stock",
    ].includes(normalized)
  ) {
    return true;
  }

  if (
    [
      "false",
      "no",
      "n",
      "0",
      "inactive",
      "disabled",
      "draft",
      "hidden",
      "non-taxable",
      "nontaxable",
      "not taxable",
    ].includes(normalized)
  ) {
    return false;
  }

  return "invalid" as const;
}

function parseList(value: string) {
  if (!value.trim()) return [];

  const delimiter = value.includes("|") ? "|" : value.includes(";") ? ";" : ",";
  return Array.from(
    new Set(
      value
        .split(delimiter)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  );
}

function parseRecipeJson(value: string) {
  if (!value.trim()) return null;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return "invalid" as const;
  }
}

export type NormalizedCatalogImportRow = {
  rowNumber: number;
  name: string;
  sku: string;
  category: string;
  shortDescription: string;
  description: string;
  standardPrice: number;
  deluxePrice: number | null;
  premiumPrice: number | null;
  standardTierDescription: string;
  deluxeTierDescription: string;
  premiumTierDescription: string;
  standardTierImageUrl: string;
  deluxeTierImageUrl: string;
  premiumTierImageUrl: string;
  standardRecipe: unknown | null;
  deluxeRecipe: unknown | null;
  premiumRecipe: unknown | null;
  imageUrl: string;
  galleryImages: string[];
  taxable: boolean;
  taxRatePercent: number | null;
  trackInventory: boolean;
  inventoryQuantity: number;
  availabilityType: "always" | "date_range";
  availabilityStartDate: string | null;
  availabilityEndDate: string | null;
  occasions: string[];
  tags: string[];
  allowsSubstitutions: boolean;
  localOnly: boolean;
  isActive: boolean;
  isFeatured: boolean;
  soldOut: boolean;
  sortOrder: number | null;
  seoTitle: string;
  seoDescription: string;
  imageAltText: string;
  allowIndexing: boolean;
  canonicalUrl: string;
  socialTitle: string;
  socialDescription: string;
  socialImageUrl: string;
};

export type CatalogRowValidation = {
  valid: boolean;
  errors: string[];
  normalized: NormalizedCatalogImportRow | null;
};

export function normalizeCatalogImportRow(
  row: CatalogCsvRow,
  mapping: CatalogCsvMapping,
  rowNumber: number,
): CatalogRowValidation {
  const errors: string[] = [];

  const name = mappedValue(row, mapping, "name");
  const sku = mappedValue(row, mapping, "sku");
  const category = mappedValue(row, mapping, "category") || "Everyday";
  const shortDescription = mappedValue(row, mapping, "shortDescription");
  const description = mappedValue(row, mapping, "description");

  const standardPriceParsed = parseMoney(mappedValue(row, mapping, "standardPrice"));
  const deluxePriceParsed = parseMoney(mappedValue(row, mapping, "deluxePrice"));
  const premiumPriceParsed = parseMoney(mappedValue(row, mapping, "premiumPrice"));

  if (!name) errors.push("Product name is required.");
  if (name.length > 160) errors.push("Product name is longer than 160 characters.");
  if (sku.length > 100) errors.push("SKU is longer than 100 characters.");
  if (category.length > 120) errors.push("Category is longer than 120 characters.");
  if (shortDescription.length > 500) errors.push("Short description is longer than 500 characters.");
  if (description.length > 3000) errors.push("Description is longer than 3,000 characters.");

  if (standardPriceParsed === null || standardPriceParsed === "invalid") {
    errors.push("A valid Standard price is required.");
  }
  if (deluxePriceParsed === "invalid") errors.push("Deluxe price is invalid.");
  if (premiumPriceParsed === "invalid") errors.push("Premium price is invalid.");

  const taxableParsed = parseBooleanValue(mappedValue(row, mapping, "taxable"));
  if (taxableParsed === "invalid") errors.push("Taxable must be Yes/No or True/False.");

  const taxRateParsed = parseOptionalNumber(mappedValue(row, mapping, "taxRatePercent"));
  if (
    taxRateParsed === "invalid" ||
    (typeof taxRateParsed === "number" && (taxRateParsed < 0 || taxRateParsed > 100))
  ) {
    errors.push("Tax rate override must be between 0 and 100.");
  }

  const quantityRaw = mappedValue(row, mapping, "inventoryQuantity");
  const quantityParsed = parseOptionalInteger(quantityRaw);
  if (quantityParsed === "invalid" || (typeof quantityParsed === "number" && quantityParsed < 0)) {
    errors.push("Inventory quantity must be a whole number of 0 or greater.");
  }

  const trackParsed = parseBooleanValue(mappedValue(row, mapping, "trackInventory"));
  if (trackParsed === "invalid") errors.push("Track Inventory must be Yes/No or True/False.");

  const activeParsed = parseBooleanValue(mappedValue(row, mapping, "isActive"));
  const featuredParsed = parseBooleanValue(mappedValue(row, mapping, "isFeatured"));
  const soldOutParsed = parseBooleanValue(mappedValue(row, mapping, "soldOut"));
  const substitutionsParsed = parseBooleanValue(mappedValue(row, mapping, "allowsSubstitutions"));
  const localOnlyParsed = parseBooleanValue(mappedValue(row, mapping, "localOnly"));
  const allowIndexingParsed = parseBooleanValue(mappedValue(row, mapping, "allowIndexing"));

  if (activeParsed === "invalid") errors.push("Active must be Yes/No or True/False.");
  if (featuredParsed === "invalid") errors.push("Featured must be Yes/No or True/False.");
  if (soldOutParsed === "invalid") errors.push("Sold Out must be Yes/No or True/False.");
  if (substitutionsParsed === "invalid") errors.push("Allows Substitutions must be Yes/No or True/False.");
  if (localOnlyParsed === "invalid") errors.push("Local Only must be Yes/No or True/False.");
  if (allowIndexingParsed === "invalid") errors.push("Allow Indexing must be Yes/No or True/False.");

  const sortOrderParsed = parseOptionalInteger(mappedValue(row, mapping, "sortOrder"));
  if (sortOrderParsed === "invalid") errors.push("Sort Order must be a whole number.");

  const availabilityRaw = mappedValue(row, mapping, "availabilityType").toLowerCase();
  const availabilityType: "always" | "date_range" =
    ["date_range", "date range", "seasonal", "limited"].includes(availabilityRaw)
      ? "date_range"
      : "always";
  const availabilityStartDate = mappedValue(row, mapping, "availabilityStartDate") || null;
  const availabilityEndDate = mappedValue(row, mapping, "availabilityEndDate") || null;

  if (availabilityType === "date_range") {
    if (!availabilityStartDate || !availabilityEndDate) {
      errors.push("Seasonal availability requires both a start and end date.");
    } else {
      const start = new Date(availabilityStartDate);
      const end = new Date(availabilityEndDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        errors.push("Availability dates are invalid.");
      } else if (end < start) {
        errors.push("Availability end date must be after the start date.");
      }
    }
  }

  const standardRecipe = parseRecipeJson(mappedValue(row, mapping, "standardRecipeJson"));
  const deluxeRecipe = parseRecipeJson(mappedValue(row, mapping, "deluxeRecipeJson"));
  const premiumRecipe = parseRecipeJson(mappedValue(row, mapping, "premiumRecipeJson"));
  if (standardRecipe === "invalid") errors.push("Standard Recipe JSON is invalid.");
  if (deluxeRecipe === "invalid") errors.push("Deluxe Recipe JSON is invalid.");
  if (premiumRecipe === "invalid") errors.push("Premium Recipe JSON is invalid.");

  const seoTitle = mappedValue(row, mapping, "seoTitle");
  const seoDescription = mappedValue(row, mapping, "seoDescription");
  const imageAltText = mappedValue(row, mapping, "imageAltText");
  const canonicalUrl = mappedValue(row, mapping, "canonicalUrl");
  const socialTitle = mappedValue(row, mapping, "socialTitle");
  const socialDescription = mappedValue(row, mapping, "socialDescription");
  const socialImageUrl = mappedValue(row, mapping, "socialImageUrl");

  if (seoTitle.length > 70) errors.push("SEO title is longer than 70 characters.");
  if (seoDescription.length > 170) errors.push("SEO description is longer than 170 characters.");
  if (imageAltText.length > 250) errors.push("Image alt text is longer than 250 characters.");
  if (canonicalUrl.length > 500) errors.push("Canonical URL is longer than 500 characters.");
  if (socialTitle.length > 100) errors.push("Social title is longer than 100 characters.");
  if (socialDescription.length > 250) errors.push("Social description is longer than 250 characters.");

  if (errors.length > 0 || typeof standardPriceParsed !== "number") {
    return { valid: false, errors, normalized: null };
  }

  const trackInventory =
    typeof trackParsed === "boolean"
      ? trackParsed
      : Boolean(mapping.inventoryQuantity && quantityRaw.trim());

  return {
    valid: true,
    errors: [],
    normalized: {
      rowNumber,
      name,
      sku,
      category,
      shortDescription,
      description,
      standardPrice: standardPriceParsed,
      deluxePrice: typeof deluxePriceParsed === "number" ? deluxePriceParsed : null,
      premiumPrice: typeof premiumPriceParsed === "number" ? premiumPriceParsed : null,
      standardTierDescription: mappedValue(row, mapping, "standardTierDescription"),
      deluxeTierDescription: mappedValue(row, mapping, "deluxeTierDescription"),
      premiumTierDescription: mappedValue(row, mapping, "premiumTierDescription"),
      standardTierImageUrl: mappedValue(row, mapping, "standardTierImageUrl"),
      deluxeTierImageUrl: mappedValue(row, mapping, "deluxeTierImageUrl"),
      premiumTierImageUrl: mappedValue(row, mapping, "premiumTierImageUrl"),
      standardRecipe: standardRecipe === "invalid" ? null : standardRecipe,
      deluxeRecipe: deluxeRecipe === "invalid" ? null : deluxeRecipe,
      premiumRecipe: premiumRecipe === "invalid" ? null : premiumRecipe,
      imageUrl: mappedValue(row, mapping, "imageUrl"),
      galleryImages: parseList(mappedValue(row, mapping, "galleryImages")),
      taxable: typeof taxableParsed === "boolean" ? taxableParsed : true,
      taxRatePercent: typeof taxRateParsed === "number" ? Math.round(taxRateParsed * 1000) / 1000 : null,
      trackInventory,
      inventoryQuantity: trackInventory && typeof quantityParsed === "number" ? quantityParsed : 0,
      availabilityType,
      availabilityStartDate: availabilityType === "date_range" ? availabilityStartDate : null,
      availabilityEndDate: availabilityType === "date_range" ? availabilityEndDate : null,
      occasions: parseList(mappedValue(row, mapping, "occasions")),
      tags: parseList(mappedValue(row, mapping, "tags")),
      allowsSubstitutions: typeof substitutionsParsed === "boolean" ? substitutionsParsed : true,
      localOnly: typeof localOnlyParsed === "boolean" ? localOnlyParsed : true,
      isActive: typeof activeParsed === "boolean" ? activeParsed : true,
      isFeatured: typeof featuredParsed === "boolean" ? featuredParsed : false,
      soldOut: typeof soldOutParsed === "boolean" ? soldOutParsed : false,
      sortOrder: typeof sortOrderParsed === "number" ? sortOrderParsed : null,
      seoTitle,
      seoDescription,
      imageAltText,
      allowIndexing: typeof allowIndexingParsed === "boolean" ? allowIndexingParsed : true,
      canonicalUrl,
      socialTitle,
      socialDescription,
      socialImageUrl,
    },
  };
}

export const BLOOM_CATALOG_EXPORT_HEADERS = [
  "Product Name",
  "SKU",
  "Category",
  "Short Description",
  "Full Description",
  "Standard Price",
  "Deluxe Price",
  "Premium Price",
  "Standard Tier Description",
  "Deluxe Tier Description",
  "Premium Tier Description",
  "Standard Tier Image URL",
  "Deluxe Tier Image URL",
  "Premium Tier Image URL",
  "Standard Recipe JSON",
  "Deluxe Recipe JSON",
  "Premium Recipe JSON",
  "Primary Image URL",
  "Gallery Image URLs",
  "Taxable",
  "Tax Rate Override %",
  "Track Inventory",
  "Inventory Quantity",
  "Availability Type",
  "Availability Start Date",
  "Availability End Date",
  "Occasions",
  "Tags",
  "Allows Substitutions",
  "Local Only",
  "Active / Published",
  "Featured",
  "Sold Out",
  "Sort Order",
  "SEO Title",
  "SEO Description",
  "Image Alt Text",
  "Allow Indexing",
  "Canonical URL",
  "Social Title",
  "Social Description",
  "Social Image URL",
] as const;

export function csvEscape(value: unknown) {
  const stringValue = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}
