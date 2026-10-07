"use client";

import { AlertTriangle } from "lucide-react";
import { useState } from "react";

import SettingsClient from "./SettingsClient";
import BloomWebsiteSettingsOverview from "./BloomWebsiteSettingsOverview";
import SettingsAreaNavigation, {
  type SettingsArea,
} from "./SettingsAreaNavigation";
import SharedSettingsOverview from "./SharedSettingsOverview";
import SettingsQuickNavigation, {
  type SettingsQuickNavItem,
} from "./SettingsQuickNavigation";
import { useSettingsDirtyState } from "./SettingsDirtyState";
import SettingsUnsavedChangesBar from "./SettingsUnsavedChangesBar";

const quickNavByArea: Record<SettingsArea, SettingsQuickNavItem[]> = {
  shared: [
    { id: "shared-business-information", label: "Business Information" },
    { id: "shared-delivery-area", label: "Delivery Area" },
  ],
  getbloomdirect: [
    { id: "payment-methods", label: "Payment Methods" },
    { id: "delivery-settings", label: "Order Settings" },
    { id: "financial-settings", label: "Taxes & Fees" },
    { id: "public-profile", label: "Public Profile" },
    { id: "security-settings", label: "Security" },
  ],
  bloomwebsites: [
    { id: "website-orders", label: "Website Orders" },
    { id: "website-product-display", label: "Product Display" },
    { id: "website-payments", label: "Payments" },
    { id: "website-taxes", label: "Taxes & Tips" },
    { id: "website-announcement", label: "Announcement" },
    { id: "website-contact-display", label: "Contact & Display" },
    { id: "website-pickup", label: "Pickup" },
  ],
};

type SettingsV2ShellProps = {
  initialShop: any;
  initialWebsite: any | null;
};

export default function SettingsV2Shell({
  initialShop,
  initialWebsite,
}: SettingsV2ShellProps) {
  const [activeArea, setActiveArea] = useState<SettingsArea>("shared");
  const [pendingArea, setPendingArea] = useState<SettingsArea | null>(null);
  const { hasUnsavedChanges, discardAllDirtySections } =
    useSettingsDirtyState();

  function handleAreaChange(area: SettingsArea) {
    if (area === activeArea) {
      return;
    }

    if (hasUnsavedChanges) {
      setPendingArea(area);
      return;
    }

    setActiveArea(area);
  }

  function discardAndSwitch() {
    if (!pendingArea) {
      return;
    }

    const nextArea = pendingArea;
    discardAllDirtySections();
    setPendingArea(null);
    setActiveArea(nextArea);
  }

  return (
    <>
      <div
        className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${
          hasUnsavedChanges ? "pb-32 sm:pb-28" : "pb-12"
        }`}
      >
        {/* PAGE HEADER */}
        <div className="pb-6 pt-2 sm:pb-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
            Shop Settings
          </p>

          <h1 className="mt-2 text-3xl font-black tracking-tight text-gray-950 sm:text-4xl">
            Manage your shop.
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600 sm:text-base">
            Manage the information and preferences used by your shop across
            GetBloomDirect and BloomWebsites.
          </p>
        </div>

        {/* PRODUCT / DOMAIN NAVIGATION */}
        <SettingsAreaNavigation
          activeArea={activeArea}
          onChange={handleAreaChange}
        />

        {(activeArea !== "bloomwebsites" || initialWebsite) && (
          <SettingsQuickNavigation items={quickNavByArea[activeArea]} />
        )}

        <div className="mt-6 rounded-[2rem] border border-gray-200 bg-gray-50/70 p-4 shadow-sm sm:p-6 lg:p-8">
          {activeArea === "shared" && (
            <SharedSettingsOverview initialShop={initialShop} />
          )}

          {activeArea === "getbloomdirect" && (
            <div>
              <div className="mb-7">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-purple-600">
                  GetBloomDirect
                </p>

                <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 sm:text-3xl">
                  Network settings
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
                  These are your current GetBloomDirect settings. We&apos;ll
                  reorganize them into the new structure without changing their
                  behavior.
                </p>
              </div>

              <div className="-mx-2 sm:mx-0">
                <SettingsClient initialShop={initialShop} />
              </div>
            </div>
          )}

          {activeArea === "bloomwebsites" &&
            (initialWebsite ? (
              <BloomWebsiteSettingsOverview initialWebsite={initialWebsite} />
            ) : (
              <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                <h2 className="text-xl font-black text-gray-950">
                  BloomWebsites isn&apos;t set up yet.
                </h2>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-500">
                  Create your BloomWebsite first, then its storefront settings
                  will appear here.
                </p>
              </div>
            ))}
        </div>
      </div>

      <SettingsUnsavedChangesBar />

      {pendingArea && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-gray-950/40 px-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="unsaved-settings-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <AlertTriangle size={23} />
            </div>

            <h2
              id="unsaved-settings-title"
              className="mt-5 text-xl font-black tracking-tight text-gray-950"
            >
              You have unsaved changes.
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-600">
              Save your changes before switching settings areas, or discard them
              to continue.
            </p>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPendingArea(null)}
                className="min-h-11 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-black text-gray-700 transition hover:bg-gray-50"
              >
                Keep editing
              </button>

              <button
                type="button"
                onClick={discardAndSwitch}
                className="min-h-11 rounded-full bg-gray-950 px-5 py-2.5 text-sm font-black text-white transition hover:bg-gray-800"
              >
                Discard & switch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
