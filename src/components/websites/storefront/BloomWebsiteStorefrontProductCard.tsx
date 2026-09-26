// src/components/websites/storefront/BloomWebsiteStorefrontProductCard.tsx

import { Clock3, Flower2 } from "lucide-react";
import Link from "next/link";

export type BloomWebsiteStorefrontProductCardProduct = {
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: string;
  imageUrl: string;
  startingPrice: number | null;
  isFeatured: boolean;
  availabilityState: "available" | "sold_out" | "unavailable";
};

type BloomWebsiteStorefrontProductCardProps = {
  product: BloomWebsiteStorefrontProductCardProduct;
  basePath: string;
  primaryColor: string;
  accentColor: string;
  primaryForeground: "#000000" | "#ffffff";
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export default function BloomWebsiteStorefrontProductCard({
  product,
  basePath,
  primaryColor,
  accentColor,
  primaryForeground,
}: BloomWebsiteStorefrontProductCardProps) {
  const productHref = `${basePath}/products/${product.slug}`;

  const isSoldOut = product.availabilityState === "sold_out";

  const isUnavailable = product.availabilityState === "unavailable";

  const isAvailable = product.availabilityState === "available";

  return (
    <Link
      href={productHref}
      aria-label={`View ${product.name}`}
      className="group block min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-950 focus-visible:ring-offset-4 sm:rounded-3xl"
    >
      {/* IMAGE */}
      <div className="relative aspect-square overflow-hidden bg-white">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className={`h-full w-full object-contain p-2 transition duration-300 group-hover:scale-[1.025] sm:p-3 ${
              isAvailable ? "" : "opacity-75"
            }`}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-green-50">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-full bg-white/85 shadow-sm sm:h-24 sm:w-24"
              style={{
                color: accentColor,
              }}
            >
              <Flower2 size={38} className="sm:h-11 sm:w-11" />
            </div>
          </div>
        )}

        {/* FEATURED */}
        {product.isFeatured && isAvailable && (
          <span
            className="absolute left-2.5 top-2.5 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] shadow-sm sm:left-4 sm:top-4 sm:px-3 sm:py-1.5 sm:text-xs"
            style={{
              backgroundColor: primaryColor,

              color: primaryForeground,
            }}
          >
            Featured
          </span>
        )}

        {/* SOLD OUT */}
        {isSoldOut && (
          <div className="absolute inset-x-0 bottom-0 bg-gray-950/90 px-3 py-2.5 text-center text-xs font-black uppercase tracking-[0.1em] text-white sm:px-4 sm:py-3 sm:text-sm">
            Sold Out
          </div>
        )}

        {/* TEMPORARILY UNAVAILABLE */}
        {isUnavailable && (
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-gray-950/90 px-3 py-2.5 text-center text-[11px] font-black uppercase tracking-[0.08em] text-white sm:px-4 sm:py-3 sm:text-xs">
            <Clock3 size={14} />
            Unavailable
          </div>
        )}
      </div>

      {/* DETAILS */}
      <div className="p-4 sm:p-6">
        <p
          className="truncate text-[10px] font-black uppercase tracking-[0.14em] sm:text-xs"
          style={{
            color: primaryColor,
          }}
        >
          {product.category}
        </p>

        <h2 className="mt-1.5 line-clamp-2 text-base font-black leading-tight tracking-tight text-gray-950 sm:mt-2 sm:text-xl">
          {product.name}
        </h2>

        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-xs leading-5 text-gray-500 sm:text-sm sm:leading-6">
          {product.shortDescription ||
            product.description ||
            "Designed fresh by your local florist."}
        </p>

        <div className="mt-4 flex items-end justify-between gap-2 sm:mt-5 sm:gap-4">
          <div className="min-w-0">
            {product.startingPrice !== null ? (
              <>
                <p className="text-[10px] font-semibold text-gray-500 sm:text-xs">
                  Starting at
                </p>

                <p className="mt-0.5 text-lg font-black tracking-tight text-gray-950 sm:text-xl">
                  {formatPrice(product.startingPrice)}
                </p>
              </>
            ) : (
              <>
                <p className="text-[10px] font-semibold text-gray-500 sm:text-xs">
                  Pricing
                </p>

                <p className="mt-0.5 text-sm font-black text-gray-700 sm:text-base">
                  Unavailable
                </p>
              </>
            )}
          </div>

          <span
            className="shrink-0 rounded-full px-3 py-2 text-[11px] font-black transition group-hover:opacity-90 sm:px-4 sm:py-2.5 sm:text-sm"
            style={{
              backgroundColor: isAvailable ? primaryColor : "#111827",

              color: isAvailable ? primaryForeground : "#ffffff",
            }}
          >
            {isAvailable ? "View" : "Details"}
          </span>
        </div>
      </div>
    </Link>
  );
}
