"use client";

import {
  Check,
  Flower2,
  Minus,
  PackageCheck,
  Plus,
  ShoppingBag,
} from "lucide-react";

import { useMemo, useState } from "react";

import { useBloomWebsiteCart } from "@/components/websites/storefront/BloomWebsiteCartProvider";

import type {
  BloomWebsiteStorefrontAddon,
  BloomWebsiteStorefrontProductDetail,
  BloomWebsiteStorefrontPricingTier,
} from "@/types/bloom-website";

type ProductConfiguratorProps = {
  product: BloomWebsiteStorefrontProductDetail;

  primaryColor: string;
  accentColor: string;
};

function formatTierLabel(value: "standard" | "deluxe" | "premium") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getDefaultTier(
  tiers: BloomWebsiteStorefrontPricingTier[],
): BloomWebsiteStorefrontPricingTier | null {
  const standard = tiers.find((tier) => tier.label === "standard");

  if (standard) {
    return standard;
  }

  return tiers[0] ?? null;
}

export default function ProductConfigurator({
  product,
  primaryColor,
  accentColor,
}: ProductConfiguratorProps) {
  const { addItem } = useBloomWebsiteCart();

  const availableTiers = useMemo(
    () => product.pricingTiers.filter((tier) => tier.enabled),
    [product.pricingTiers],
  );

  const availableAddons = useMemo(
    () =>
      product.addons.filter((addon) => addon.availabilityState === "available"),
    [product.addons],
  );

  const initialTier = getDefaultTier(availableTiers);

  const initialImage =
    initialTier?.imageUrl || product.imageUrl || product.galleryImages[0] || "";

  const [selectedTierLabel, setSelectedTierLabel] = useState<
    "standard" | "deluxe" | "premium" | null
  >(initialTier?.label ?? null);

  const [selectedImage, setSelectedImage] = useState(initialImage);

  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);

  const [quantity, setQuantity] = useState(1);

  const selectedTier =
    availableTiers.find((tier) => tier.label === selectedTierLabel) ??
    initialTier;

  const selectedAddons = availableAddons.filter((addon) =>
    selectedAddonIds.includes(addon.id),
  );

  const productImages = useMemo(() => {
    const images = [
      selectedTier?.imageUrl,
      product.imageUrl,
      ...product.galleryImages,
      ...availableTiers.map((tier) => tier.imageUrl),
    ].filter((image): image is string => Boolean(image));

    return Array.from(new Set(images));
  }, [
    selectedTier?.imageUrl,
    product.imageUrl,
    product.galleryImages,
    availableTiers,
  ]);

  const addonsTotal = selectedAddons.reduce(
    (sum, addon) => sum + addon.price,
    0,
  );

  const unitTotal = (selectedTier?.price ?? 0) + addonsTotal;

  const total = unitTotal * quantity;

  const canPurchase =
    product.availabilityState === "available" && Boolean(selectedTier);

  function handleTierSelect(tier: BloomWebsiteStorefrontPricingTier) {
    setSelectedTierLabel(tier.label);

    if (tier.imageUrl) {
      setSelectedImage(tier.imageUrl);
      return;
    }

    if (!selectedImage) {
      setSelectedImage(product.imageUrl || product.galleryImages[0] || "");
    }
  }

  function toggleAddon(addon: BloomWebsiteStorefrontAddon) {
    setSelectedAddonIds((current) => {
      if (current.includes(addon.id)) {
        return current.filter((id) => id !== addon.id);
      }

      return [...current, addon.id];
    });
  }

  function decreaseQuantity() {
    setQuantity((current) => Math.max(1, current - 1));
  }

  function increaseQuantity() {
    setQuantity((current) => current + 1);
  }

  function handleAddToCart() {
    if (!canPurchase || !selectedTier) {
      return;
    }

    addItem({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,

      imageUrl:
        selectedTier.imageUrl || product.imageUrl || selectedImage || "",

      tier: {
        label: selectedTier.label,
        price: selectedTier.price,
      },

      addons: selectedAddons.map((addon) => ({
        id: addon.id,
        name: addon.name,
        price: addon.price,
      })),

      arrangementContainerNote: product.arrangementContainerNote,

      quantity,
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
      {/* PRODUCT MEDIA */}
      <section className="min-w-0">
        <div className="relative overflow-hidden rounded-[2rem] border border-gray-100 bg-white">
          <div className="aspect-square">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.seo.imageAltText || product.name}
                className="h-full w-full object-contain p-4 sm:p-7"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-green-50">
                <Flower2
                  size={80}
                  style={{
                    color: primaryColor,
                  }}
                />
              </div>
            )}
          </div>

          {product.availabilityState === "sold_out" && (
            <div className="absolute inset-x-5 top-5 rounded-2xl bg-gray-950 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-lg">
              Out of Stock
            </div>
          )}

          {product.availabilityState === "unavailable" && (
            <div className="absolute inset-x-5 top-5 rounded-2xl bg-gray-950 px-5 py-3 text-center text-sm font-black uppercase tracking-[0.12em] text-white shadow-lg">
              Currently Unavailable
            </div>
          )}
        </div>

        {productImages.length > 1 && (
          <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
            {productImages.map((image, index) => {
              const isSelected = image === selectedImage;

              return (
                <button
                  key={image}
                  type="button"
                  onClick={() => setSelectedImage(image)}
                  aria-label={`View ${product.name} photo ${index + 1}`}
                  aria-pressed={isSelected}
                  className={`aspect-square overflow-hidden rounded-2xl border bg-white p-2 transition ${
                    isSelected
                      ? "border-gray-950 ring-1 ring-gray-950"
                      : "border-gray-200 hover:border-gray-400"
                  }`}
                >
                  <img
                    src={image}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* PRODUCT CONFIGURATION */}
      <section className="min-w-0 lg:pt-4">
        <p
          className="text-sm font-black uppercase tracking-[0.18em]"
          style={{
            color: primaryColor,
          }}
        >
          {product.category}
        </p>

        <h1 className="mt-3 text-4xl font-black tracking-tight text-gray-950 sm:text-5xl">
          {product.name}
        </h1>

        {product.shortDescription && (
          <p className="mt-5 text-lg leading-8 text-gray-600">
            {product.shortDescription}
          </p>
        )}

        {/* AVAILABILITY */}
        {product.availabilityState === "available" ? (
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-2 text-sm font-black text-green-700">
            <Check size={16} />
            Available to order
          </div>
        ) : product.availabilityState === "sold_out" ? (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-black text-gray-950">
              This arrangement is currently out of stock.
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              You can still view the arrangement and its options, but it cannot
              currently be added to an order.
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-5">
            <p className="font-black text-gray-950">
              This arrangement isn&apos;t available today.
            </p>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              It may be seasonal or limited to a specific ordering period.
            </p>
          </div>
        )}

        {/* TIERS */}
        {availableTiers.length > 0 && (
          <div className="mt-8">
            <div>
              <h2 className="text-lg font-black text-gray-950">
                Choose your arrangement
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select the size that feels right for the occasion.
              </p>
            </div>

            <div
              className="mt-4 grid gap-3"
              role="radiogroup"
              aria-label="Arrangement size"
            >
              {availableTiers.map((tier) => {
                const isSelected = tier.label === selectedTier?.label;

                const isPopular =
                  tier.label === "deluxe" && availableTiers.length > 1;

                return (
                  <button
                    key={tier.label}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    disabled={!canPurchase}
                    onClick={() => handleTierSelect(tier)}
                    className={`relative w-full rounded-2xl border p-5 text-left transition ${
                      isSelected
                        ? "border-gray-950 bg-gray-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    } ${
                      !canPurchase
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-gray-950">
                            {formatTierLabel(tier.label)}
                          </span>

                          {isPopular && (
                            <span
                              className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white"
                              style={{
                                backgroundColor: accentColor,
                              }}
                            >
                              Popular
                            </span>
                          )}

                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-gray-950 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                              <Check size={11} />
                              Selected
                            </span>
                          )}
                        </div>

                        {tier.description && (
                          <p className="mt-2 text-sm leading-6 text-gray-500">
                            {tier.description}
                          </p>
                        )}
                      </div>

                      <span className="shrink-0 text-xl font-black text-gray-950">
                        ${tier.price.toFixed(2)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ADD-ONS */}
        {availableAddons.length > 0 && (
          <div className="mt-9 border-t border-gray-100 pt-8">
            <h2 className="text-lg font-black text-gray-950">
              Make it a little more special
            </h2>

            <p className="mt-1 text-sm leading-6 text-gray-500">
              Thoughtful extras that pair naturally with this gift.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {availableAddons.map((addon) => {
                const isSelected = selectedAddonIds.includes(addon.id);

                return (
                  <button
                    key={addon.id}
                    type="button"
                    disabled={!canPurchase}
                    onClick={() => toggleAddon(addon)}
                    aria-pressed={isSelected}
                    className={`relative flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${
                      isSelected
                        ? "border-gray-950 bg-gray-50 shadow-sm"
                        : "border-gray-200 bg-white hover:border-gray-400"
                    } ${
                      !canPurchase
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }`}
                  >
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gray-50">
                      {addon.imageUrl ? (
                        <img
                          src={addon.imageUrl}
                          alt={addon.imageAltText || addon.name}
                          className="h-full w-full object-contain p-1"
                        />
                      ) : (
                        <PackageCheck size={23} className="text-gray-400" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-black text-gray-950">
                        {addon.name}
                      </p>

                      <p className="mt-1 text-sm font-bold text-gray-600">
                        +$
                        {addon.price.toFixed(2)}
                      </p>
                    </div>

                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        isSelected
                          ? "border-gray-950 bg-gray-950 text-white"
                          : "border-gray-300 bg-white text-transparent"
                      }`}
                    >
                      <Check size={14} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* QUANTITY */}
        {canPurchase && (
          <div className="mt-9 border-t border-gray-100 pt-8">
            <div className="flex items-center justify-between gap-5">
              <div>
                <h2 className="text-base font-black text-gray-950">Quantity</h2>

                <p className="mt-1 text-sm text-gray-500">
                  How many would you like?
                </p>
              </div>

              <div className="flex items-center rounded-full border border-gray-200 bg-white p-1">
                <button
                  type="button"
                  onClick={decreaseQuantity}
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <Minus size={17} />
                </button>

                <span
                  className="min-w-10 text-center text-sm font-black"
                  aria-live="polite"
                >
                  {quantity}
                </span>

                <button
                  type="button"
                  onClick={increaseQuantity}
                  aria-label="Increase quantity"
                  className="flex h-10 w-10 items-center justify-center rounded-full text-gray-700 transition hover:bg-gray-100"
                >
                  <Plus size={17} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOTAL / PURCHASE */}
        <div className="mt-9 rounded-[1.75rem] border border-gray-200 bg-gray-50 p-5 sm:p-6">
          {canPurchase ? (
            <>
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-sm font-semibold text-gray-500">
                    Your selection
                  </p>

                  <p className="mt-1 text-sm font-black text-gray-950">
                    {selectedTier
                      ? formatTierLabel(selectedTier.label)
                      : "Arrangement"}

                    {selectedAddons.length > 0 &&
                      ` + ${selectedAddons.length} ${
                        selectedAddons.length === 1 ? "extra" : "extras"
                      }`}

                    {quantity > 1 && ` × ${quantity}`}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Total
                  </p>

                  <p
                    className="mt-1 text-3xl font-black tracking-tight"
                    aria-live="polite"
                  >
                    ${total.toFixed(2)}
                  </p>
                </div>
              </div>

              {product.arrangementContainerNote && (
                <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4">
                  <p className="text-xs font-black uppercase tracking-wide text-gray-500">
                    Arrangement &amp; container note
                  </p>
                  <p className="mt-1 text-sm leading-6 text-gray-700">
                    {product.arrangementContainerNote}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddToCart}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full px-6 py-4 text-base font-black text-white shadow-sm transition hover:opacity-95"
                style={{
                  backgroundColor: primaryColor,
                }}
              >
                <ShoppingBag size={19} />
                Add to Cart
              </button>

              <p className="mt-3 text-center text-xs leading-5 text-gray-500">
                Delivery and payment details are completed at checkout.
              </p>
            </>
          ) : (
            <>
              <p className="font-black text-gray-950">
                This arrangement cannot be ordered right now.
              </p>

              <p className="mt-2 text-sm leading-6 text-gray-600">
                Keep shopping to find another arrangement that&apos;s currently
                available.
              </p>
            </>
          )}
        </div>

      </section>
    </div>
  );
}
