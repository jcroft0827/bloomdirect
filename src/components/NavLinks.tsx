// src/components/NavLinks.tsx

"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

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
  onClose?: () => void; // Optional: used to close mobile menu on click
  role: string;
}

export const NavLinks = ({
  slug,
  pro,
  pathname,
  role,
  onClose,
}: NavLinksProps) => {
  const isActive = (path: string) =>
    pathname === path
      ? "bg-emerald-100 text-emerald-700"
      : "hover:bg-gray-100 text-gray-600";

  const [sendUsage, setSendUsage] = useState<MonthlySendUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const router = useRouter();

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

  const logOut = () => {
    signOut({ redirect: false });
    if (onClose) onClose();
    router.push("/");
  };

  return (
    <>
      <nav className="space-y-2">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard")}`}
        >
          Home
        </Link>
        {usageLoading ? (
          <span className="block cursor-wait rounded-lg p-3 text-gray-400">
            New Order
          </span>
        ) : sendUsage?.allowed !== false ? (
          <Link
            href="/dashboard/new-order"
            onClick={onClose}
            className={`block p-3 rounded-lg ${isActive(
              "/dashboard/new-order",
            )}`}
          >
            New Order
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (onClose) {
                onClose();
              }

              toast(
                `You have reached your monthly limit of ${sendUsage?.limit} sent orders. Upgrade to Bloom Pro for unlimited sending.`,
                {
                  icon: "⭐",
                  duration: 5000,
                },
              );
            }}
            className="block w-full rounded-lg p-3 text-left text-gray-600 hover:bg-gray-100"
          >
            New Order
          </button>
        )}
        <Link
          href="/dashboard/incoming"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard/incoming")}`}
        >
          Orders
        </Link>
        <Link
          href={`/dashboard/shops/${slug}`}
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive(`/dashboard/shops/${slug}`)}`}
        >
          Profile
        </Link>
        {pro && (
          <Link
            href="/dashboard/reports"
            onClick={onClose}
            className={`block p-3 rounded-lg ${isActive("/dashboard/reports")}`}
          >
            Reports
          </Link>
        )}
        {pro && (
          <Link
            href="/dashboard/pos-integration"
            onClick={onClose}
            className={`block p-3 rounded-lg ${isActive("/dashboard/pos-integration")}`}
          >
            API Integration
          </Link>
        )}
        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className={`block p-3 rounded-lg ${isActive("/dashboard/settings")}`}
        >
          Settings
        </Link>
        {role === "admin" && (
          <Link
            href="/dashboard/admin"
            onClick={onClose}
            className={`block p-3 rounded-lg ${isActive("/dashboard/admin")}`}
          >
            Admin Panel
          </Link>
        )}
      </nav>

      <div className="mt-auto pt-6 border-t space-y-2">
        {!pro && (
          <Link
            href="/dashboard/upgrade"
            onClick={onClose}
            className="block p-3 text-orange-600 font-medium hover:underline"
          >
            Upgrade Plan
          </Link>
        )}
        <button
          type="button"
          onClick={() => logOut()}
          className="w-full text-left p-3 text-red-600 hover:bg-red-50 rounded-lg"
        >
          Logout
        </button>
      </div>
    </>
  );
};
