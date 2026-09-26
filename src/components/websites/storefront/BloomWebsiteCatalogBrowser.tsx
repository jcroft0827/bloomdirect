"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { BloomWebsiteCatalogProduct } from "@/lib/bloom-websites/getBloomWebsiteStorefrontCatalog";

import BloomWebsiteStorefrontProductCard from "./BloomWebsiteStorefrontProductCard";

type CatalogSort = "featured" | "price-low" | "price-high" | "name";

type InitialCatalogFilters = {
  query?: string;
  occasion?: string;
  category?: string;
  sort?: string;
};

type BloomWebsiteCatalogBrowserProps = {
  products: BloomWebsiteCatalogProduct[];

  basePath: string;

  primaryColor: string;
  accentColor: string;

  primaryForeground: "#000000" | "#ffffff";
  accentForeground: "#000000" | "#ffffff";

  initialFilters?: InitialCatalogFilters;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function toFilterSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeSort(value?: string): CatalogSort {
  switch (value) {
    case "price-low":
    case "price-high":
    case "name":
      return value;

    default:
      return "featured";
  }
}

function getUniqueValues(values: string[]) {
  const seen = new Set<string>();

  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => {
      const key = normalizeText(value);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);

      return true;
    })
    .sort((a, b) =>
      a.localeCompare(b, undefined, {
        sensitivity: "base",
      }),
    );
}

