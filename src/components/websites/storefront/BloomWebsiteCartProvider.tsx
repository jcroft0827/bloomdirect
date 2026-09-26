"use client";

import { useBloomWebsiteCheckout } from "@/components/websites/storefront/BloomWebsiteCheckoutProvider";

import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";

import { useRouter } from "next/navigation";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type BloomWebsiteCartTier = {
  label: "standard" | "deluxe" | "premium";

  price: number;
};

export type BloomWebsiteCartAddon = {
  id: string;
  name: string;
  price: number;
};

export type BloomWebsiteCartItemInput = {
  productId: string;
  productSlug: string;
  productName: string;
  imageUrl: string;

  tier: BloomWebsiteCartTier;

  addons: BloomWebsiteCartAddon[];

  quantity: number;
};

export type BloomWebsiteCartLineItem = BloomWebsiteCartItemInput & {
  lineId: string;
};

type BloomWebsiteCartContextValue = {
  items: BloomWebsiteCartLineItem[];

  itemCount: number;
  subtotal: number;

  isOpen: boolean;

  openCart: () => void;
  closeCart: () => void;

  addItem: (item: BloomWebsiteCartItemInput) => void;

  removeItem: (lineId: string) => void;

  updateQuantity: (lineId: string, quantity: number) => void;

  clearCart: () => void;
};

const BloomWebsiteCartContext =
  createContext<BloomWebsiteCartContextValue | null>(null);

type BloomWebsiteCartProviderProps = {
  previewSlug: string;
  basePath?: string;
  children: ReactNode;
};

function formatTierLabel(value: BloomWebsiteCartTier["label"]) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function buildLineId(item: BloomWebsiteCartItemInput) {
  const addonIds = item.addons
    .map((addon) => addon.id)
    .sort()
    .join(",");

  return [item.productId, item.tier.label, addonIds].join("::");
}

function getLineUnitTotal(item: BloomWebsiteCartLineItem) {
  const addonsTotal = item.addons.reduce((sum, addon) => sum + addon.price, 0);

  return item.tier.price + addonsTotal;
}

