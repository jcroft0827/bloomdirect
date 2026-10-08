"use client";

import {
  ImageIcon,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type BloomCatalogueSuggestedProduct = {
  name: string;
  shortDescription: string;
  description: string;
  category: string;
  occasions: string[];
  tags: string[];
  seoTitle: string;
  seoDescription: string;
  imageAltText: string;
  socialTitle: string;
  socialDescription: string;
};

export type BloomCatalogueSuggestedField = keyof BloomCatalogueSuggestedProduct;

export type BloomCataloguePickerItem = {
  id: string;
  title: string;
  shortDescription?: string;
  description: string;
  flowers: string[];
  colors: string[];
  occasions: string[];
  categories: string[];
  tags: string[];
  suggestedProduct: BloomCatalogueSuggestedProduct;
  imageUrl: string;
  width: number | null;
  height: number | null;
  isDesignerChoice: boolean;
};

type Props = {
  currentImages: string[];
  canAddGalleryImage: boolean;
  isEditing: boolean;
  currentProductDetails: BloomCatalogueSuggestedProduct;
  onUsePrimary: (imageUrl: string) => void;
  onAddGallery: (imageUrl: string) => void;
  onApplySuggestedDetails: (
    suggestedProduct: BloomCatalogueSuggestedProduct,
    fields: BloomCatalogueSuggestedField[],
  ) => void;
};

type SuggestedFieldSelection = Record<BloomCatalogueSuggestedField, boolean>;

type SuggestedFieldDefinition = {
  key: BloomCatalogueSuggestedField;
  label: string;
  group: "Product details" | "SEO recommendations";
};

const SUGGESTED_FIELDS: SuggestedFieldDefinition[] = [
  { key: "name", label: "Product name", group: "Product details" },
  { key: "shortDescription", label: "Short description", group: "Product details" },
  { key: "description", label: "Description", group: "Product details" },
  { key: "category", label: "Category", group: "Product details" },
  { key: "occasions", label: "Occasions", group: "Product details" },
  { key: "tags", label: "Tags", group: "Product details" },
  { key: "seoTitle", label: "SEO title", group: "SEO recommendations" },
  { key: "seoDescription", label: "Meta description", group: "SEO recommendations" },
  { key: "imageAltText", label: "Image alt text", group: "SEO recommendations" },
  { key: "socialTitle", label: "Social sharing title", group: "SEO recommendations" },
  {
    key: "socialDescription",
    label: "Social sharing description",
    group: "SEO recommendations",
  },
];

function hasValue(
  value: BloomCatalogueSuggestedProduct[BloomCatalogueSuggestedField],
) {
  return Array.isArray(value) ? value.length > 0 : value.trim().length > 0;
}

function formatSuggestedValue(
  value: BloomCatalogueSuggestedProduct[BloomCatalogueSuggestedField],
) {
  return Array.isArray(value) ? value.join(", ") : value;
}

function valuesMatch(
  left: BloomCatalogueSuggestedProduct[BloomCatalogueSuggestedField],
  right: BloomCatalogueSuggestedProduct[BloomCatalogueSuggestedField],
) {
  if (Array.isArray(left) && Array.isArray(right)) {
    const normalizedLeft = [...left].map((value) => value.trim()).filter(Boolean).sort();
    const normalizedRight = [...right].map((value) => value.trim()).filter(Boolean).sort();

    return normalizedLeft.join("\u0000") === normalizedRight.join("\u0000");
  }

  if (typeof left === "string" && typeof right === "string") {
    return left.trim() === right.trim();
  }

  return false;
}

function emptySelections(): SuggestedFieldSelection {
  return {
    name: false,
    shortDescription: false,
    description: false,
    category: false,
    occasions: false,
    tags: false,
    seoTitle: false,
    seoDescription: false,
    imageAltText: false,
    socialTitle: false,
    socialDescription: false,
  };
}

export default function BloomCataloguePicker({
  currentImages,
  canAddGalleryImage,
  isEditing,
  currentProductDetails,
  onUsePrimary,
  onAddGallery,
  onApplySuggestedDetails,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<BloomCataloguePickerItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [occasion, setOccasion] = useState("all");
  const [color, setColor] = useState("all");
  const [pendingItem, setPendingItem] =
    useState<BloomCataloguePickerItem | null>(null);
  const [suggestedSelections, setSuggestedSelections] =
    useState<SuggestedFieldSelection>(emptySelections);

  useEffect(() => {
    if (!open || loaded) return;

    let cancelled = false;

    async function loadCatalogue() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/websites/catalogue", {
          method: "GET",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || "Unable to load Bloom images.");
        }

        if (!cancelled) {
          setItems(Array.isArray(data?.items) ? data.items : []);
          setLoaded(true);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load Bloom images.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCatalogue();
    return () => {
      cancelled = true;
    };
  }, [loaded, open]);

  const categories = useMemo<string[]>(
    () =>
      Array.from(new Set<string>(items.flatMap((item) => item.categories))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  );

  const occasions = useMemo<string[]>(
    () =>
      Array.from(new Set<string>(items.flatMap((item) => item.occasions))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  );

  const colors = useMemo<string[]>(
    () =>
      Array.from(new Set<string>(items.flatMap((item) => item.colors))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [items],
  );

  const filteredItems = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return items.filter((item) => {
      if (category !== "all" && !item.categories.includes(category)) return false;
      if (occasion !== "all" && !item.occasions.includes(occasion)) return false;
      if (color !== "all" && !item.colors.includes(color)) return false;

      if (!needle) return true;

      return [
        item.title,
        item.shortDescription || "",
        item.description,
        ...item.flowers,
        ...item.colors,
        ...item.occasions,
        ...item.categories,
        ...item.tags,
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [category, color, items, occasion, query]);

  const availableSuggestedFields = useMemo(() => {
    if (!pendingItem) return [];

    return SUGGESTED_FIELDS.filter(({ key }) =>
      hasValue(pendingItem.suggestedProduct[key]),
    );
  }, [pendingItem]);

  const overwriteCount = useMemo(() => {
    if (!pendingItem) return 0;

    return availableSuggestedFields.filter(
      ({ key }) =>
        suggestedSelections[key] &&
        hasValue(currentProductDetails[key]) &&
        !valuesMatch(currentProductDetails[key], pendingItem.suggestedProduct[key]),
    ).length;
  }, [availableSuggestedFields, currentProductDetails, pendingItem, suggestedSelections]);

  function closePicker() {
    setPendingItem(null);
    setOpen(false);
  }

  function beginUsePrimary(item: BloomCataloguePickerItem) {
    const available = SUGGESTED_FIELDS.filter(({ key }) =>
      hasValue(item.suggestedProduct[key]),
    );

    if (available.length === 0) {
      onUsePrimary(item.imageUrl);
      closePicker();
      return;
    }

    const nextSelections = emptySelections();

    for (const { key } of available) {
      nextSelections[key] =
        !isEditing || !hasValue(currentProductDetails[key]);
    }

    setSuggestedSelections(nextSelections);
    setPendingItem(item);
  }

  function useImageOnly() {
    if (!pendingItem) return;

    onUsePrimary(pendingItem.imageUrl);
    closePicker();
  }

  function applySuggestedDetails() {
    if (!pendingItem) return;

    const selectedFields = availableSuggestedFields
      .filter(({ key }) => suggestedSelections[key])
      .map(({ key }) => key);

    if (selectedFields.length === 0) return;

    onUsePrimary(pendingItem.imageUrl);
    onApplySuggestedDetails(pendingItem.suggestedProduct, selectedFields);
    closePicker();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-sm font-black text-purple-800 transition hover:bg-purple-100"
      >
        <Sparkles size={17} /> Browse Bloom Image Catalogue
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Close Bloom image catalogue"
            onClick={closePicker}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <div className="border-b border-gray-100 px-5 py-4 sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-purple-700">
                    <Sparkles size={18} />
                    <span className="text-xs font-black uppercase tracking-[0.16em]">
                      Shared Bloom Catalogue
                    </span>
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-gray-950">
                    Choose a professional arrangement image
                  </h2>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-600">
                    These are illustrative Bloom examples, not photos of your shop&apos;s exact inventory. Choose an image only when the product you offer will reasonably match the pictured design. Flower varieties, containers, and availability may differ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closePicker}
                  className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  aria-label="Close"
                >
                  <X size={21} />
                </button>
              </div>
            </div>

            <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_160px]">
                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search flowers, colors, occasions, styles..."
                    className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-950 outline-none focus:border-purple-500"
                  />
                </div>
                <FilterSelect
                  label="Category"
                  value={category}
                  values={categories}
                  onChange={setCategory}
                />
                <FilterSelect
                  label="Occasion"
                  value={occasion}
                  values={occasions}
                  onChange={setOccasion}
                />
                <FilterSelect
                  label="Color"
                  value={color}
                  values={colors}
                  onChange={setColor}
                />
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
              {loading ? (
                <div className="flex min-h-72 items-center justify-center">
                  <div className="text-center text-gray-500">
                    <Loader2 className="mx-auto animate-spin text-purple-600" size={32} />
                    <p className="mt-3 text-sm font-bold">Loading Bloom images...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                  <ImageIcon className="mx-auto text-gray-300" size={38} />
                  <p className="mt-3 font-black text-gray-900">No matching catalogue images</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Try clearing a filter or using a broader search.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => {
                    const alreadyUsed = currentImages.includes(item.imageUrl);
                    const hasStarterDetails = SUGGESTED_FIELDS.some(({ key }) =>
                      hasValue(item.suggestedProduct[key]),
                    );

                    return (
                      <article
                        key={item.id}
                        className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
                      >
                        <div className="relative aspect-square bg-white p-3">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            className="h-full w-full object-contain"
                          />
                          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                            {item.isDesignerChoice && (
                              <span className="rounded-full bg-purple-700 px-3 py-1 text-xs font-black text-white shadow-sm">
                                Designer&apos;s Choice
                              </span>
                            )}
                            {hasStarterDetails && (
                              <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-black text-purple-700 shadow-sm ring-1 ring-purple-100">
                                Starter details + SEO
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-gray-100 p-4">
                          <h3 className="font-black text-gray-950">{item.title}</h3>
                          {(item.shortDescription || item.description) && (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500">
                              {item.shortDescription || item.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {[...item.colors, ...item.flowers, ...item.occasions]
                              .slice(0, 5)
                              .map((tag) => (
                                <span
                                  key={`${item.id}-${tag}`}
                                  className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600"
                                >
                                  {tag}
                                </span>
                              ))}
                          </div>
                          <div className="mt-4 grid gap-2 sm:grid-cols-2">
                            <button
                              type="button"
                              onClick={() => beginUsePrimary(item)}
                              className="rounded-xl bg-purple-700 px-3 py-2.5 text-xs font-black text-white hover:bg-purple-800"
                            >
                              Use as Primary
                            </button>
                            <button
                              type="button"
                              disabled={alreadyUsed || !canAddGalleryImage}
                              onClick={() => onAddGallery(item.imageUrl)}
                              className="rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-black text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {alreadyUsed
                                ? "Already Added"
                                : canAddGalleryImage
                                  ? "Add to Gallery"
                                  : "Gallery Full"}
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {pendingItem && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/75 p-0 sm:items-center sm:p-5">
          <button
            type="button"
            aria-label="Close suggested product details and SEO"
            onClick={() => setPendingItem(null)}
            className="absolute inset-0 cursor-default"
          />

          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-4">
                <img
                  src={pendingItem.imageUrl}
                  alt={pendingItem.title}
                  className="h-20 w-20 shrink-0 rounded-2xl border border-gray-200 bg-white object-contain p-1"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-purple-700">
                    <Sparkles size={17} />
                    <span className="text-xs font-black uppercase tracking-[0.14em]">
                      Optional starter details + SEO
                    </span>
                  </div>
                  <h3 className="mt-1 text-xl font-black text-gray-950">
                    Use Bloom starter details?
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-gray-600">
                    Bloom has curated product copy and SEO recommendations for {pendingItem.title}. Choose exactly what you want to use, or keep your existing details and use the image only.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingItem(null)}
                className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
                aria-label="Back to catalogue"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 space-y-5">
              {(["Product details", "SEO recommendations"] as const).map((group) => {
                const fields = availableSuggestedFields.filter(
                  (field) => field.group === group,
                );

                if (fields.length === 0) return null;

                return (
                  <section key={group}>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-gray-400">
                      {group}
                    </p>
                    <div className="space-y-2">
                      {fields.map(({ key, label }) => {
                        const selected = suggestedSelections[key];
                        const currentFilled = hasValue(currentProductDetails[key]);

                        return (
                          <label
                            key={key}
                            className={`block cursor-pointer rounded-2xl border p-4 transition ${
                              selected
                                ? "border-purple-300 bg-purple-50"
                                : "border-gray-200 bg-white hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={(event) =>
                                  setSuggestedSelections((current) => ({
                                    ...current,
                                    [key]: event.target.checked,
                                  }))
                                }
                                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-purple-700"
                              />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-black text-gray-950">
                                    {label}
                                  </span>
                                  {currentFilled && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                                      Currently filled
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1 line-clamp-3 text-sm leading-5 text-gray-600">
                                  {formatSuggestedValue(
                                    pendingItem.suggestedProduct[key],
                                  )}
                                </p>
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>

            {overwriteCount > 0 && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                {overwriteCount} selected field{overwriteCount === 1 ? "" : "s"} already {overwriteCount === 1 ? "has" : "have"} content and will be replaced. Pricing, recipes, images beyond the selected primary, inventory, taxes, canonical URLs, indexing controls, and other settings will not change.
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={useImageOnly}
                className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-black text-gray-700 hover:bg-gray-50"
              >
                Use Image Only
              </button>
              <button
                type="button"
                disabled={!availableSuggestedFields.some(({ key }) => suggestedSelections[key])}
                onClick={applySuggestedDetails}
                className="rounded-xl bg-purple-700 px-4 py-3 text-sm font-black text-white hover:bg-purple-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Use Selected Details + SEO
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FilterSelect({
  label,
  value,
  values,
  onChange,
}: {
  label: string;
  value: string;
  values: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-bold text-gray-700 outline-none focus:border-purple-500"
    >
      <option value="all">All {label.toLowerCase()}s</option>
      {values.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
