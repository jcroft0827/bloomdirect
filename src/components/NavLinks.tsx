// src/components/NavLinks.tsx

"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { ChevronDown } from "lucide-react";

interface MonthlySendUsage {
  isPro: boolean;
  allowed: boolean;
  sentThisMonth: number;
  limit: number | null;
  remaining: number | null;
}

interface NavLinksProps {
  slug: string;
  pro: boolean;
  pathname: string;
  onClose?: () => void;
  role: string;
}

export const NavLinks = ({
  slug,
  pro,
  pathname,
  role,
  onClose,
}: NavLinksProps) => {
  const ordersPathIsActive =
    pathname === "/dashboard/new-order" ||
    pathname === "/dashboard/incoming" ||
    pathname.startsWith("/dashboard/orders/") ||
    pathname.startsWith("/orders/");

  const shopPathIsActive =
    pathname === `/dashboard/shops/${slug}` ||
    pathname === "/dashboard/reports" ||
    pathname === "/dashboard/pos-integration" ||
    pathname === "/dashboard/settings";

  const [ordersOpen, setOrdersOpen] = useState(ordersPathIsActive);
  const [shopOpen, setShopOpen] = useState(shopPathIsActive);
  const [sendUsage, setSendUsage] = useState<MonthlySendUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    if (ordersPathIsActive) {
      setOrdersOpen(true);
    }
  }, [ordersPathIsActive]);

  useEffect(() => {
    if (shopPathIsActive) {
      setShopOpen(true);
    }
  }, [shopPathIsActive]);

  useEffect(() => {
    let mounted = true;

    async function loadSendUsage() {
      try {
        const res = await fetch("/api/orders/send-usage");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.error || "Unable to load monthly sending usage.",
          );
        }

        if (mounted) {
          setSendUsage(data.usage);
        }
      } catch (error) {
        console.error("Failed to load nav sending usage:", error);
      } finally {
        if (mounted) {
          setUsageLoading(false);
        }
      }
    }

    loadSendUsage();

    return () => {
      mounted = false;
    };
  }, []);

  const navItemClass = (active: boolean) =>
    `block rounded-lg p-3 transition-colors ${
      active
        ? "bg-emerald-100 font-medium text-emerald-700"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const childNavItemClass = (active: boolean) =>
    `block rounded-lg px-3 py-2.5 text-sm transition-colors ${
      active
        ? "bg-emerald-100 font-medium text-emerald-700"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const groupButtonClass = (active: boolean) =>
    `flex w-full items-center justify-between rounded-lg p-3 text-left transition-colors ${
      active
        ? "font-medium text-emerald-700"
        : "text-gray-600 hover:bg-gray-100"
    }`;

  const logOut = () => {
    signOut({ redirect: false });
    onClose?.();
    router.push("/");
  };

  const handleSendLimitReached = () => {
    onClose?.();

    toast(
      `You have reached your monthly limit of ${sendUsage?.limit} sent orders. Upgrade to Bloom Pro for unlimited sending.`,
      {
        icon: "⭐",
        duration: 5000,
      },
    );
  };

  return (
    <>
      <nav className="space-y-2">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard")}
        >
          Home
        </Link>

        <div>
          <button
            type="button"
            onClick={() => setOrdersOpen((current) => !current)}
            className={groupButtonClass(ordersPathIsActive)}
            aria-expanded={ordersOpen}
            aria-controls="orders-navigation"
          >
            <span>Orders</span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                ordersOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {ordersOpen && (
            <div
              id="orders-navigation"
              className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3"
            >
              {usageLoading ? (
                <span className="block cursor-wait rounded-lg px-3 py-2.5 text-sm text-gray-400">
                  Create Order
                </span>
              ) : sendUsage?.allowed !== false ? (
                <Link
                  href="/dashboard/new-order"
                  onClick={onClose}
                  className={childNavItemClass(
                    pathname === "/dashboard/new-order",
                  )}
                >
                  Create Order
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleSendLimitReached}
                  className="block w-full rounded-lg px-3 py-2.5 text-left text-sm text-gray-600 transition-colors hover:bg-gray-100"
                >
                  Create Order
                </button>
              )}

              <Link
                href="/dashboard/incoming"
                onClick={onClose}
                className={childNavItemClass(
                  pathname === "/dashboard/incoming" ||
                    pathname.startsWith("/dashboard/orders/") ||
                    pathname.startsWith("/orders/"),
                )}
              >
                View Orders
              </Link>
            </div>
          )}
        </div>

        <Link
          href="/dashboard/network"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/network")}
        >
          Network
        </Link>

        <div>
          <button
            type="button"
            onClick={() => setShopOpen((current) => !current)}
            className={groupButtonClass(shopPathIsActive)}
            aria-expanded={shopOpen}
            aria-controls="shop-navigation"
          >
            <span>My Shop</span>
            <ChevronDown
              size={18}
              className={`transition-transform duration-200 ${
                shopOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {shopOpen && (
            <div
              id="shop-navigation"
              className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-3"
            >
              <Link
                href={`/dashboard/shops/${slug}`}
                onClick={onClose}
                className={childNavItemClass(
                  pathname === `/dashboard/shops/${slug}`,
                )}
              >
                Profile
              </Link>

              {pro && (
                <Link
                  href="/dashboard/reports"
                  onClick={onClose}
                  className={childNavItemClass(
                    pathname === "/dashboard/reports",
                  )}
                >
                  Reports
                </Link>
              )}

              {pro && (
                <Link
                  href="/dashboard/pos-integration"
                  onClick={onClose}
                  className={childNavItemClass(
                    pathname === "/dashboard/pos-integration",
                  )}
                >
                  POS Integration
                </Link>
              )}

              <Link
                href="/dashboard/settings"
                onClick={onClose}
                className={childNavItemClass(
                  pathname === "/dashboard/settings",
                )}
              >
                Settings
              </Link>
            </div>
          )}
        </div>

        <Link
          href="/dashboard/getting-started"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/getting-started")}
        >
          Getting Started
        </Link>

        {role === "admin" && (
          <Link
            href="/admin"
            onClick={onClose}
            className={navItemClass(pathname.startsWith("/admin"))}
          >
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="mt-auto space-y-2 border-t pt-6">
        {!pro && (
          <Link
            href="/dashboard/upgrade"
            onClick={onClose}
            className="block p-3 font-medium text-orange-600 hover:underline"
          >
            Upgrade Plan
          </Link>
        )}
        <button
          type="button"
          onClick={logOut}
          className="w-full rounded-lg p-3 text-left text-red-600 hover:bg-red-50"
        >
          Logout
        </button>
      </div>
    </>
  );
};
