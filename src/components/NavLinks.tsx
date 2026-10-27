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
  ChevronDown,
  CircleHelp,
  FileText,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Mail,
  Network,
  Package2,
  Palette,
  PanelsTopLeft,
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
  collapsed?: boolean;
}

function CollapsibleSection({
  label,
  open,
  onToggle,
  collapsed,
  children,
}: {
  label: string;
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
  children: ReactNode;
}) {
  if (collapsed) {
    return (
      <div className="space-y-1">
        <div className="mx-2 my-3 border-t border-slate-200" aria-hidden="true" />
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={onToggle}
        className="group flex w-full items-center justify-between rounded-xl px-3 pb-1.5 pt-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
        aria-expanded={open}
      >
        <span>{label}</span>
        <ChevronDown
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? <div className="space-y-1">{children}</div> : null}
    </div>
  );
}

export const NavLinks = ({
  slug,
  pro,
  pathname,
  role,
  onClose,
  collapsed = false,
}: NavLinksProps) => {
  const [sendUsage, setSendUsage] = useState<MonthlySendUsage | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);
  const [websitesOpen, setWebsitesOpen] = useState(true);
  const [networkOpen, setNetworkOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(pathname.startsWith("/admin"));
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
    `flex w-full items-center rounded-xl py-2.5 text-sm font-semibold transition-all ${
      collapsed ? "justify-center gap-0 px-2" : "gap-3 px-3"
    } ${
      active
        ? "bg-emerald-100 text-emerald-800"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const iconClass = "h-[18px] w-[18px] shrink-0";

  const navLink = ({
    href,
    label,
    icon,
    active,
    badge,
  }: {
    href: string;
    label: string;
    icon: ReactNode;
    active: boolean;
    badge?: ReactNode;
  }) => (
    <Link
      href={href}
      onClick={onClose}
      className={navItemClass(active)}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
    >
      {icon}
      {!collapsed ? (
        <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
          <span className="truncate">{label}</span>
          {badge}
        </span>
      ) : null}
    </Link>
  );

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
      <nav className={`min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain ${collapsed ? "pr-0" : "pr-1"}`}>
        {navLink({
          href: "/dashboard",
          label: "Home",
          icon: <LayoutDashboard className={iconClass} aria-hidden="true" />,
          active: pathname === "/dashboard",
        })}

        {navLink({
          href: "/dashboard/communications",
          label: "Communications",
          icon: <Mail className={iconClass} aria-hidden="true" />,
          active:
            pathname === "/dashboard/communications" ||
            pathname.startsWith("/dashboard/communications/"),
        })}

        <CollapsibleSection
          label="BloomWebsites"
          open={websitesOpen}
          onToggle={() => setWebsitesOpen((current) => !current)}
          collapsed={collapsed}
        >
          {navLink({
            href: "/dashboard/websites",
            label: "Overview",
            icon: <Globe2 className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites",
          })}

          {navLink({
            href: "/dashboard/websites/orders",
            label: "Orders",
            icon: <ShoppingBag className={iconClass} aria-hidden="true" />,
            active: websiteOrdersPathIsActive,
          })}

          {navLink({
            href: "/dashboard/websites/products",
            label: "Catalog",
            icon: <Package2 className={iconClass} aria-hidden="true" />,
            active: websiteCatalogPathIsActive,
          })}

          {navLink({
            href: "/dashboard/websites/coupons",
            label: "Coupons",
            icon: <ShoppingBag className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/coupons",
          })}

          {navLink({
            href: "/dashboard/websites/reports",
            label: "Reports",
            icon: <BarChart3 className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/reports",
          })}

          {navLink({
            href: "/dashboard/websites/storefront",
            label: "Storefront",
            icon: <PanelsTopLeft className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/storefront",
          })}

          {navLink({
            href: "/dashboard/websites/branding",
            label: "Branding",
            icon: <Palette className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/branding",
          })}

          {navLink({
            href: "/dashboard/websites/about",
            label: "About Page",
            icon: <BookOpenText className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/about",
          })}

          {navLink({
            href: "/dashboard/websites/weddings",
            label: "Weddings & Events",
            icon: <BookOpenText className={iconClass} aria-hidden="true" />,
            active: pathname.startsWith("/dashboard/websites/weddings"),
          })}

          {navLink({
            href: "/dashboard/websites/seo",
            label: "SEO",
            icon: <Search className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/seo",
          })}

          {navLink({
            href: "/dashboard/websites/launch",
            label: "Launch & Billing",
            icon: <Rocket className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/launch",
          })}

          {navLink({
            href: "/dashboard/websites/domain",
            label: "Domain",
            icon: <Globe2 className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/domain",
          })}

          {navLink({
            href: "/dashboard/websites/integrations/tfpos",
            label: "TFPOS Integration",
            icon: <Cable className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/websites/integrations/tfpos",
          })}
        </CollapsibleSection>

        <CollapsibleSection
          label="GetBloomDirect"
          open={networkOpen}
          onToggle={() => setNetworkOpen((current) => !current)}
          collapsed={collapsed}
        >
          {usageLoading ? (
            <div
              className={`flex cursor-wait items-center rounded-xl py-2.5 text-sm font-semibold text-slate-400 ${
                collapsed ? "justify-center px-2" : "gap-3 px-3"
              }`}
              aria-label="Loading create order availability"
              title={collapsed ? "Create Order" : undefined}
            >
              <PlusCircle className={iconClass} aria-hidden="true" />
              {!collapsed ? <span>Create Order</span> : null}
            </div>
          ) : sendUsage?.allowed !== false ? (
            navLink({
              href: "/dashboard/new-order",
              label: "Create Order",
              icon: <PlusCircle className={iconClass} aria-hidden="true" />,
              active: pathname === "/dashboard/new-order",
            })
          ) : (
            <button
              type="button"
              onClick={handleSendLimitReached}
              className={navItemClass(false)}
              title={collapsed ? "Create Order" : undefined}
              aria-label={collapsed ? "Create Order" : undefined}
            >
              <PlusCircle className={iconClass} aria-hidden="true" />
              {!collapsed ? <span>Create Order</span> : null}
            </button>
          )}

          {navLink({
            href: "/dashboard/incoming",
            label: "Orders",
            icon: <FileText className={iconClass} aria-hidden="true" />,
            active:
              pathname === "/dashboard/incoming" ||
              pathname.startsWith("/dashboard/orders/") ||
              pathname.startsWith("/orders/"),
          })}

          {navLink({
            href: "/dashboard/network",
            label: "Network",
            icon: <Network className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/network",
          })}

          {navLink({
            href: "/dashboard/upgrade",
            label: "Bloom Pro",
            icon: <Sparkles className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/upgrade",
            badge:
              !pro && !collapsed ? (
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-700">
                  Upgrade
                </span>
              ) : undefined,
          })}
        </CollapsibleSection>

        {role === "admin" ? (
          <CollapsibleSection
            label="Administration"
            open={adminOpen}
            onToggle={() => setAdminOpen((current) => !current)}
            collapsed={collapsed}
          >
            {navLink({
              href: "/admin",
              label: "Admin Panel",
              icon: <Store className={iconClass} aria-hidden="true" />,
              active: pathname.startsWith("/admin"),
            })}
          </CollapsibleSection>
        ) : null}
      </nav>

      <div className="mt-4 shrink-0 border-t border-slate-200 pt-4">
        <div
          className={`rounded-2xl border border-purple-100 bg-purple-50/70 ${
            collapsed ? "space-y-1 p-1.5" : "space-y-1 p-2"
          }`}
        >
          {navLink({
            href: `/dashboard/shops/${slug}`,
            label: "Profile",
            icon: <UserRound className={iconClass} aria-hidden="true" />,
            active: pathname === `/dashboard/shops/${slug}`,
          })}

          {navLink({
            href: "/dashboard/settings",
            label: "Settings",
            icon: <Settings className={iconClass} aria-hidden="true" />,
            active: pathname.startsWith("/dashboard/settings"),
          })}
        </div>

        <div className={`mt-2 ${collapsed ? "space-y-1" : "space-y-0.5"}`}>
          {navLink({
            href: "/dashboard/getting-started",
            label: "Getting Started",
            icon: <CircleHelp className={iconClass} aria-hidden="true" />,
            active: pathname === "/dashboard/getting-started",
          })}

          {navLink({
            href: "/support",
            label: "Support",
            icon: <LifeBuoy className={iconClass} aria-hidden="true" />,
            active: pathname === "/support",
          })}
        </div>

        <button
          type="button"
          onClick={logOut}
          className={`mt-2 flex w-full items-center rounded-xl py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 ${
            collapsed ? "justify-center px-2" : "gap-3 px-3"
          }`}
          title={collapsed ? "Logout" : undefined}
          aria-label={collapsed ? "Logout" : undefined}
        >
          <LogOut className={iconClass} aria-hidden="true" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </div>
  );
};
