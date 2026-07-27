"use client";

import {
  Bell,
  Building2,
  ChevronLeft,
  CircleDollarSign,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Send,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

type AdminNavigationProps = {
  userName: string;
  userEmail: string;
};

const navigationItems = [
  {
    name: "Overview",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    name: "Florist Outreach",
    href: "/admin/outreach",
    icon: Send,
  },
  {
    name: "Shops",
    href: "/admin/shops",
    icon: Building2,
  },
  {
    name: "Website Verification",
    href: "/admin/websites",
    icon: Globe2,
  },
  {
    name: "Support",
    href: "/admin/support",
    icon: LifeBuoy,
  },
  {
    name: "Notifications",
    href: "/admin/notifications",
    icon: Bell,
  },
  {
    name: "Billing",
    href: "/admin/billing",
    icon: CircleDollarSign,
  },
];

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminNavigation({
  userName,
  userEmail,
}: AdminNavigationProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/10 bg-slate-950/95 px-4 backdrop-blur lg:hidden">
        <Link
          href="/admin"
          className="text-lg font-bold text-white"
          onClick={closeMobileMenu}
        >
          GetBloomDirect Admin
        </Link>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((current) => !current)}
          className="rounded-lg border border-white/10 p-2 text-slate-300 transition hover:bg-white/5 hover:text-white"
          aria-label="Toggle admin navigation"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close admin navigation"
          onClick={closeMobileMenu}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r
          border-white/10 bg-slate-950 transition-transform duration-200
          lg:translate-x-0
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full"
          }
        `}
      >
        <div className="flex h-20 items-center border-b border-white/10 px-6">
          <Link
            href="/admin"
            className="text-xl font-bold text-white"
            onClick={closeMobileMenu}
          >
            GetBloomDirect
            <span className="mt-1 block text-xs font-semibold uppercase tracking-[0.2em] text-violet-400">
              Admin
            </span>
          </Link>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
          {navigationItems.map((item) => {
            const active = isActiveRoute(pathname, item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`
                  flex items-center gap-3 rounded-xl px-3 py-2.5
                  text-sm font-medium transition
                  ${
                    active
                      ? "bg-violet-500/15 text-violet-300"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-4 rounded-xl bg-white/[0.04] p-3">
            <p className="truncate text-sm font-semibold text-white">
              {userName}
            </p>

            {userEmail && (
              <p className="mt-1 truncate text-xs text-slate-400">
                {userEmail}
              </p>
            )}
          </div>

          <div className="space-y-1">
            <Link
              href="/dashboard"
              onClick={closeMobileMenu}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
              View Florist Dashboard
            </Link>

            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut className="h-5 w-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}