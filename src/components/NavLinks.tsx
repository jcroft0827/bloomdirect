// src/components/NavLinks.tsx

"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  BookOpenText,
  Cable,
  CircleHelp,
  FileText,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Network,
  Package2,
  Palette,
  PlugZap,
  PlusCircle,
  Rocket,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  UserRound,
} from "lucide-react";

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

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 first:pt-0">
      {children}
    </p>
  );
}

export const NavLinks = ({
  slug,
  pro,
  pathname,
  role,
  onClose,
}: NavLinksProps) => {
  const [sendUsage, setSendUsage] = useState<MonthlySendUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const router = useRouter();

  const websiteOrdersPathIsActive =
    pathname === "/dashboard/websites/orders" ||
    pathname.startsWith("/dashboard/websites/orders/");

  const websiteCatalogPathIsActive =
    pathname === "/dashboard/websites/products" ||
    pathname.startsWith("/dashboard/websites/products/") ||
    pathname.startsWith("/dashboard/websites/addons/");

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
    `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
      active
        ? "bg-emerald-100 text-emerald-800"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const iconClass = "h-[18px] w-[18px] shrink-0";

  const logOut = async () => {
    await signOut({ redirect: false });
    onClose?.();
    router.push("/");
    router.refresh();
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
    <div className="flex min-h-0 flex-1 flex-col">
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-1">
        <Link
          href="/dashboard"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard")}
        >
          <LayoutDashboard className={iconClass} aria-hidden="true" />
          <span>Dashboard</span>
        </Link>

        <SectionLabel>GetBloomDirect</SectionLabel>

        {usageLoading ? (
          <span className="flex cursor-wait items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400">
            <PlusCircle className={iconClass} aria-hidden="true" />
            Create Order
          </span>
        ) : sendUsage?.allowed !== false ? (
          <Link
            href="/dashboard/new-order"
            onClick={onClose}
            className={navItemClass(pathname === "/dashboard/new-order")}
          >
            <PlusCircle className={iconClass} aria-hidden="true" />
            <span>Create Order</span>
          </Link>
        ) : (
          <button
            type="button"
            onClick={handleSendLimitReached}
            className={navItemClass(false)}
          >
            <PlusCircle className={iconClass} aria-hidden="true" />
            <span>Create Order</span>
          </button>
        )}

        <Link
          href="/dashboard/incoming"
          onClick={onClose}
          className={navItemClass(
            pathname === "/dashboard/incoming" ||
              pathname.startsWith("/dashboard/orders/") ||
              pathname.startsWith("/orders/"),
          )}
        >
          <FileText className={iconClass} aria-hidden="true" />
          <span>Orders</span>
        </Link>

        <Link
          href="/dashboard/network"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/network")}
        >
          <Network className={iconClass} aria-hidden="true" />
          <span>Network</span>
        </Link>

        <Link
          href="/dashboard/upgrade"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/upgrade")}
        >
          <Sparkles className={iconClass} aria-hidden="true" />
          <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
            <span>Bloom Pro</span>
            {!pro && (
              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-700">
                Upgrade
              </span>
            )}
          </span>
        </Link>

        <SectionLabel>BloomWebsites</SectionLabel>

        <Link
          href="/dashboard/websites"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites")}
        >
          <Globe2 className={iconClass} aria-hidden="true" />
          <span>Overview</span>
        </Link>

        <Link
          href="/dashboard/websites/orders"
          onClick={onClose}
          className={navItemClass(websiteOrdersPathIsActive)}
        >
          <ShoppingBag className={iconClass} aria-hidden="true" />
          <span>Orders</span>
        </Link>

        <Link
          href="/dashboard/websites/products"
          onClick={onClose}
          className={navItemClass(websiteCatalogPathIsActive)}
        >
          <Package2 className={iconClass} aria-hidden="true" />
          <span>Catalog</span>
        </Link>

        <Link
          href="/dashboard/websites/reports"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites/reports")}
        >
          <BarChart3 className={iconClass} aria-hidden="true" />
          <span>Reports</span>
        </Link>

        <Link
          href="/dashboard/websites/branding"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites/branding")}
        >
          <Palette className={iconClass} aria-hidden="true" />
          <span>Branding</span>
        </Link>

        <Link
          href="/dashboard/websites/about"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites/about")}
        >
          <BookOpenText className={iconClass} aria-hidden="true" />
          <span>About Page</span>
        </Link>

        <Link
          href="/dashboard/websites/seo"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites/seo")}
        >
          <Search className={iconClass} aria-hidden="true" />
          <span>SEO</span>
        </Link>

        <Link
          href="/dashboard/websites/launch"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites/launch")}
        >
          <Rocket className={iconClass} aria-hidden="true" />
          <span>Launch &amp; Billing</span>
        </Link>

        <Link
          href="/dashboard/websites/domain"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/websites/domain")}
        >
          <Globe2 className={iconClass} aria-hidden="true" />
          <span>Domain</span>
        </Link>

        <Link
          href="/dashboard/websites/integrations/tfpos"
          onClick={onClose}
          className={navItemClass(
            pathname === "/dashboard/websites/integrations/tfpos",
          )}
        >
          <Cable className={iconClass} aria-hidden="true" />
          <span>TFPOS Integration</span>
        </Link>

        <SectionLabel>My Shop</SectionLabel>

        <Link
          href={`/dashboard/shops/${slug}`}
          onClick={onClose}
          className={navItemClass(pathname === `/dashboard/shops/${slug}`)}
        >
          <UserRound className={iconClass} aria-hidden="true" />
          <span>Public Profile</span>
        </Link>

        <Link
          href="/dashboard/settings"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/settings")}
        >
          <Settings className={iconClass} aria-hidden="true" />
          <span>Settings</span>
        </Link>

        {role === "admin" && (
          <>
            <SectionLabel>Administration</SectionLabel>
            <Link
              href="/admin"
              onClick={onClose}
              className={navItemClass(pathname.startsWith("/admin"))}
            >
              <Store className={iconClass} aria-hidden="true" />
              <span>Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 shrink-0 space-y-1 border-t border-slate-200 pt-4">
        <Link
          href="/dashboard/getting-started"
          onClick={onClose}
          className={navItemClass(pathname === "/dashboard/getting-started")}
        >
          <CircleHelp className={iconClass} aria-hidden="true" />
          <span>Getting Started</span>
        </Link>

        <Link
          href="/support"
          onClick={onClose}
          className={navItemClass(pathname === "/support")}
        >
          <LifeBuoy className={iconClass} aria-hidden="true" />
          <span>Support</span>
        </Link>

        <button
          type="button"
          onClick={logOut}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"
        >
          <LogOut className={iconClass} aria-hidden="true" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
