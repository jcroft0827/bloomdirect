"use client";

import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { NavLinks } from "@/components/NavLinks";
import { Bell, Menu, X } from "lucide-react";
import { SettingsDirtyStateProvider } from "./settings/SettingsDirtyState";
import SettingsNavigationGuard from "./settings/SettingsNavigationGuard";

interface Branding {
  logo: string;
}

interface Shop {
  _id: string;
  businessName: string;
  branding: Branding;
  slug: string;
  isPro: boolean;
  role: string;
  isSuspended: boolean;
  suspensionReason?: string;
}

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [shop, setShop] = useState<Shop | null>(null);

  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

  const [showNav, setShowNav] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  async function loadShop() {
    try {
      const res = await fetch("/api/shops/me");
      const data = await res.json();

      if (data?.shop) {
        setShop(data.shop);
        console.log("Shop data loaded:", data.shop);
      }
    } catch (err) {
      console.error("Failed to load shop data", err);
    }
  }

  async function loadNotifications() {
    try {
      const res = await fetch("/api/notifications/pull");

      if (!res.ok) {
        const errorText = await res.text();

        throw new Error(
          `Failed to load notifications (${res.status}): ${errorText}`,
        );
      }

      const data = await res.json();

      setNotifications(data.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications", err);
      setNotifications([]);
    }
  }

  useEffect(() => {
    function handleRefreshNotifications() {
      loadNotifications();
    }

    window.addEventListener(
      "refresh-notifications",
      handleRefreshNotifications,
    );

    return () => {
      window.removeEventListener(
        "refresh-notifications",
        handleRefreshNotifications,
      );
    };
  }, []);

  const handleClickNotification = async (notification: any) => {
    try {
      if (notification.type === "NewMessage") {
        router.push(
          `/dashboard/orders/messages/${
            notification.order?._id?.toString?.() ||
            notification.order?.toString?.()
          }`,
        );
      } else if (
        notification.type === "NewOrder" ||
        notification.type === "OrderAccepted" ||
        notification.type === "OrderDeclined" ||
        notification.type === "OrderPaid" ||
        notification.type === "OrderComplete" ||
        notification.type === "Rated"
      ) {
        router.push(
          `/orders/${
            notification.order?._id?.toString?.() ||
            notification.order?.toString?.()
          }`,
        );
      }

      await loadNotifications();
      setShowNotifications(false);
    } catch (error) {}
  };

  useEffect(() => {
    loadShop();
  }, []);

  useEffect(() => {
    loadNotifications();
  }, []);

  if (shop?.isSuspended) {
    return (
      <div className="min-h-screen bg-emerald-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl items-center justify-center">
          <div className="w-full overflow-hidden rounded-3xl border border-red-200 bg-white shadow-xl">
            <div className="border-b border-red-100 bg-red-50 px-6 py-8 sm:px-8">
              <p className="text-sm font-bold uppercase tracking-widest text-red-600">
                Account Suspended
              </p>

              <h1 className="mt-2 text-3xl font-black text-slate-900">
                Your GetBloomDirect account is currently suspended.
              </h1>

              <p className="mt-3 max-w-2xl text-slate-600">
                Access to GetBloomDirect has been temporarily restricted for{" "}
                <span className="font-semibold text-slate-800">
                  {shop.businessName}
                </span>
                .
              </p>
            </div>

            <div className="space-y-6 px-6 py-8 sm:px-8">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Reason
                </p>

                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-slate-700">
                    {shop.suspensionReason?.trim() ||
                      "No additional suspension details were provided."}
                  </p>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  What should I do next?
                </h2>

                <p className="mt-2 text-slate-600">
                  If you believe this suspension was made in error or need help
                  resolving the issue, contact GetBloomDirect. We&apos;ll review
                  the account and help you determine the next steps.
                </p>
              </div>

              <a
                href="mailto:getbloomdirect@gmail.com?subject=GetBloomDirect%20Account%20Suspension"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-purple-700 px-6 py-3 font-bold text-white transition hover:bg-purple-800 focus:outline-none focus:ring-4 focus:ring-purple-200"
              >
                Contact GetBloomDirect
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <SettingsDirtyStateProvider>
      <SettingsNavigationGuard />

      <div className="flex h-screen overflow-hidden bg-emerald-50 md:p-4 lg:gap-4 xl:gap-6 xl:p-6 2xl:gap-8 2xl:p-8 print:block print:h-auto print:overflow-visible print:bg-white print:p-0">
        {/* Desktop Sidebar */}
        {shop && (
          <aside className="hidden h-full min-h-0 w-56 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-lg lg:flex xl:w-64 print:!hidden">
            <div className="mb-5 flex shrink-0 items-center gap-3 border-b border-slate-100 pb-5">
              <img src="/logo.svg" alt="" className="h-9 w-9" />

              <div className="min-w-0">
                <h2 className="truncate text-lg font-black text-slate-900">
                  GetBloomDirect
                </h2>

                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-600">
                  Florist technology
                </p>
              </div>
            </div>

            <NavLinks
              slug={shop.slug}
              pro={shop.isPro}
              pathname={pathname}
              role={shop.role}
            />
          </aside>
        )}

        {/* Mobile Sidebar Overlay */}
        {showNav && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden print:hidden"
            onClick={() => setShowNav(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-72 transform flex-col overflow-hidden bg-white p-5 shadow-2xl transition-transform duration-300 lg:hidden print:hidden ${
            showNav ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="mb-5 flex shrink-0 items-center justify-between border-b border-slate-100 pb-5">
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="" className="h-9 w-9" />

              <div>
                <h2 className="text-lg font-black text-slate-900">Menu</h2>

                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-600">
                  GetBloomDirect
                </p>
              </div>
            </div>

            <button onClick={() => setShowNav(false)}>
              <X size={24} />
            </button>
          </div>

          <NavLinks
            slug={shop?.slug || ""}
            pro={shop?.isPro || false}
            pathname={pathname}
            onClose={() => setShowNav(false)}
            role={shop?.role || ""}
          />
        </aside>

        {/* Main Dashboard Workspace */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col print:block print:w-full">
          <header className="mb-5 flex w-full shrink-0 bg-white px-4 py-2 md:rounded-2xl print:hidden">
            <div className="flex w-full items-center justify-between">
              {/* Greeting */}
              <div>
                <h1 className="font-semibold capitalize text-gray-700 md:text-xl xl:text-start xl:text-base 2xl:text-xl">
                  Welcome back,{" "}
                  <span className="text-purple-600">
                    {shop?.businessName}
                  </span>
                  !
                </h1>

                <p className="hidden text-sm text-gray-500 md:block xl:text-xs 2xl:text-sm">
                  Everything you need to run your flower shop.
                </p>
              </div>

              {/* Current Page */}
              <div className="hidden xl:block">
                <h2 className="text-2xl font-bold text-purple-600 xl:text-xl 2xl:text-2xl">
                  <span
                    className={
                      pathname === "/dashboard" ? "block" : "hidden"
                    }
                  >
                    Dashboard
                  </span>

                  <span
                    className={
                      pathname === "/dashboard/new-order"
                        ? "block"
                        : "hidden"
                    }
                  >
                    New Order
                  </span>

                  <span
                    className={
                      pathname === "/dashboard/network"
                        ? "block"
                        : "hidden"
                    }
                  >
                    Network
                  </span>

                  <span
                    className={
                      pathname === "/dashboard/incoming"
                        ? "block"
                        : "hidden"
                    }
                  >
                    Orders
                  </span>

                  <span
                    className={
                      pathname.startsWith("/dashboard/websites/orders")
                        ? "block"
                        : "hidden"
                    }
                  >
                    Website Orders
                  </span>

                  <span
                    className={
                      pathname === "/dashboard/settings"
                        ? "block"
                        : "hidden"
                    }
                  >
                    Settings
                  </span>

                  <span
                    className={
                      pathname === "/dashboard/pos-integration"
                        ? "block"
                        : "hidden"
                    }
                  >
                    POS Integration
                  </span>

                  <span
                    className={
                      pathname === "/dashboard/getting-started"
                        ? "block"
                        : "hidden"
                    }
                  >
                    Getting Started
                  </span>

                  {shop?.role === "admin" && (
                    <span
                      className={
                        pathname === "/admin" ? "block" : "hidden"
                      }
                    >
                      Admin Panel
                    </span>
                  )}
                </h2>
              </div>

              {/* Notifications / Date */}
              <div className="flex gap-2">
                <div className="relative">
                  <button
                    type="button"
                    className="rounded-full p-2 transition-colors hover:text-yellow-400"
                    onClick={() =>
                      setShowNotifications(!showNotifications)
                    }
                  >
                    <Bell size={24} />

                    {notifications.length > 0 && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                        {notifications.length}
                      </div>
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-white shadow-lg">
                      <div className="border-b p-4">
                        <h3 className="text-lg font-semibold">
                          Notifications
                        </h3>
                      </div>

                      <div className="max-h-60 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="p-4 text-gray-500">
                            No new notifications
                          </p>
                        ) : (
                          notifications.map((notification: any) => (
                            <div
                              key={notification._id}
                              className="p-2 transition-colors hover:bg-gray-100"
                            >
                              <button
                                onClick={() =>
                                  handleClickNotification(notification)
                                }
                                className="w-full text-left"
                              >
                                <p>
                                  <strong>Type:</strong>{" "}
                                  {notification.type}
                                </p>

                                <p>
                                  <strong>From:</strong>{" "}
                                  {notification.sendingShop?.businessName ||
                                    "Unknown"}
                                </p>

                                {notification.message.length > 10 ? (
                                  <p>
                                    <strong>Message:</strong>{" "}
                                    {notification.message.substring(0, 20)}
                                    ...
                                  </p>
                                ) : (
                                  <p>
                                    <strong>Message:</strong>{" "}
                                    {notification.message}
                                  </p>
                                )}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="hidden cursor-default rounded-xl border px-4 py-1 font-semibold shadow-lg xl:block xl:px-2">
                  {today}
                </div>
              </div>
            </div>

            {/* Mobile Nav Button */}
            <button
              className="lg:hidden"
              onClick={() => setShowNav(true)}
            >
              <Menu size={24} />
            </button>
          </header>

          <main className="min-h-0 flex-1 overflow-auto overscroll-contain print:block print:overflow-visible">
            {children}
          </main>
        </div>
      </div>
    </SettingsDirtyStateProvider>
  );
}