export default function BloomWebsiteCartProvider({
  previewSlug,
  basePath,
  children,
}: BloomWebsiteCartProviderProps) {
  const router = useRouter();

  const { invalidateDeliveryValidation } = useBloomWebsiteCheckout();

  const storageKey = `bloomwebsites-cart:${previewSlug}`;

  const [items, setItems] = useState<BloomWebsiteCartLineItem[]>([]);

  const [isOpen, setIsOpen] = useState(false);

  const [hasLoadedStorage, setHasLoadedStorage] = useState(false);

  /*
   * Load this website's cart.
   *
   * Each BloomWebsite gets its own localStorage key so a
   * shopper cannot accidentally mix carts between florists.
   */
  useEffect(() => {
    setHasLoadedStorage(false);

    try {
      const rawValue = window.localStorage.getItem(storageKey);

      if (!rawValue) {
        setItems([]);
        return;
      }

      const parsed = JSON.parse(rawValue);

      if (Array.isArray(parsed)) {
        setItems(parsed);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setHasLoadedStorage(true);
    }
  }, [storageKey]);

  /*
   * Persist only after the initial localStorage read.
   *
   * Without this guard, the initial empty React state could
   * overwrite an existing cart before it has been restored.
   */
  useEffect(() => {
    if (!hasLoadedStorage) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      /*
       * Browsers can block or fail localStorage in unusual
       * privacy/storage scenarios. The active session cart
       * should still continue working in memory.
       */
    }
  }, [hasLoadedStorage, items, storageKey]);

  const itemCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const subtotal = useMemo(
    () =>
      items.reduce((sum, item) => {
        return sum + getLineUnitTotal(item) * item.quantity;
      }, 0),
    [items],
  );

  function openCart() {
    setIsOpen(true);
  }

  function closeCart() {
    setIsOpen(false);
  }

  function addItem(incomingItem: BloomWebsiteCartItemInput) {
    const normalizedQuantity = Math.max(1, Math.floor(incomingItem.quantity));

    const lineId = buildLineId(incomingItem);

    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.lineId === lineId);

      if (existingItem) {
        return currentItems.map((item) =>
          item.lineId === lineId
            ? {
                ...item,

                quantity: item.quantity + normalizedQuantity,
              }
            : item,
        );
      }

      return [
        ...currentItems,

        {
          ...incomingItem,

          quantity: normalizedQuantity,

          lineId,
        },
      ];
    });

    invalidateDeliveryValidation();

    /*
     * Opening the drawer gives immediate, obvious feedback
     * that Add to Cart succeeded.
     */
    setIsOpen(true);
  }

  function removeItem(lineId: string) {
    setItems((currentItems) =>
      currentItems.filter((item) => item.lineId !== lineId),
    );

    invalidateDeliveryValidation();
  }

  function updateQuantity(lineId: string, quantity: number) {
    const normalizedQuantity = Math.floor(quantity);

    if (normalizedQuantity <= 0) {
      removeItem(lineId);
      return;
    }

    setItems((currentItems) =>
      currentItems.map((item) =>
        item.lineId === lineId
          ? {
              ...item,

              quantity: normalizedQuantity,
            }
          : item,
      ),
    );

    invalidateDeliveryValidation();
  }

  function clearCart() {
    setItems([]);

    invalidateDeliveryValidation();
  }

  function continueToFulfillment() {
    closeCart();

    const storefrontBasePath =
      basePath ?? `/websites/preview/${encodeURIComponent(previewSlug)}`;

    router.push(`${storefrontBasePath}/checkout/delivery`);
  }

  const contextValue = useMemo<BloomWebsiteCartContextValue>(
    () => ({
      items,

      itemCount,

      subtotal,

      isOpen,

      openCart,

      closeCart,

      addItem,

      removeItem,

      updateQuantity,

      clearCart,
    }),
    [items, itemCount, subtotal, isOpen],
  );

  return (
    <BloomWebsiteCartContext.Provider value={contextValue}>
      {children}

      {/* DRAWER BACKDROP */}
      {isOpen && (
        <button
          type="button"
          aria-label="Close shopping cart"
          onClick={closeCart}
          className="fixed inset-0 z-[80] bg-black/40"
        />
      )}

      {/* CART DRAWER */}
      <aside
        aria-label="Shopping cart"
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 right-0 z-[90] flex w-full max-w-md transform flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-5 sm:px-6">
          <div>
            <div className="flex items-center gap-2">
              <ShoppingBag
                size={20}
                style={{
                  color: "var(--bloom-primary)",
                }}
              />

              <h2 className="text-xl font-black text-gray-950">Your Cart</h2>
            </div>

            <p className="mt-1 text-sm text-gray-500">
              {itemCount === 0
                ? "Your cart is empty."
                : `${itemCount} ${itemCount === 1 ? "item" : "items"}`}
            </p>
          </div>

          <button
            type="button"
            onClick={closeCart}
            aria-label="Close shopping cart"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 transition hover:bg-gray-50"
          >
            <X size={19} />
          </button>
        </div>

        {/* ITEMS */}
        <div className="flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center px-8 text-center">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{
                  backgroundColor:
                    "color-mix(in srgb, var(--bloom-primary) 12%, white)",

                  color: "var(--bloom-primary)",
                }}
              >
                <ShoppingBag size={28} />
              </div>

              <p className="mt-5 text-lg font-black text-gray-950">
                Nothing here yet.
              </p>

              <p className="mt-2 max-w-xs text-sm leading-6 text-gray-500">
                Choose an arrangement and it will appear here.
              </p>

              <button
                type="button"
                onClick={closeCart}
                className="mt-6 rounded-full border border-gray-200 px-5 py-3 text-sm font-black text-gray-800 transition hover:bg-gray-50"
              >
                Keep Shopping
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const unitTotal = getLineUnitTotal(item);

                const lineTotal = unitTotal * item.quantity;

                return (
                  <article key={item.lineId} className="px-5 py-6 sm:px-6">
                    <div className="flex gap-4">
                      <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-100 bg-white">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.productName}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <ShoppingBag size={24} className="text-gray-300" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-black leading-5 text-gray-950">
                              {item.productName}
                            </h3>

                            <p className="mt-1 text-xs font-bold text-gray-500">
                              {formatTierLabel(item.tier.label)}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeItem(item.lineId)}
                            aria-label={`Remove ${item.productName}`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>

                        {item.addons.length > 0 && (
                          <div className="mt-3 space-y-1">
                            {item.addons.map((addon) => (
                              <p
                                key={addon.id}
                                className="text-xs leading-5 text-gray-500"
                              >
                                + {addon.name}{" "}
                                <span className="font-semibold">
                                  ${addon.price.toFixed(2)}
                                </span>
                              </p>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-4">
                          <div className="flex items-center rounded-full border border-gray-200 p-0.5">
                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.lineId,

                                  item.quantity - 1,
                                )
                              }
                              aria-label={`Decrease quantity of ${item.productName}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-gray-100"
                            >
                              <Minus size={14} />
                            </button>

                            <span className="min-w-8 text-center text-xs font-black">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                updateQuantity(
                                  item.lineId,

                                  item.quantity + 1,
                                )
                              }
                              aria-label={`Increase quantity of ${item.productName}`}
                              className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-gray-100"
                            >
                              <Plus size={14} />
                            </button>
                          </div>

                          <p className="text-base font-black text-gray-950">
                            ${lineTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* CART TOTAL */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 bg-white px-5 py-5 sm:px-6">
            <div className="flex items-center justify-between gap-5">
              <div>
                <p className="text-sm font-semibold text-gray-500">Subtotal</p>

                <p className="mt-1 text-xs leading-5 text-gray-400">
                  Delivery and tax calculated later.
                </p>
              </div>

              <p className="text-2xl font-black tracking-tight text-gray-950">
                ${subtotal.toFixed(2)}
              </p>
            </div>

            <button
              type="button"
              onClick={continueToFulfillment}
              className="mt-5 flex w-full items-center justify-center rounded-full px-6 py-4 text-sm font-black transition hover:opacity-90"
              style={{
                backgroundColor: "var(--bloom-primary)",

                color: "var(--bloom-primary-foreground)",
              }}
            >
              Continue to Fulfillment
            </button>

            <p className="mt-3 text-center text-xs leading-5 text-gray-400">
              Next, choose delivery or pickup and enter the fulfillment details.
            </p>

            <button
              type="button"
              onClick={clearCart}
              className="mt-4 w-full text-center text-xs font-bold text-gray-400 transition hover:text-red-600"
            >
              Clear Cart
            </button>
          </div>
        )}
      </aside>
    </BloomWebsiteCartContext.Provider>
  );
}

export function useBloomWebsiteCart() {
  const context = useContext(BloomWebsiteCartContext);

  if (!context) {
    throw new Error(
      "useBloomWebsiteCart must be used inside BloomWebsiteCartProvider.",
    );
  }

  return context;
}
