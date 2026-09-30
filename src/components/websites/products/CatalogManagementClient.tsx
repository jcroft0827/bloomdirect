"use client";

import {
  ChevronLeft,
  ChevronRight,
  Gift,
  Package2,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

type CatalogStatus = "active" | "sold_out" | "inactive";
type CatalogTab = "products" | "addons";
type SortValue = "catalog" | "name" | "price_asc" | "price_desc" | "status";

export type CatalogProductItem = {
  id: string;
  name: string;
  sku: string;
  category: string;
  imageUrl: string;
  isActive: boolean;
  soldOut: boolean;
  startingPrice: number | null;
};

export type CatalogAddonItem = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  price: number;
  isActive: boolean;
  soldOut: boolean;
  isUniversal: boolean;
};

type CatalogManagementClientProps = {
  products: CatalogProductItem[];
  addons: CatalogAddonItem[];
};

const PAGE_SIZE = 20;

function getStatus(item: { isActive: boolean; soldOut: boolean }): CatalogStatus {
  if (!item.isActive) return "inactive";
  if (item.soldOut) return "sold_out";
  return "active";
}

function statusLabel(status: CatalogStatus) {
  if (status === "sold_out") return "Sold Out";
  if (status === "inactive") return "Inactive";
  return "Active";
}