function getUrlState() {
  if (typeof window === "undefined") {
    return {
      query: "",
      occasion: "",
      category: "",
      sort: "featured" as CatalogSort,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    query: params.get("q")?.trim() || "",

    occasion: params.get("occasion")?.trim() || "",

    category: params.get("category")?.trim() || "",

    sort: normalizeSort(params.get("sort") || undefined),
  };
}

export default function BloomWebsiteCatalogBrowser({
  products,
  basePath,
  primaryColor,
  accentColor,
  primaryForeground,
  accentForeground,
  initialFilters,
}: BloomWebsiteCatalogBrowserProps) {
  const [query, setQuery] = useState(initialFilters?.query?.trim() || "");

  const [occasion, setOccasion] = useState(
    initialFilters?.occasion?.trim() || "",
  );

  const [category, setCategory] = useState(
    initialFilters?.category?.trim() || "",
  );

  const [sort, setSort] = useState<CatalogSort>(
    normalizeSort(initialFilters?.sort),
  );

  /*
   * Keep browser Back / Forward useful without causing a
   * server navigation for every catalog interaction.
   */
  useEffect(() => {
    function handlePopState() {
      const state = getUrlState();

      setQuery(state.query);
      setOccasion(state.occasion);
      setCategory(state.category);
      setSort(state.sort);
    }

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  /*
   * Synchronize browsing state into a shareable URL.
   *
   * replaceState keeps typing in Search from filling the
   * browser history with dozens of entries.
   */
  useEffect(() => {
    const params = new URLSearchParams();

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (occasion) {
      params.set("occasion", occasion);
    }

    if (category) {
      params.set("category", category);
    }

    if (sort !== "featured") {
      params.set("sort", sort);
    }

    const queryString = params.toString();

    const nextUrl = queryString
      ? `${window.location.pathname}?${queryString}`
      : window.location.pathname;

    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [query, occasion, category, sort]);

  const occasions = useMemo(
    () =>
      getUniqueValues(products.flatMap((product) => product.occasions || [])),
    [products],
  );

  const categories = useMemo(
    () => getUniqueValues(products.map((product) => product.category)),
    [products],
  );

  const selectedOccasionLabel =
    occasions.find((value) => toFilterSlug(value) === occasion) || "";

  const selectedCategoryLabel =
    categories.find((value) => toFilterSlug(value) === category) || "";

  const filteredProducts = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    const filtered = products
      .filter((product) => {
        if (
          occasion &&
          !product.occasions.some((value) => toFilterSlug(value) === occasion)
        ) {
          return false;
        }

        if (category && toFilterSlug(product.category) !== category) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [
          product.name,
          product.shortDescription,
          product.description,
          product.category,
          ...product.occasions,
          ...product.tags,
        ]
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .map((product, originalIndex) => ({
        product,
        originalIndex,
      }));

    filtered.sort((a, b) => {
      switch (sort) {
        case "price-low": {
          const aPrice = a.product.startingPrice ?? Number.POSITIVE_INFINITY;

          const bPrice = b.product.startingPrice ?? Number.POSITIVE_INFINITY;

          return aPrice - bPrice || a.originalIndex - b.originalIndex;
        }

        case "price-high": {
          const aPrice = a.product.startingPrice ?? Number.NEGATIVE_INFINITY;

          const bPrice = b.product.startingPrice ?? Number.NEGATIVE_INFINITY;

          return bPrice - aPrice || a.originalIndex - b.originalIndex;
        }

        case "name":
          return a.product.name.localeCompare(b.product.name, undefined, {
            sensitivity: "base",
          });

        case "featured":
        default:
          return a.originalIndex - b.originalIndex;
      }
    });

    return filtered.map(({ product }) => product);
  }, [products, query, occasion, category, sort]);

  const hasFilters =
    Boolean(query.trim()) ||
    Boolean(occasion) ||
    Boolean(category) ||
    sort !== "featured";

  function clearFilters() {
    setQuery("");
    setOccasion("");
    setCategory("");
    setSort("featured");
  }

  return (
    <div>
      {/* SEARCH + SORT */}
      <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="relative block min-w-0 flex-1">
            <span className="sr-only">Search flowers</span>

            <Search
              size={18}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search flowers..."
              className="h-12 w-full rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-10 text-sm font-semibold text-gray-950 outline-none transition placeholder:font-medium placeholder:text-gray-400 focus:border-gray-400 focus:bg-white sm:h-13 sm:rounded-2xl"
            />

            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            )}
          </label>

          <label className="relative block sm:w-[220px]">
            <span className="sr-only">Sort products</span>

            <SlidersHorizontal
              size={17}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value as CatalogSort)}
              className="h-12 w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 pl-11 pr-9 text-sm font-black text-gray-700 outline-none transition focus:border-gray-400 focus:bg-white sm:h-13 sm:rounded-2xl"
            >
              <option value="featured">Featured</option>

              <option value="price-low">Price: Low to High</option>

              <option value="price-high">Price: High to Low</option>

              <option value="name">Name: A-Z</option>
            </select>

            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400">
              ▼
            </span>
          </label>
        </div>

        {/* OCCASIONS */}
        {occasions.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 sm:text-xs">
              Shop by Occasion
            </p>

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              <button
                type="button"
                onClick={() => setOccasion("")}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                  !occasion
                    ? "border-transparent"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
                style={
                  !occasion
                    ? {
                        backgroundColor: primaryColor,
                        color: primaryForeground,
                      }
                    : undefined
                }
              >
                All Occasions
              </button>

              {occasions.map((value) => {
                const slug = toFilterSlug(value);

                const isSelected = occasion === slug;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOccasion(isSelected ? "" : slug)}
                    className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                      isSelected
                        ? "border-transparent"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: primaryColor,
                            color: primaryForeground,
                          }
                        : undefined
                    }
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* CATEGORIES */}
        {categories.length > 1 && (
          <div className="mt-5 border-t border-gray-100 pt-5">
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.14em] text-gray-400 sm:text-xs">
              Categories
            </p>

            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
              <button
                type="button"
                onClick={() => setCategory("")}
                className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                  !category
                    ? "border-transparent"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
                style={
                  !category
                    ? {
                        backgroundColor: accentColor,
                        color: accentForeground,
                      }
                    : undefined
                }
              >
                All Categories
              </button>

              {categories.map((value) => {
                const slug = toFilterSlug(value);

                const isSelected = category === slug;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setCategory(isSelected ? "" : slug)}
                    className={`shrink-0 rounded-full border px-4 py-2.5 text-xs font-black transition sm:text-sm ${
                      isSelected
                        ? "border-transparent"
                        : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: accentColor,
                            color: accentForeground,
                          }
                        : undefined
                    }
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* RESULTS HEADER */}
      <div className="mb-5 mt-6 flex items-end justify-between gap-4 px-1 sm:mb-7 sm:mt-8 sm:px-0">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
            Our Collection
          </p>

          <h2 className="mt-1 text-xl font-black tracking-tight text-gray-950 sm:text-2xl">
            {filteredProducts.length === 1
              ? "1 arrangement"
              : `${filteredProducts.length} arrangements`}
          </h2>

          {(selectedOccasionLabel || selectedCategoryLabel || query.trim()) && (
            <p className="mt-1.5 text-xs font-semibold text-gray-500 sm:text-sm">
              {query.trim() && (
                <>
                  Search: &ldquo;
                  {query.trim()}
                  &rdquo;
                </>
              )}

              {query.trim() &&
                (selectedOccasionLabel || selectedCategoryLabel) &&
                " • "}

              {selectedOccasionLabel && <>{selectedOccasionLabel}</>}

              {selectedOccasionLabel && selectedCategoryLabel && " • "}

              {selectedCategoryLabel && <>{selectedCategoryLabel}</>}
            </p>
          )}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="shrink-0 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-black text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 sm:px-4 sm:text-sm"
          >
            Clear
          </button>
        )}
      </div>

      {/* RESULTS */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:gap-6">
          {filteredProducts.map((product) => (
            <BloomWebsiteStorefrontProductCard
              key={product.id}
              product={product}
              basePath={basePath}
              primaryColor={primaryColor}
              accentColor={accentColor}
              primaryForeground={primaryForeground}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-gray-300 bg-white px-5 py-14 text-center shadow-sm sm:px-10 sm:py-20">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500">
            <Search size={25} />
          </div>

          <h2 className="mt-5 text-xl font-black text-gray-950 sm:text-2xl">
            No flowers found.
          </h2>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
            Try another search, occasion, or category.
          </p>

          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-black transition hover:opacity-90"
            style={{
              backgroundColor: primaryColor,
              color: primaryForeground,
            }}
          >
            View All Flowers
          </button>
        </div>
      )}
    </div>
  );
}
