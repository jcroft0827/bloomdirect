"use client";

import {
  CalendarDays,
  ChevronDown,
  DollarSign,
  Filter,
  Loader2,
  PackageSearch,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type FilterValues = {
  q: string;
  status: string;
  fulfillment: string;
  product: string;
  minTotal: string;
  maxTotal: string;
  orderFrom: string;
  orderTo: string;
  deliveryFrom: string;
  deliveryTo: string;
  sort: string;
};

type ProductOption = {
  id: string;
  name: string;
  isActive: boolean;
};

export default function BloomWebsiteOrderFilters({
  initial,
  products,
}: {
  initial: FilterValues;
  products: ProductOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState(initial.q);
  const [minTotal, setMinTotal] = useState(initial.minTotal);
  const [maxTotal, setMaxTotal] = useState(initial.maxTotal);
  const hasAdvancedFilters = Boolean(
    initial.status ||
      initial.fulfillment ||
      initial.product ||
      initial.minTotal ||
      initial.maxTotal ||
      initial.orderFrom ||
      initial.orderTo ||
      initial.deliveryFrom ||
      initial.deliveryTo,
  );
  const [filtersOpen, setFiltersOpen] = useState(hasAdvancedFilters);
  const [isPending, startTransition] = useTransition();

  function replaceParams(patch: Partial<FilterValues>) {
    const params = new URLSearchParams(window.location.search);

    // Remove legacy fulfillment-date names from the prior filter UI.
    params.delete("from");
    params.delete("to");

    Object.entries(patch).forEach(([key, value]) => {
      if (!value || (key === "sort" && value === "newest")) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    const search = params.toString();

    startTransition(() => {
      router.replace(search ? `${pathname}?${search}` : pathname, {
        scroll: false,
      });
    });
  }

  useEffect(() => {
    if (query === initial.q) return;

    const timer = window.setTimeout(() => {
      replaceParams({ q: query.trim() });
    }, 350);

    return () => window.clearTimeout(timer);
    // initial.q changes after the server applies the URL search value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, initial.q]);

  useEffect(() => {
    if (
      minTotal === initial.minTotal &&
      maxTotal === initial.maxTotal
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      replaceParams({
        minTotal: minTotal.trim(),
        maxTotal: maxTotal.trim(),
      });
    }, 450);

    return () => window.clearTimeout(timer);
    // Server props catch up after the URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minTotal, maxTotal, initial.minTotal, initial.maxTotal]);

  const hasFilters = Boolean(
    initial.q ||
      initial.status ||
      initial.fulfillment ||
      initial.product ||
      initial.minTotal ||
      initial.maxTotal ||
      initial.orderFrom ||
      initial.orderTo ||
      initial.deliveryFrom ||
      initial.deliveryTo ||
      initial.sort !== "newest",
  );

  function clearAll() {
    setQuery("");
    setMinTotal("");
    setMaxTotal("");

    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center justify-between gap-3">
            <label
              htmlFor="website-order-search"
              className="flex items-center gap-2 text-sm font-black text-gray-900"
            >
              <Search size={17} className="text-purple-700" />
              Search orders
            </label>
            <span className="text-xs font-semibold text-gray-400">
              Searches as you type
            </span>
          </div>

          <div className="relative">
            <Search
              size={17}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              id="website-order-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order #, customer, recipient, phone, email, address..."
              className="min-h-12 w-full rounded-2xl border border-gray-300 bg-white pl-10 pr-11 text-sm text-gray-950 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            />
            {isPending ? (
              <Loader2
                size={17}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-purple-600"
              />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  replaceParams({ q: "" });
                }}
                aria-label="Clear order search"
                className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
              >
                <X size={16} />
              </button>
            ) : null}
          </div>
        </div>

        <div className="w-full xl:w-64">
          <label
            htmlFor="website-order-sort"
            className="mb-2 flex items-center gap-2 text-sm font-black text-gray-900"
          >
            <SlidersHorizontal size={17} className="text-purple-700" />
            Sort
          </label>
          <select
            id="website-order-sort"
            defaultValue={initial.sort}
            onChange={(event) =>
              replaceParams({ sort: event.target.value })
            }
            className="min-h-12 w-full rounded-2xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="delivery_soonest">
              Delivery / pickup date: soonest
            </option>
            <option value="delivery_latest">
              Delivery / pickup date: latest
            </option>
            <option value="total_high">Total: high to low</option>
            <option value="total_low">Total: low to high</option>
          </select>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/80">
        <div className="flex flex-wrap items-center justify-between gap-3 p-4">
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            aria-expanded={filtersOpen}
            aria-controls="website-order-advanced-filters"
            className="inline-flex min-h-9 items-center gap-2 rounded-xl px-1 text-xs font-black uppercase tracking-[0.12em] text-gray-500 transition hover:text-gray-900"
          >
            <Filter size={15} className="text-purple-700" />
            Filters
            {hasAdvancedFilters && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] tracking-normal text-purple-700">
                Active
              </span>
            )}
            <ChevronDown
              size={15}
              className={`transition-transform duration-200 ${
                filtersOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div className="flex items-center gap-3">
            {isPending && (
              <span className="inline-flex items-center gap-2 text-xs font-bold text-purple-700">
                <Loader2 size={14} className="animate-spin" />
                Updating
              </span>
            )}

            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-3 text-xs font-black text-gray-600 transition hover:bg-gray-100 hover:text-gray-950"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>
        </div>

        {filtersOpen && (
          <div
            id="website-order-advanced-filters"
            className="border-t border-gray-100 p-4 pt-4"
          >
        <div className="grid gap-4 lg:grid-cols-3">
          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-gray-500">
              Status
            </span>
            <select
              defaultValue={initial.status}
              onChange={(event) =>
                replaceParams({ status: event.target.value })
              }
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">All statuses</option>
              <option value="placed">Placed</option>
              <option value="in_preparation">In Preparation</option>
              <option value="preparation_complete">
                Preparation Complete
              </option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="fulfilled">Delivered / Picked Up</option>
              <option value="canceled">Canceled</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-black uppercase tracking-[0.08em] text-gray-500">
              Fulfillment
            </span>
            <select
              defaultValue={initial.fulfillment}
              onChange={(event) =>
                replaceParams({ fulfillment: event.target.value })
              }
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">Delivery + Pickup</option>
              <option value="delivery">Delivery</option>
              <option value="pickup">Pickup</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.08em] text-gray-500">
              <PackageSearch size={14} />
              Product
            </span>
            <select
              defaultValue={initial.product}
              onChange={(event) =>
                replaceParams({ product: event.target.value })
              }
              className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm font-bold text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
            >
              <option value="">All products</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {product.isActive ? "" : " (Inactive)"}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-sm font-black text-gray-900">
              <DollarSign size={16} className="text-purple-700" />
              Order total
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Filter by the customer&apos;s final order total.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
                  Minimum
                </span>
                <div className="relative">
                  <DollarSign
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={minTotal}
                    onChange={(event) => setMinTotal(event.target.value)}
                    placeholder="0.00"
                    className="min-h-11 w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
                  Maximum
                </span>
                <div className="relative">
                  <DollarSign
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={maxTotal}
                    onChange={(event) => setMaxTotal(event.target.value)}
                    placeholder="No maximum"
                    className="min-h-11 w-full rounded-xl border border-gray-300 bg-white pl-8 pr-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-sm font-black text-gray-900">
              <CalendarDays size={16} className="text-purple-700" />
              Order date
            </div>
            <p className="mt-1 text-xs text-gray-500">
              When the customer placed the website order.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
                  From
                </span>
                <input
                  type="date"
                  defaultValue={initial.orderFrom}
                  onChange={(event) =>
                    replaceParams({ orderFrom: event.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
                  Through
                </span>
                <input
                  type="date"
                  defaultValue={initial.orderTo}
                  onChange={(event) =>
                    replaceParams({ orderTo: event.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-3.5">
            <div className="flex items-center gap-2 text-sm font-black text-gray-900">
              <CalendarDays size={16} className="text-purple-700" />
              Delivery / pickup date
            </div>
            <p className="mt-1 text-xs text-gray-500">
              The requested fulfillment date for the order.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
                  From
                </span>
                <input
                  type="date"
                  defaultValue={initial.deliveryFrom}
                  onChange={(event) =>
                    replaceParams({ deliveryFrom: event.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>

              <label>
                <span className="mb-1.5 block text-[11px] font-bold text-gray-500">
                  Through
                </span>
                <input
                  type="date"
                  defaultValue={initial.deliveryTo}
                  onChange={(event) =>
                    replaceParams({ deliveryTo: event.target.value })
                  }
                  className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                />
              </label>
            </div>
          </div>
        </div>
          </div>
        )}
      </div>
    </section>
  );
}
