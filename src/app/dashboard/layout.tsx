"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { NavLinks } from "@/components/NavLinks";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [shopName, setShopName] = useState("");
  const [shopLogo, setShopLogo] = useState("Add Logo");
  const [onBoarded, setOnBoarded] = useState(false);
  const today = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());
  const [showNav, setShowNav] = useState(false);

  // Load shop info
  useEffect(() => {
    async function loadShop() {
      try {
        const res = await fetch("/api/shops/me");
        const data = await res.json();

        if (data && data.shop) {
          if (data.shop.onboardingComplete) {
            setOnBoarded(true);
          } else {
            setOnBoarded(false);
          }
          setShopName(data.shop.businessName);
          setShopLogo(data.shop.branding.logo || "Add Logo");
        }

      } catch (err) {
        console.error("Failed to load shop data", err);
      }
    }
    loadShop();
  }, []);

  return (
    <div className="flex h-screen bg-emerald-50 md:p-4 lg:gap-10 lg:p-10 overflow-hidden">
      {/* Desktop Sidebar (Static) */}
      {onBoarded && (
        <aside className="w-64 bg-white border-r flex-col justify-between rounded-2xl shadow-lg hidden lg:flex p-6">
          <div>
            <h2 className="text-xl font-bold mb-8">GetBloomDirect</h2>
            <NavLinks pathname={pathname} />
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
        <NavLinks pathname={pathname} onClose={() => setShowNav(false)} />
      </aside>

      <div className="flex flex-col w-full">
        <header className="flex w-screen py-2 px-4 bg-white mb-5 md:w-full md:rounded-2xl">
          <div className="flex items-center justify-between w-full">
            {/* Logo + Greeting */}
            <div>
              {/* Greeting */}
              {onBoarded ? (
                <div>
                  <h1 className="font-semibold text-gray-700 capitalize md:text-xl lg:text-start lg:text-base xl:text-xl">
                    Welcome back,{" "}
                    <span className="text-purple-600">{shopName}</span>!
                  </h1>
                  <p className="text-gray-500 text-sm hidden md:block lg:text-xs xl:text-sm">
                    You're saving thousands by skipping wire services
                  </p>
                </div>
              ) : (
                <div>
                  <h1 className="font-semibold text-gray-700 capitalize md:text-xl lg:text-start lg:text-base xl:text-xl">
                    Welcome <span className="text-purple-600">{shopName}</span>!
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
              </h2>
            </div>
            {/* Today's Date + Search + Notifications + Emails */}
            <div className="hidden lg:block">
              {/* Today's Date */}
              <div className="border px-4 py-1 rounded-xl shadow-lg font-semibold lg:px-2 cursor-default">
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
