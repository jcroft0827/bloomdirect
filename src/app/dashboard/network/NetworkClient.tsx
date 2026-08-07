// src/app/dashboard/network/NetworkClient.tsx

"use client";

import {
  BadgeCheck,
  Clock3,
  Heart,
  LoaderCircle,
  MapPin,
  PackageSearch,
  Search,
  Star,
  Store,
  Truck,
  X,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";

interface PricingTier {
  label: string;
  price: number;
  description: string;
}

interface NetworkOffering {
  _id: string;
  type: string;
  name: string;
  description: string;
  image: string;
  pricingTiers: PricingTier[];
  allowsSubstitutions: boolean;
  isFeatured: boolean;
  isDesignerChoice: boolean;
}

interface NetworkShop {
  _id: string;
  businessName: string;
  slug: string;
  verifiedFlorist: boolean;
  isPro: boolean;
  isFavorite: boolean;

  address: {
    city: string;
    state: string;
    zip: string;
  };

  contact: {
    phone: string;
    website: string;
  };

  branding: {
    logo: string;
    bio: string;
    primaryColor: string;
  };

  stats: {
    ordersCompleted: number;
    responseRate: number;
  };

  rating: {
    average: number;
    count: number;
  };

  delivery: {
    method: "zip" | "distance";
    maxRadius: number | null;
    sameDayCutoff: string;
    allowsSameDay: boolean;
    sameDayAvailable: boolean;
    zipCount: number;
    distanceZoneCount: number;
  };

  offerings: NetworkOffering[];
}

interface NetworkResponse {
  shops?: NetworkShop[];
  count?: number;
  query?: string;
  error?: string;
}

function formatLocation(shop: NetworkShop): string {
  return [shop.address.city, shop.address.state, shop.address.zip]
    .filter(Boolean)
    .join(", ");
}

function formatPriceRange(offering: NetworkOffering): string {
  const prices = offering.pricingTiers
    .map((tier) => Number(tier.price))
    .filter((price) => Number.isFinite(price) && price > 0)
    .sort((a, b) => a - b);

  if (prices.length === 0) {
    return "Pricing available when ordering";
  }

  const minimum = prices[0];
  const maximum = prices[prices.length - 1];

  if (minimum === maximum) {
    return `$${minimum.toFixed(2)}`;
  }

  return `$${minimum.toFixed(2)}–$${maximum.toFixed(2)}`;
}

function formatCutoff(value: string): string {
  if (!value) {
    return "";
  }

  const [hours, minutes] = value.split(":").map(Number);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return value;
  }

  const date = new Date();

  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function NetworkClient() {
  const [shops, setShops] = useState<NetworkShop[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);

  const loadNetwork = useCallback(async (query = "") => {
    try {
      setIsLoading(true);

      const searchParams = new URLSearchParams();

      if (query.trim()) {
        searchParams.set("q", query.trim());
      }

      const url = searchParams.size
        ? `/api/shops/network?${searchParams.toString()}`
        : "/api/shops/network";

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      const data = (await response.json()) as NetworkResponse;

      if (!response.ok) {
        throw new Error(data.error || "Unable to load the florist network.");
      }

      setShops(data.shops ?? []);
      setActiveQuery(query.trim());
    } catch (error) {
      console.error("Failed to load florist network:", error);

      setShops([]);

      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to load the florist network.",
      );
    } finally {
      setIsLoading(false);
      setHasLoaded(true);
    }
  }, []);

  useEffect(() => {
    loadNetwork();
  }, [loadNetwork]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadNetwork(searchInput);
  }

  function clearSearch() {
    setSearchInput("");
    loadNetwork("");
  }

  return (
    <main className="min-h-full">
      <section className="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm sm:p-7 lg:p-8">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">
            <Store className="h-4 w-4" />
            Florist Network
          </div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Find the right florist for your next order.
          </h1>

          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
            Browse active GetBloomDirect florists, review their offerings, and
            choose who should fulfill your order.
          </p>
        </div>

        <form
          onSubmit={handleSearch}
          className="mt-7 flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
            />

            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search florist, city, state, or ZIP"
              className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-11 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />

            {searchInput && (
              <button
                type="button"
                onClick={() => setSearchInput("")}
                aria-label="Clear search input"
                className="absolute right-3 top-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Search className="h-5 w-5" />
            )}
            Search Network
          </button>
        </form>
      </section>

      <section className="mt-6">
        <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between sm:px-0">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              {activeQuery
                ? `Results for “${activeQuery}”`
                : "Florists in the network"}
            </h2>

            {!isLoading && hasLoaded && (
              <p className="mt-1 text-sm text-slate-500">
                {shops.length === 1
                  ? "1 eligible florist"
                  : `${shops.length} eligible florists`}
              </p>
            )}
          </div>

          {activeQuery && !isLoading && (
            <button
              type="button"
              onClick={clearSearch}
              className="self-start text-sm font-semibold text-emerald-700 transition hover:text-emerald-800 sm:self-auto"
            >
              View all florists
            </button>
          )}
        </div>

        {isLoading && (
          <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <LoaderCircle className="mx-auto h-9 w-9 animate-spin text-emerald-600" />

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              Loading the florist network
            </h3>

            <p className="mt-2 text-sm text-slate-500">
              We’re gathering eligible florists and their active offerings.
            </p>
          </div>
        )}

        {!isLoading && hasLoaded && shops.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <PackageSearch className="mx-auto h-10 w-10 text-slate-400" />

            <h3 className="mt-4 text-lg font-bold text-slate-900">
              {activeQuery
                ? "No matching florists found"
                : "No eligible florists are available yet"}
            </h3>

            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
              {activeQuery
                ? "Try searching with a different business name, city, state, or ZIP."
                : "Florists will appear here once they are active and ready to receive orders."}
            </p>

            {activeQuery && (
              <button
                type="button"
                onClick={clearSearch}
                className="mt-5 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                View All Florists
              </button>
            )}
          </div>
        )}

        {!isLoading && shops.length > 0 && (
          <div className="grid gap-5 xl:grid-cols-2">
            {shops.map((shop) => {
              const location = formatLocation(shop);
              const visibleOfferings = shop.offerings.slice(0, 3);
              const remainingOfferingCount =
                shop.offerings.length - visibleOfferings.length;

              return (
                <article
                  key={shop._id}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
                >
                  <div
                    className="h-2 w-full"
                    style={{
                      backgroundColor: shop.branding.primaryColor || "#059669",
                    }}
                  />

                  <div className="p-5 sm:p-6">
                    <div className="flex items-start gap-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        {shop.branding.logo ? (
                          <img
                            src={shop.branding.logo}
                            alt={`${shop.businessName} logo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Store className="h-7 w-7 text-slate-400" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate text-xl font-bold text-slate-900">
                            {shop.businessName}
                          </h3>

                          {shop.verifiedFlorist && (
                            <span
                              title="Verified Florist"
                              className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700"
                            >
                              <BadgeCheck className="h-4 w-4" />
                              Verified
                            </span>
                          )}

                          {shop.isPro && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                              <Star className="h-3.5 w-3.5 fill-current" />
                              Bloom Pro
                            </span>
                          )}

                          {shop.isFavorite && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">
                              <Heart className="h-3.5 w-3.5 fill-current" />
                              Favorite
                            </span>
                          )}
                        </div>

                        {location && (
                          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                            <MapPin className="h-4 w-4 shrink-0" />
                            <span>{location}</span>
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />

                            {shop.rating.count > 0
                              ? `${shop.rating.average.toFixed(1)} (${shop.rating.count})`
                              : "No reviews yet"}
                          </span>

                          {shop.stats.ordersCompleted > 0 && (
                            <span>
                              {shop.stats.ordersCompleted} completed{" "}
                              {shop.stats.ordersCompleted === 1
                                ? "order"
                                : "orders"}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {shop.branding.bio && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                        {shop.branding.bio}
                      </p>
                    )}

                    <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                        <div>
                          <p className="font-semibold text-slate-800">
                            Service area
                          </p>

                          <p className="mt-0.5 text-slate-500">
                            {shop.delivery.method === "distance"
                              ? shop.delivery.maxRadius
                                ? `Up to ${shop.delivery.maxRadius} miles`
                                : `${shop.delivery.distanceZoneCount} distance ${
                                    shop.delivery.distanceZoneCount === 1
                                      ? "zone"
                                      : "zones"
                                  }`
                              : `${shop.delivery.zipCount} ZIP ${
                                  shop.delivery.zipCount === 1
                                    ? "zone"
                                    : "zones"
                                }`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2">
                        <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />

                        <div>
                          <p className="font-semibold text-slate-800">
                            Same-day orders
                          </p>

                          <p className="mt-0.5 text-slate-500">
                            {!shop.delivery.allowsSameDay
                              ? "Not offered"
                              : shop.delivery.sameDayAvailable
                                ? shop.delivery.sameDayCutoff
                                  ? `Available until ${formatCutoff(
                                      shop.delivery.sameDayCutoff,
                                    )}`
                                  : "Currently available"
                                : "Unavailable for today"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-bold text-slate-900">
                          Active offerings
                        </h4>

                        <span className="text-xs font-medium text-slate-500">
                          {shop.offerings.length}{" "}
                          {shop.offerings.length === 1
                            ? "offering"
                            : "offerings"}
                        </span>
                      </div>

                      {visibleOfferings.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {visibleOfferings.map((offering) => (
                            <div
                              key={offering._id}
                              className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-3 py-2.5"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-800">
                                  {offering.name}
                                </p>

                                {offering.isDesignerChoice && (
                                  <p className="mt-0.5 text-xs text-purple-600">
                                    Designer&apos;s Choice
                                  </p>
                                )}
                              </div>

                              <span className="shrink-0 text-sm font-semibold text-emerald-700">
                                {formatPriceRange(offering)}
                              </span>
                            </div>
                          ))}

                          {remainingOfferingCount > 0 && (
                            <p className="px-1 text-xs font-medium text-slate-500">
                              +{remainingOfferingCount} more{" "}
                              {remainingOfferingCount === 1
                                ? "offering"
                                : "offerings"}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-4 py-4 text-sm text-slate-500">
                          This florist does not currently have active offerings
                          available.
                        </p>
                      )}
                    </div>

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      {shop.slug ? (
                        <Link
                          href={`/dashboard/shops/${shop.slug}`}
                          className="inline-flex h-12 flex-1 items-center justify-center rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:h-11"
                        >
                          View Profile
                        </Link>
                      ) : (
                        <span className="inline-flex h-12 flex-1 cursor-not-allowed items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-400 sm:h-11">
                          Profile Unavailable
                        </span>
                      )}

                      <Link
                        href={`/dashboard/new-order?fulfillingShopId=${encodeURIComponent(
                          shop._id,
                        )}`}
                        className="inline-flex h-12 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:h-11"
                      >
                        Create Order
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
