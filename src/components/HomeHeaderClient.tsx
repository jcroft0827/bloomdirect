"use client";

import {
  ChevronDown,
  CircleUserRound,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Settings,
  X,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

const navItems = [
  { href: "/#websites", label: "BloomWebsites" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#network", label: "GetBloomDirect" },
  { href: "/support", label: "Support" },
  { href: "/#faq", label: "FAQ" },
  { href: "/vision", label: "Vision" },
];

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type SessionUser = {
  name?: string | null;
  email?: string | null;
};

function AccountMenuLink({
  href,
  icon: Icon,
  children,
  onClick,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
    >
      <Icon className="h-4 w-4 text-slate-500" aria-hidden="true" />
      {children}
    </Link>
  );
}

export default function HomeHeaderClient({
  initialIsAuthenticated,
}: {
  initialIsAuthenticated?: boolean;
}) {
  const pathname = usePathname();
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    typeof initialIsAuthenticated === "boolean"
      ? initialIsAuthenticated
        ? "authenticated"
        : "unauthenticated"
      : "loading",
  );
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refreshSession() {
      try {
        const response = await fetch("/api/auth/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok || cancelled) return;

        const session = (await response.json()) as {
          user?: SessionUser | null;
        };

        if (cancelled) return;

        if (session?.user) {
          setSessionUser(session.user);
          setAuthStatus("authenticated");
        } else {
          setSessionUser(null);
          setAuthStatus("unauthenticated");
          setAccountOpen(false);
        }
      } catch {
        // Keep the last known state on a transient request failure. A failed
        // session refresh should not make an authenticated visitor look logged out.
      }
    }

    void refreshSession();

    const handleFocus = () => {
      void refreshSession();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshSession();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [pathname]);

  useEffect(() => {
    if (!accountOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  async function handleSignOut() {
    setSigningOut(true);
    setAccountOpen(false);
    setOpen(false);

    await signOut({ callbackUrl: "/" });
  }

  const accountLabel =
    sessionUser?.name?.trim() || sessionUser?.email?.trim() || "Your account";

  return (
    <header className="relative z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <img src="/logo.svg" alt="" className="h-12 w-12 sm:h-14 sm:w-14" />
          <div className="leading-tight">
            <p className="text-xl font-black tracking-tight text-slate-950">
              GetBloomDirect
            </p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-purple-600">
              Florist technology
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 lg:flex xl:gap-7">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-slate-600 transition hover:text-slate-950"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden min-w-[108px] items-center justify-end gap-3 lg:flex">
          {authStatus === "loading" ? (
            <div
              className="h-11 w-11 animate-pulse rounded-full bg-slate-100"
              aria-label="Checking account status"
            />
          ) : authStatus === "authenticated" ? (
            <div ref={accountMenuRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen((current) => !current)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                aria-label="Open account menu"
                className="flex h-11 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 text-slate-700 shadow-sm transition hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2"
              >
                <CircleUserRound className="h-6 w-6" aria-hidden="true" />
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${accountOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+0.75rem)] w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-3 py-3">
                    <p className="truncate text-sm font-black text-slate-950">
                      {accountLabel}
                    </p>
                    {sessionUser?.name && sessionUser?.email && (
                      <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
                        {sessionUser.email}
                      </p>
                    )}
                  </div>

                  <div className="py-2">
                    <AccountMenuLink
                      href="/dashboard"
                      icon={LayoutDashboard}
                      onClick={() => setAccountOpen(false)}
                    >
                      Dashboard
                    </AccountMenuLink>
                    <AccountMenuLink
                      href="/dashboard/settings"
                      icon={Settings}
                      onClick={() => setAccountOpen(false)}
                    >
                      Account &amp; Shop Settings
                    </AccountMenuLink>
                    <AccountMenuLink
                      href="/support"
                      icon={LifeBuoy}
                      onClick={() => setAccountOpen(false)}
                    >
                      Support
                    </AccountMenuLink>
                  </div>

                  <div className="border-t border-slate-100 pt-2">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      {signingOut ? "Signing out..." : "Sign Out"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2.5 text-sm font-black text-slate-700 transition hover:bg-slate-100"
              >
                Log In
              </Link>
              <Link
                href="/register"
                className="rounded-xl bg-purple-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-purple-800"
              >
                Build Free
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-700 lg:hidden"
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-5 py-5 lg:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                {item.label}
              </Link>
            ))}

            <div className="mt-3 border-t border-slate-100 pt-4">
              {authStatus === "loading" ? (
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" />
              ) : authStatus === "authenticated" ? (
                <div className="space-y-1">
                  <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-3">
                    <CircleUserRound
                      className="h-6 w-6 text-purple-700"
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950">
                        {accountLabel}
                      </p>
                      {sessionUser?.name && sessionUser?.email && (
                        <p className="truncate text-xs font-medium text-slate-500">
                          {sessionUser.email}
                        </p>
                      )}
                    </div>
                  </div>

                  <AccountMenuLink
                    href="/dashboard"
                    icon={LayoutDashboard}
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </AccountMenuLink>
                  <AccountMenuLink
                    href="/dashboard/settings"
                    icon={Settings}
                    onClick={() => setOpen(false)}
                  >
                    Account &amp; Shop Settings
                  </AccountMenuLink>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    {signingOut ? "Signing out..." : "Sign Out"}
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-300 px-4 py-3 text-center text-sm font-black text-slate-700"
                  >
                    Log In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-xl bg-purple-700 px-4 py-3 text-center text-sm font-black text-white"
                  >
                    Build Free
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
