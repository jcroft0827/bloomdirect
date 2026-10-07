"use client";

import { ImageIcon, Loader2, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type BloomCataloguePickerItem = {
  id: string;
  title: string;
  description: string;
  flowers: string[];
  colors: string[];
  occasions: string[];
  categories: string[];
  tags: string[];
  imageUrl: string;
  width: number | null;
  height: number | null;
  isDesignerChoice: boolean;
};

type Props = {
  currentImages: string[];
  canAddGalleryImage: boolean;
  onUsePrimary: (imageUrl: string) => void;
  onAddGallery: (imageUrl: string) => void;
};

export default function BloomCataloguePicker({
  currentImages,
  canAddGalleryImage,
  onUsePrimary,
  onAddGallery,
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
      Array.from(
        new Set<string>(items.flatMap((item) => item.categories)),
      ).sort((a, b) => a.localeCompare(b)),
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
      if (category !== "all" && !item.categories.includes(category))
        return false;
      if (occasion !== "all" && !item.occasions.includes(occasion))
        return false;
      if (color !== "all" && !item.colors.includes(color)) return false;

      if (!needle) return true;

      return [
        item.title,
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
            onClick={() => setOpen(false)}
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
                    These are illustrative Bloom examples, not photos of your
                    shop&apos;s exact inventory. Choose an image only when the
                    product you offer will reasonably match the pictured design.
                    Flower varieties, containers, and availability may differ.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
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
                    <Loader2
                      className="mx-auto animate-spin text-purple-600"
                      size={32}
                    />
                    <p className="mt-3 text-sm font-bold">
                      Loading Bloom images...
                    </p>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
                  {error}
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center">
                  <ImageIcon className="mx-auto text-gray-300" size={38} />
                  <p className="mt-3 font-black text-gray-900">
                    No matching catalogue images
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Try clearing a filter or using a broader search.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredItems.map((item) => {
                    const alreadyUsed = currentImages.includes(item.imageUrl);

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
                          {item.isDesignerChoice && (
                            <span className="absolute left-3 top-3 rounded-full bg-purple-700 px-3 py-1 text-xs font-black text-white shadow-sm">
                              Designer&apos;s Choice
                            </span>
                          )}
                        </div>
                        <div className="border-t border-gray-100 p-4">
                          <h3 className="font-black text-gray-950">
                            {item.title}
                          </h3>
                          {item.description && (
                            <p className="mt-1 line-clamp-2 text-sm leading-5 text-gray-500">
                              {item.description}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {[
                              ...item.colors,
                              ...item.flowers,
                              ...item.occasions,
                            ]
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
                              onClick={() => {
                                onUsePrimary(item.imageUrl);
                                setOpen(false);
                              }}
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
