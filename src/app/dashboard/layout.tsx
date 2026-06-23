"use client";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";
import { NavLinks } from "@/components/NavLinks";
import { Bell, Menu, X } from "lucide-react";
import { useSession } from "next-auth/react";

interface Branding {
  logo: string;
}
interface Shop {
  _id: string;
  businessName: string;
  branding: Branding;
  slug: string;
  onboardingComplete: boolean;
  isPro: boolean;
  role: string;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hasRefreshed = useRef(false);

  const [shop, setShop] = useState<Shop | null>(null);
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const [showNav, setShowNav] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load shop info
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

  // load notifications
  async function loadNotifications() {
    if (!shop?._id) return;

    try {
      const res = await fetch(`/api/notifications/${shop?._id}/pull`);
      const data = await res.json();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications", err);
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
  }, [shop?._id]);

  // Click Notification
  const handleClickNotification = async (notification: any) => {
    try {
      if (notification.type === "NewMessage") {
        router.push(
          `/dashboard/orders/messages/${notification.order?._id?.toString?.() || notification.order?.toString?.()}`,
        );
      } else if (notification.type === "NewOrder" || notification.type === "OrderAccepted" || notification.type === "OrderDeclined" || notification.type === "OrderPaid" || notification.type === "OrderComplete" || notification.type === "Rated") {
        // Mark notification as read
        
        // For order update notifications, navigate to the order details page
        router.push(
          `/orders/${notification.order?._id?.toString?.() || notification.order?.toString?.()}`,
        );
      } else {
        // For other notification types, just mark as read for now
      }
      await loadNotifications();
      setShowNotifications(false);
    } catch (error) {
      
    }
  };

  useEffect(() => {
    loadShop();
  }, []);

  useEffect(() => {
    if (shop?._id) {
      loadNotifications();
    }
  }, [shop?._id]);

  return (
    <div className="flex h-screen bg-emerald-50 md:p-4 lg:gap-10 lg:p-10 overflow-hidden">
      {/* Desktop Sidebar (Static) */}
      {shop?.onboardingComplete && (
        <aside className="w-64 bg-white border-r flex-col justify-between rounded-2xl shadow-lg hidden lg:flex p-6">
          <div>
            <h2 className="text-xl font-bold mb-8">GetBloomDirect</h2>
            <NavLinks slug={shop.slug} pro={shop.isPro} pathname={pathname} role={shop.role} />
          </div>
        </aside>
      )}

      {/* Mobile Sidebar (Overlay) */}
      {/* Background Dimmer */}
      {showNav && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowNav(false)}
        />
      )}

      {/* Sliding Menu */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white p-6 shadow-2xl transform transition-transform duration-300 lg:hidden ${showNav ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">Menu</h2>
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

      <div className="flex flex-col w-full">
        <header className="flex w-screen py-2 px-4 bg-white mb-5 md:w-full md:rounded-2xl">
          <div className="flex items-center justify-between w-full">
            {/* Logo + Greeting */}
            <div>
              {/* Greeting */}
              {shop?.onboardingComplete ? (
                <div>
                  <h1 className="font-semibold text-gray-700 capitalize md:text-xl lg:text-start lg:text-base xl:text-xl">
                    Welcome back,{" "}
                    <span className="text-purple-600">
                      {shop?.businessName}
                    </span>
                    !
                  </h1>
                  <p className="text-gray-500 text-sm hidden md:block lg:text-xs xl:text-sm">
                    You're saving thousands by skipping wire services
                  </p>
                </div>
              ) : (
                <div>
                  <h1 className="font-semibold text-gray-700 capitalize md:text-xl lg:text-start lg:text-base xl:text-xl">
                    Welcome{" "}
                    <span className="text-purple-600">
                      {shop?.businessName}
                    </span>
                    !
                  </h1>
                  <p className="text-gray-500 text-sm hidden md:block lg:text-xs xl:text-sm">
                    Please finish your account setup to start sending &
                    receiving orders!
                  </p>
                </div>
              )}
            </div>
            {/* Path */}
            <div className="hidden lg:block">
              <h2 className="text-2xl font-bold text-purple-600 lg:text-xl xl:text-2xl">
                <span
                  className={pathname === "/dashboard" ? "block" : "hidden"}
                >
                  Dashboard
                </span>
                <span
                  className={
                    pathname === "/dashboard/new-order" ? "block" : "hidden"
                  }
                >
                  New Order
                </span>
                <span
                  className={
                    pathname === "/dashboard/incoming" ? "block" : "hidden"
                  }
                >
                  Orders
                </span>
                <span
                  className={
                    pathname === "/dashboard/settings" ? "block" : "hidden"
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
                {shop?.role === "admin" && (
                  <span
                    className={
                      pathname === "/dashboard/admin"
                        ? "block"
                        : "hidden"
                    }
                  >
                    Admin Panel
                  </span>
                )}
              </h2>
            </div>
            {/* Today's Date + Search + Notifications + Emails */}
            <div className="flex gap-2">
              {/* Notifications */}
              <div className="relative">
                <button
                  type="button"
                  className="p-2 rounded-full hover:text-yellow-400 transition-colors"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell size={24} />

                  {notifications.length > 0 && (
                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {notifications.length}
                    </div>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-semibold">Notifications</h3>
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
                            className="hover:bg-gray-100 transition-colors p-2"
                          >
                            <button
                              onClick={() =>
                                handleClickNotification(notification)
                              }
                              className="w-full text-left"
                            >
                              <p>
                                <strong>Type:</strong> {notification.type}
                              </p>
                              <p>
                                <strong>From: </strong>{" "}
                                {notification.sendingShop?.businessName ||
                                  "Unknown"}
                              </p>
                              {notification.message.length > 10 ? (
                                <p>
                                  <strong>Message: </strong>
                                  {notification.message.substring(0, 20)}...
                                </p>
                              ) : (
                                <p>
                                  <strong>Message: </strong>
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

              {/* Today's Date */}
              <div className="hidden lg:block border px-4 py-1 rounded-xl shadow-lg font-semibold lg:px-2 cursor-default">
                {today}
              </div>
            </div>
          </div>

          {/* MOBILE TOGGLE BUTTON */}
          <button className="lg:hidden" onClick={() => setShowNav(true)}>
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
