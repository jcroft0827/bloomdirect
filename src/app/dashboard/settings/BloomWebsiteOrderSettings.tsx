"use client";

import {
  CalendarX2,
  Clock3,
  DollarSign,
  PauseCircle,
  PlayCircle,
  Save,
  Send,
  ShoppingBag,
  Workflow,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type BloomWebsiteOrderPolicy = {
  allowsSameDay: boolean;
  sameDayCutoff: string;
  minProductTotal: number | string;
  fulfillmentWorkflow: "simple" | "detailed";
  sendDeliveryConfirmation: boolean;
  noMoreOrdersTodayUntil: string | null;
  noMoreOrdersForDate: string | null;
};

type BloomWebsiteOrderSettingsProps = {
  initialWebsite: any;
};

function getDateInputValue(value: unknown) {
  if (!value) {
    return "";
  }

  const raw = String(value);

  /*
   * Dates stored by the API use a stable YYYY-MM-DD
   * representation at the beginning of the ISO value.
   * Avoid converting through the shopper/browser timezone.
   */
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);

  return match?.[1] ?? "";
}

function getInitialPolicy(website: any): BloomWebsiteOrderPolicy {
  return {
    allowsSameDay: website?.orderPolicy?.allowsSameDay ?? true,

    sameDayCutoff: website?.orderPolicy?.sameDayCutoff || "14:00",

    minProductTotal: website?.orderPolicy?.minProductTotal ?? 0,

    fulfillmentWorkflow:
      website?.orderPolicy?.fulfillmentWorkflow === "detailed"
        ? "detailed"
        : "simple",

    sendDeliveryConfirmation:
      website?.orderPolicy?.sendDeliveryConfirmation !== false,

    noMoreOrdersTodayUntil: website?.orderPolicy?.noMoreOrdersTodayUntil
      ? String(website.orderPolicy.noMoreOrdersTodayUntil)
      : null,

    noMoreOrdersForDate: website?.orderPolicy?.noMoreOrdersForDate
      ? String(website.orderPolicy.noMoreOrdersForDate)
      : null,
  };
}

function getEditableOrderPolicy(policy: BloomWebsiteOrderPolicy) {
  return {
    allowsSameDay: policy.allowsSameDay,
    sameDayCutoff: policy.sameDayCutoff,
    minProductTotal: policy.minProductTotal,
    fulfillmentWorkflow: policy.fulfillmentWorkflow,
    sendDeliveryConfirmation: policy.sendDeliveryConfirmation,
  };
}

function formatTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const [hourString, minute] = value.split(":");

  const hour = Number(hourString);

  const suffix = hour >= 12 ? "PM" : "AM";

  const displayHour = hour % 12 || 12;

  return `${displayHour}:${minute} ${suffix}`;
}

