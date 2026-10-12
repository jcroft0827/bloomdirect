"use client";

import { ShoppingBag } from "lucide-react";

import { useBloomWebsiteCart } from "@/components/websites/storefront/BloomWebsiteCartProvider";

type StorefrontCartButtonProps = {
  primaryColor: string;

  primaryForeground?: "#000000" | "#ffffff";

  compact?: boolean;
  variant?: "classic" | "elegant";
};

export default function StorefrontCartButton({
  primaryColor,

  primaryForeground = "#ffffff",

  compact = false,
  variant = "classic",
}: StorefrontCartButtonProps) {
  const { itemCount, openCart } = useBloomWebsiteCart();

  if (variant === "elegant") {
    return (
      <button
        type="button"
        onClick={openCart}
        aria-label={`Open cart with ${itemCount} ${itemCount === 1 ? "item" : "items"}`}
        className="group relative inline-flex min-h-10 shrink-0 items-center gap-2 border-b border-stone-400 px-1 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-stone-700 transition hover:border-stone-900 hover:text-stone-950"
      >
        <ShoppingBag size={16} strokeWidth={1.6} />
        <span className={compact ? "hidden sm:inline" : ""}>Bag</span>
        {itemCount > 0 ? <span className="font-medium tracking-normal">({itemCount > 99 ? "99+" : itemCount})</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openCart}
      aria-label={`Open cart with ${itemCount} ${
        itemCount === 1 ? "item" : "items"
      }`}
      className="relative flex h-11 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-black shadow-sm transition hover:opacity-90 sm:px-5"
      style={{
        backgroundColor: primaryColor,

        color: primaryForeground,
      }}
    >
      <ShoppingBag size={17} />

      {!compact && <span className="hidden sm:inline">Cart</span>}

      {itemCount > 0 && (
        <span
          className="flex min-h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-black shadow-sm"
          style={{
            backgroundColor: primaryForeground,

            color: primaryColor,
          }}
        >
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </button>
  );
}