function StatusPill({ status }: { status: CatalogStatus }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-bold ${
        status === "active"
          ? "bg-emerald-100 text-emerald-700"
          : status === "sold_out"
            ? "bg-amber-100 text-amber-700"
            : "bg-gray-100 text-gray-600"
      }`}
    >
      {statusLabel(status)}
    </span>
  );
}

export default function CatalogManagementClient({
  products,
  addons,
}: CatalogManagementClientProps) {
  const [tab, setTab] = useState<CatalogTab>("products");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortValue>("catalog");
  const [page, setPage] = useState(1);

  const activeItems = tab === "products" ? products : addons;

  const categories = useMemo(
    () =>
      Array.from(new Set(activeItems.map((item) => item.category).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [activeItems],
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const items = activeItems.filter((item) => {
      const itemStatus = getStatus(item);
      const matchesCategory = category === "all" || item.category === category;
      const matchesStatus = status === "all" || itemStatus === status;
      const searchable =
        tab === "products"
          ? `${item.name} ${item.category} ${(item as CatalogProductItem).sku}`
          : `${item.name} ${item.category}`;
      const matchesQuery = !normalizedQuery || searchable.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesStatus && matchesQuery;
    });

    return items
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        if (sort === "catalog") return a.index - b.index;
        if (sort === "name") return a.item.name.localeCompare(b.item.name);
        if (sort === "status") {
          return statusLabel(getStatus(a.item)).localeCompare(statusLabel(getStatus(b.item)));
        }

        const aPrice =
          tab === "products"
            ? ((a.item as CatalogProductItem).startingPrice ?? Number.POSITIVE_INFINITY)
            : (a.item as CatalogAddonItem).price;
        const bPrice =
          tab === "products"
            ? ((b.item as CatalogProductItem).startingPrice ?? Number.POSITIVE_INFINITY)
            : (b.item as CatalogAddonItem).price;

        return sort === "price_desc" ? bPrice - aPrice : aPrice - bPrice;
      })
      .map(({ item }) => item);
  }, [activeItems, category, query, sort, status, tab]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function changeTab(nextTab: CatalogTab) {
    setTab(nextTab);
    setQuery("");
    setCategory("all");
    setStatus("all");
    setSort("catalog");
    setPage(1);
  }

  function resetPage() {
    setPage(1);
  }

  const createHref =
    tab === "products" ? "/dashboard/websites/products/new" : "/dashboard/websites/addons/new";
  const createLabel = tab === "products" ? "Add Product" : "Add Add-on";

  return (
    <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-100 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="inline-flex w-full rounded-xl bg-gray-100 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => changeTab("products")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black transition sm:flex-none ${
              tab === "products"
                ? "bg-white text-purple-700 shadow-sm"
                : "text-gray-600 hover:text-gray-950"
            }`}
          >
            <Package2 size={17} />
            Products
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {products.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => changeTab("addons")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-black transition sm:flex-none ${
              tab === "addons"
                ? "bg-white text-green-700 shadow-sm"
                : "text-gray-600 hover:text-gray-950"
            }`}
          >
            <Gift size={17} />
            Add-ons
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              {addons.length}
            </span>
          </button>
        </div>

        <Link
          href={createHref}
          className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black text-white transition ${
            tab === "products" ? "bg-purple-700 hover:bg-purple-800" : "bg-green-700 hover:bg-green-800"
          }`}
        >
          <Plus size={17} />
          {createLabel}
        </Link>
      </div>

      <div className="border-b border-gray-100 bg-gray-50/70 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_180px_160px_180px]">
          <label className="relative block">
            <span className="sr-only">Search {tab === "products" ? "products" : "add-ons"}</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                resetPage();
              }}
              placeholder={
                tab === "products" ? "Search name, SKU, or category..." : "Search name or category..."
              }
              className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-950 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </label>

          <label className="relative">
            <span className="sr-only">Category</span>
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value);
                resetPage();
              }}
              className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 pr-9 text-sm font-semibold text-gray-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            >
              <option value="all">All categories</option>
              {categories.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <SlidersHorizontal
              size={15}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </label>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              resetPage();
            }}
            className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            aria-label="Filter by status"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="sold_out">Sold out</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            value={sort}
            onChange={(event) => {
              setSort(event.target.value as SortValue);
              resetPage();
            }}
            className="rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            aria-label="Sort catalog"
          >
            <option value="catalog">Catalog order</option>
            <option value="name">Name A–Z</option>
            <option value="price_asc">Price low–high</option>
            <option value="price_desc">Price high–low</option>
            <option value="status">Status</option>
          </select>
        </div>

        <p className="mt-3 text-xs font-semibold text-gray-500">
          Showing {filteredItems.length} of {activeItems.length} {tab === "products" ? "products" : "add-ons"}
        </p>
      </div>

      {activeItems.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
              tab === "products" ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"
            }`}
          >
            {tab === "products" ? <Package2 size={29} /> : <Gift size={29} />}
          </div>
          <h3 className="mt-5 text-xl font-black text-gray-950">
            {tab === "products" ? "Add your first product." : "Add something extra."}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">
            {tab === "products"
              ? "Create the arrangements, plants, gifts, and other products customers can purchase from your website."
              : "Create balloons, chocolates, plush, vases, and other extras customers can add to an order."}
          </p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <Search size={28} className="mx-auto text-gray-300" />
          <h3 className="mt-4 text-lg font-black text-gray-950">No matching items</h3>
          <p className="mt-2 text-sm text-gray-500">Try a different search or filter.</p>
        </div>
      ) : (
        <>
          <div className="divide-y divide-gray-100">
            {visibleItems.map((item) => {
              const itemStatus = getStatus(item);
              const isProduct = tab === "products";
              const product = item as CatalogProductItem;
              const addon = item as CatalogAddonItem;
              const editHref = isProduct
                ? `/dashboard/websites/products/${item.id}/edit`
                : `/dashboard/websites/addons/${item.id}/edit`;

              return (
                <div
                  key={item.id}
                  className="grid gap-3 px-4 py-4 transition hover:bg-gray-50/80 sm:px-5 md:grid-cols-[64px_minmax(0,1fr)_auto] md:items-center md:gap-4"
                >
                  <div
                    className={`flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl ${
                      isProduct ? "bg-purple-50 text-purple-600" : "bg-green-50 text-green-600"
                    }`}
                  >
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : isProduct ? (
                      <Package2 size={24} />
                    ) : (
                      <Gift size={24} />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-black text-gray-950">{item.name}</p>
                      <StatusPill status={itemStatus} />
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {item.category}
                      {isProduct && product.sku ? ` · SKU ${product.sku}` : ""}
                      {isProduct && typeof product.startingPrice === "number"
                        ? ` · From $${product.startingPrice.toFixed(2)}`
                        : ""}
                      {!isProduct ? ` · $${addon.price.toFixed(2)}` : ""}
                      {!isProduct && addon.isUniversal ? " · Universal" : ""}
                    </p>
                  </div>

                  <Link
                    href={editHref}
                    className={`inline-flex min-h-10 items-center justify-center rounded-xl border bg-white px-4 py-2 text-sm font-black transition md:justify-self-end ${
                      isProduct
                        ? "border-gray-300 text-gray-700 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
                        : "border-gray-300 text-gray-700 hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                    }`}
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t border-gray-100 bg-gray-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm font-semibold text-gray-500">
                Page {safePage} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