export default function BloomWebsiteOrderSettings({
  initialWebsite,
}: BloomWebsiteOrderSettingsProps) {
  const router = useRouter();

  const [policy, setPolicy] = useState<BloomWebsiteOrderPolicy>(() =>
    getInitialPolicy(initialWebsite),
  );

  const [savedPolicy, setSavedPolicy] = useState<BloomWebsiteOrderPolicy>(() =>
    getInitialPolicy(initialWebsite),
  );

  const [blockedDate, setBlockedDate] = useState(() =>
    getDateInputValue(initialWebsite?.orderPolicy?.noMoreOrdersForDate),
  );

  const [isSaving, setIsSaving] = useState(false);

  const [isUpdatingPause, setIsUpdatingPause] = useState(false);

  const [isUpdatingBlockedDate, setIsUpdatingBlockedDate] = useState(false);

  useEffect(() => {
    const nextPolicy = getInitialPolicy(initialWebsite);
    setPolicy(nextPolicy);
    setSavedPolicy(nextPolicy);

    setBlockedDate(
      getDateInputValue(initialWebsite?.orderPolicy?.noMoreOrdersForDate),
    );
  }, [initialWebsite]);

  useSettingsSectionDirty(
    {
      id: "website-orders",
      label: "Website Orders",
      anchorId: "website-orders",
    },
    !settingsValuesEqual(
      getEditableOrderPolicy(policy),
      getEditableOrderPolicy(savedPolicy),
    ),
  );

  const isPausedToday =
    Boolean(policy.noMoreOrdersTodayUntil) &&
    new Date(policy.noMoreOrdersTodayUntil!).getTime() > Date.now();

  async function patchOrderPolicy(updates: Record<string, unknown>) {
    const response = await fetch("/api/websites/settings", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        section: "orderPolicy",
        data: updates,
      }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.error || "Unable to update website settings.");
    }

    return data.website;
  }

  async function handleSavePolicy() {
    if (isSaving) {
      return;
    }

    const minimum = Number(policy.minProductTotal);

    if (!Number.isFinite(minimum) || minimum < 0) {
      toast.error("Minimum product total must be 0 or greater.");

      return;
    }

    if (policy.allowsSameDay && !/^\d{2}:\d{2}$/.test(policy.sameDayCutoff)) {
      toast.error("Choose a valid same-day cutoff time.");

      return;
    }

    setIsSaving(true);

    try {
      const website = await patchOrderPolicy({
        allowsSameDay: policy.allowsSameDay,

        sameDayCutoff: policy.sameDayCutoff,

        minProductTotal: Math.round(minimum * 100) / 100,
        fulfillmentWorkflow: policy.fulfillmentWorkflow,
        sendDeliveryConfirmation: policy.sendDeliveryConfirmation,
      });

      const nextPolicy = getInitialPolicy(website);
      setPolicy(nextPolicy);
      setSavedPolicy(nextPolicy);

      toast.success("Website order settings saved.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save website order settings.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePauseToggle() {
    if (isUpdatingPause) {
      return;
    }

    setIsUpdatingPause(true);

    try {
      const website = await patchOrderPolicy({
        pauseOrdersToday: !isPausedToday,
      });

      setPolicy(getInitialPolicy(website));

      toast.success(
        isPausedToday
          ? "Website orders resumed."
          : "Website orders stopped for today.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update website availability.",
      );
    } finally {
      setIsUpdatingPause(false);
    }
  }

  async function handleBlockedDate() {
    if (!blockedDate || isUpdatingBlockedDate) {
      return;
    }

    setIsUpdatingBlockedDate(true);

    try {
      const website = await patchOrderPolicy({
        blockedDate,
      });

      setPolicy(getInitialPolicy(website));

      setBlockedDate(
        getDateInputValue(website?.orderPolicy?.noMoreOrdersForDate),
      );

      toast.success("Delivery date blocked.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to block delivery date.",
      );
    } finally {
      setIsUpdatingBlockedDate(false);
    }
  }

  async function handleClearBlockedDate() {
    if (isUpdatingBlockedDate) {
      return;
    }

    setIsUpdatingBlockedDate(true);

    try {
      const website = await patchOrderPolicy({
        blockedDate: null,
      });

      setPolicy(getInitialPolicy(website));

      setBlockedDate("");

      toast.success("Blocked delivery date cleared.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to clear blocked delivery date.",
      );
    } finally {
      setIsUpdatingBlockedDate(false);
    }
  }

  useSettingsSectionActions("website-orders", {
    save: handleSavePolicy,
    discard: () => setPolicy(savedPolicy),
    isSaving,
  });

  return (
    <section
      id="website-orders"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <ShoppingBag size={21} />
          </div>

          <div>
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Website Orders
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Control when customers can place BloomWebsite orders and how
              your team works through fulfillment. These settings do not
              affect GetBloomDirect.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {/* SAME DAY */}
        <div>
          <div className="flex items-start justify-between gap-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
            <div className="flex gap-3">
              <Clock3 size={20} className="mt-0.5 shrink-0 text-purple-700" />

              <div>
                <p className="font-black text-gray-950">
                  Same-Day Website Orders
                </p>

                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  Allow customers to choose today as their delivery date until
                  your website cutoff time.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={policy.allowsSameDay}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,

                  allowsSameDay: event.target.checked,
                }))
              }
              className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
          </div>

          {policy.allowsSameDay ? (
            <div className="mt-5">
              <label className="text-sm font-black text-gray-800">
                Website Same-Day Cutoff
              </label>

              <input
                type="time"
                value={policy.sameDayCutoff}
                onChange={(event) =>
                  setPolicy((current) => ({
                    ...current,

                    sameDayCutoff: event.target.value,
                  }))
                }
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100 sm:max-w-xs"
              />

              <p className="mt-2 text-xs leading-5 text-gray-500">
                Your storefront&apos;s same-day countdown and checkout
                eligibility use this cutoff in your florist timezone.
              </p>
            </div>
          ) : null}
        </div>

        {/* MINIMUM */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <div className="flex items-center gap-2">
            <DollarSign size={18} className="text-purple-700" />

            <h4 className="font-black text-gray-950">Minimum Website Order</h4>
          </div>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Set the minimum merchandise subtotal required before delivery fees
            and future taxes are added.
          </p>

          <div className="relative mt-4 max-w-xs">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-black text-gray-400">
              $
            </span>

            <input
              type="number"
              min="0"
              step="0.01"
              value={policy.minProductTotal}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,

                  minProductTotal: event.target.value,
                }))
              }
              className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-8 pr-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
            />
          </div>

          <p className="mt-2 text-xs leading-5 text-gray-500">
            Use $0.00 if you do not want a minimum.
          </p>
        </div>

        {/* FULFILLMENT WORKFLOW */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <div className="flex items-center gap-2">
            <Workflow size={18} className="text-purple-700" />
            <h4 className="font-black text-gray-950">Order Workflow</h4>
          </div>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Choose how much fulfillment tracking you want inside
            BloomWebsites. Detailed milestones are optional and can always be
            skipped when your POS or team already handles the workflow.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                setPolicy((current) => ({
                  ...current,
                  fulfillmentWorkflow: "simple",
                }))
              }
              className={`rounded-2xl border p-4 text-left transition ${
                policy.fulfillmentWorkflow === "simple"
                  ? "border-purple-300 bg-purple-50 ring-2 ring-purple-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="font-black text-gray-950">Simple</p>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Keep the portal lightweight: Placed → Delivered or Picked Up.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setPolicy((current) => ({
                  ...current,
                  fulfillmentWorkflow: "detailed",
                }))
              }
              className={`rounded-2xl border p-4 text-left transition ${
                policy.fulfillmentWorkflow === "detailed"
                  ? "border-purple-300 bg-purple-50 ring-2 ring-purple-100"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <p className="font-black text-gray-950">Detailed</p>
              <p className="mt-1 text-sm leading-5 text-gray-500">
                Track preparation, readiness, delivery progress, and completion.
              </p>
            </button>
          </div>
        </div>

        {/* DELIVERY CONFIRMATION */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <div className="flex items-start justify-between gap-5 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 sm:p-5">
            <div className="flex gap-3">
              <Send size={20} className="mt-0.5 shrink-0 text-purple-700" />
              <div>
                <p className="font-black text-gray-950">
                  Customer Delivery Confirmation
                </p>
                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  Send the customer a delivery-confirmation email when this
                  portal marks a delivery order delivered. Turn this off if
                  your POS already sends that message.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={policy.sendDeliveryConfirmation}
              onChange={(event) =>
                setPolicy((current) => ({
                  ...current,
                  sendDeliveryConfirmation: event.target.checked,
                }))
              }
              className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* SAVE NORMAL POLICY */}
        <div className="mt-7 flex justify-end">
          <button
            type="button"
            onClick={handleSavePolicy}
            disabled={isSaving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-5 py-3 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
          >
            <Save size={17} />

            {isSaving ? "Saving..." : "Save Website Order Settings"}
          </button>
        </div>

        {/* TODAY */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <div className="flex items-center gap-2">
            <PauseCircle size={18} className="text-purple-700" />

            <h4 className="font-black text-gray-950">
              Today&apos;s Order Availability
            </h4>
          </div>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Need to stop taking website orders for the rest of the day? This
            affects BloomWebsites only.
          </p>

          <div
            className={`mt-4 rounded-2xl border p-4 sm:flex sm:items-center sm:justify-between sm:gap-5 ${
              isPausedToday
                ? "border-amber-200 bg-amber-50"
                : "border-emerald-200 bg-emerald-50"
            }`}
          >
            <div>
              <p
                className={`font-black ${
                  isPausedToday ? "text-amber-950" : "text-emerald-950"
                }`}
              >
                {isPausedToday
                  ? "Website orders are stopped for today."
                  : "Website orders are open today."}
              </p>

              <p
                className={`mt-1 text-sm leading-5 ${
                  isPausedToday ? "text-amber-800" : "text-emerald-800"
                }`}
              >
                {isPausedToday
                  ? "Customers will not be able to select today for delivery."
                  : policy.allowsSameDay
                    ? `Same-day orders remain available until ${formatTime(
                        policy.sameDayCutoff,
                      )}.`
                    : "Same-day delivery is currently disabled."}
              </p>
            </div>

            <button
              type="button"
              onClick={handlePauseToggle}
              disabled={isUpdatingPause}
              className={`mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 sm:mt-0 sm:w-auto ${
                isPausedToday
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "bg-amber-700 text-white hover:bg-amber-800"
              }`}
            >
              {isPausedToday ? (
                <PlayCircle size={17} />
              ) : (
                <PauseCircle size={17} />
              )}

              {isUpdatingPause
                ? "Updating..."
                : isPausedToday
                  ? "Resume Website Orders"
                  : "Stop Website Orders for Today"}
            </button>
          </div>
        </div>

        {/* BLOCK DATE */}
        <div className="mt-8 border-t border-gray-100 pt-7">
          <div className="flex items-center gap-2">
            <CalendarX2 size={18} className="text-purple-700" />

            <h4 className="font-black text-gray-950">Block a Delivery Date</h4>
          </div>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Temporarily prevent customers from selecting one specific date on
            your BloomWebsite. Shared shop-wide blackout dates remain separate.
          </p>

          {policy.noMoreOrdersForDate ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-black text-amber-950">
                Currently blocked
              </p>

              <p className="mt-1 text-sm text-amber-800">
                {getDateInputValue(policy.noMoreOrdersForDate)}
              </p>
            </div>
          ) : null}

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="w-full sm:max-w-xs">
              <span className="text-sm font-black text-gray-800">
                Delivery Date
              </span>

              <input
                type="date"
                value={blockedDate}
                onChange={(event) => setBlockedDate(event.target.value)}
                className="mt-2 h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-950 outline-none transition focus:border-purple-300 focus:bg-white focus:ring-4 focus:ring-purple-100"
              />
            </label>

            <button
              type="button"
              onClick={handleBlockedDate}
              disabled={!blockedDate || isUpdatingBlockedDate}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-gray-950 px-5 py-3 text-sm font-black text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500"
            >
              {isUpdatingBlockedDate ? "Updating..." : "Block Date"}
            </button>

            {policy.noMoreOrdersForDate ? (
              <button
                type="button"
                onClick={handleClearBlockedDate}
                disabled={isUpdatingBlockedDate}
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear Blocked Date
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
