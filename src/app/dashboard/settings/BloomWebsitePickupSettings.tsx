"use client";

import {
  Clock3,
  MapPin,
  PackageCheck,
  PauseCircle,
  Save,
  ShoppingBag,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import {
  settingsValuesEqual,
  useSettingsSectionActions,
  useSettingsSectionDirty,
} from "./SettingsDirtyState";

type PickupPolicyForm = {
  enabled: boolean;

  allowsSameDay: boolean;

  sameDayCutoff: string;

  preparationMinutes: string;

  instructions: string;

  noMorePickupTodayUntil: string | null;
};

type BloomWebsitePickupSettingsProps = {
  initialWebsite: any;
};

function getInitialForm(website: any): PickupPolicyForm {
  return {
    enabled: website?.pickupPolicy?.enabled ?? false,

    allowsSameDay: website?.pickupPolicy?.allowsSameDay ?? true,

    sameDayCutoff: website?.pickupPolicy?.sameDayCutoff || "16:00",

    preparationMinutes: String(website?.pickupPolicy?.preparationMinutes ?? 60),

    instructions: website?.pickupPolicy?.instructions || "",

    noMorePickupTodayUntil:
      website?.pickupPolicy?.noMorePickupTodayUntil || null,
  };
}

function getEditablePickupPolicy(form: PickupPolicyForm) {
  return {
    enabled: form.enabled,
    allowsSameDay: form.allowsSameDay,
    sameDayCutoff: form.sameDayCutoff,
    preparationMinutes: form.preparationMinutes,
    instructions: form.instructions,
  };
}

function isPickupPaused(value: string | null) {
  if (!value) {
    return false;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  return date.getTime() > Date.now();
}

function formatPreparationTime(minutes: number) {
  if (minutes <= 0) {
    return "No additional preparation time";
  }

  if (minutes < 60) {
    return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  }

  const hours = Math.floor(minutes / 60);

  const remainder = minutes % 60;

  if (remainder === 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${hours}h ${remainder}m`;
}

export default function BloomWebsitePickupSettings({
  initialWebsite,
}: BloomWebsitePickupSettingsProps) {
  const router = useRouter();

  const [form, setForm] = useState<PickupPolicyForm>(() =>
    getInitialForm(initialWebsite),
  );

  const [savedForm, setSavedForm] = useState<PickupPolicyForm>(() =>
    getInitialForm(initialWebsite),
  );

  const [isSaving, setIsSaving] = useState(false);

  const [isUpdatingPause, setIsUpdatingPause] = useState(false);

  useEffect(() => {
    const nextForm = getInitialForm(initialWebsite);
    setForm(nextForm);
    setSavedForm(nextForm);
  }, [initialWebsite]);

  useSettingsSectionDirty(
    {
      id: "website-pickup",
      label: "Pickup",
      anchorId: "website-pickup",
    },
    !settingsValuesEqual(
      getEditablePickupPolicy(form),
      getEditablePickupPolicy(savedForm),
    ),
  );

  const pickupPaused = isPickupPaused(form.noMorePickupTodayUntil);

  const preparationNumber = Number(form.preparationMinutes);

  const preparationLabel = useMemo(() => {
    if (!Number.isFinite(preparationNumber)) {
      return "";
    }

    return formatPreparationTime(preparationNumber);
  }, [preparationNumber]);

  function updateBoolean(key: "enabled" | "allowsSameDay", value: boolean) {
    setForm((current) => ({
      ...current,

      [key]: value,
    }));
  }

  async function handleSave() {
    if (isSaving) {
      return;
    }

    const preparationMinutes = Number(form.preparationMinutes);

    if (
      !Number.isFinite(preparationMinutes) ||
      preparationMinutes < 0 ||
      preparationMinutes > 1440
    ) {
      toast.error("Preparation time must be between 0 and 1,440 minutes.");

      return;
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.sameDayCutoff)) {
      toast.error("Choose a valid same-day pickup cutoff.");

      return;
    }

    if (form.instructions.trim().length > 500) {
      toast.error("Pickup instructions must be 500 characters or fewer.");

      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          section: "pickupPolicy",

          data: {
            enabled: form.enabled,

            allowsSameDay: form.allowsSameDay,

            sameDayCutoff: form.sameDayCutoff,

            preparationMinutes: Math.round(preparationMinutes),

            instructions: form.instructions,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to save pickup settings.");
      }

      const nextForm = getInitialForm(data.website);
      setForm(nextForm);
      setSavedForm(nextForm);

      toast.success("Pickup settings saved.");

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save pickup settings.",
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
      const response = await fetch("/api/websites/settings", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          section: "pickupPolicy",

          data: {
            pausePickupToday: !pickupPaused,
          },
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || "Unable to update pickup availability.");
      }

      setForm(getInitialForm(data.website));

      toast.success(
        pickupPaused
          ? "Pickup orders resumed."
          : "Pickup orders stopped for today.",
      );

      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to update pickup availability.",
      );
    } finally {
      setIsUpdatingPause(false);
    }
  }

  useSettingsSectionActions("website-pickup", {
    save: handleSave,
    discard: () => setForm(savedForm),
    isSaving,
  });

  return (
    <section
      id="website-pickup"
      className="scroll-mt-28 overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
    >
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7 sm:py-6">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <ShoppingBag size={21} />
          </div>

          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight text-gray-950">
              Pickup
            </h3>

            <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
              Let customers pick up BloomWebsite orders directly from your
              flower shop.
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-7">
        {/* ENABLE PICKUP */}
        <label className="flex cursor-pointer items-start justify-between gap-5 rounded-2xl border border-gray-200 p-4 sm:p-5">
          <div className="flex min-w-0 gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-purple-700">
              <PackageCheck size={19} />
            </div>

            <div className="min-w-0">
              <p className="font-black text-gray-950">Offer Customer Pickup</p>

              <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                When enabled, customers will be able to choose pickup instead of
                delivery during BloomWebsite checkout.
              </p>
            </div>
          </div>

          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(event) => updateBoolean("enabled", event.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          />
        </label>

        {!form.enabled && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-black text-amber-950">
              Pickup is currently disabled.
            </p>

            <p className="mt-1 text-sm leading-6 text-amber-800">
              These settings can still be configured now. Customers will not see
              pickup until you enable it.
            </p>
          </div>
        )}

        {/* SAME-DAY */}
        <div className="mt-6 rounded-2xl border border-gray-200">
          <label className="flex cursor-pointer items-start justify-between gap-5 p-4 sm:p-5">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50 text-purple-700">
                <Clock3 size={19} />
              </div>

              <div className="min-w-0">
                <p className="font-black text-gray-950">
                  Allow Same-Day Pickup
                </p>

                <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
                  Accept pickup orders for the current day until your pickup
                  cutoff.
                </p>
              </div>
            </div>

            <input
              type="checkbox"
              checked={form.allowsSameDay}
              onChange={(event) =>
                updateBoolean("allowsSameDay", event.target.checked)
              }
              className="mt-1 h-5 w-5 shrink-0 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
          </label>

          {form.allowsSameDay && (
            <div className="border-t border-gray-100 p-4 sm:p-5">
              <label
                htmlFor="pickup-same-day-cutoff"
                className="block text-sm font-black text-gray-800"
              >
                Same-Day Pickup Cutoff
              </label>

              <p className="mt-1 text-sm leading-6 text-gray-500">
                Customers can choose same-day pickup before this time in your
                shop&apos;s local timezone.
              </p>

              <input
                id="pickup-same-day-cutoff"
                type="time"
                value={form.sameDayCutoff}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    sameDayCutoff: event.target.value,
                  }))
                }
                className="mt-4 min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100 sm:max-w-xs"
              />
            </div>
          )}
        </div>

        {/* PREPARATION TIME */}
        <div className="mt-6">
          <label
            htmlFor="pickup-preparation-minutes"
            className="block text-sm font-black text-gray-800"
          >
            Preparation Time
          </label>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Approximately how much time should customers expect your shop to
            need before a pickup order is ready?
          </p>

          <div className="mt-3 flex flex-col gap-2 sm:max-w-sm">
            <div className="flex items-center gap-3">
              <input
                id="pickup-preparation-minutes"
                type="number"
                min="0"
                max="1440"
                step="15"
                value={form.preparationMinutes}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,

                    preparationMinutes: event.target.value,
                  }))
                }
                className="min-h-11 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              />

              <span className="shrink-0 text-sm font-bold text-gray-500">
                minutes
              </span>
            </div>

            {preparationLabel && (
              <p className="text-xs font-semibold text-gray-400">
                Customer-facing estimate: {preparationLabel}
              </p>
            )}
          </div>
        </div>

        {/* PICKUP INSTRUCTIONS */}
        <div className="mt-6">
          <label
            htmlFor="pickup-instructions"
            className="block text-sm font-black text-gray-800"
          >
            Pickup Instructions
          </label>

          <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
            Add anything customers should know when they arrive for pickup.
          </p>

          <textarea
            id="pickup-instructions"
            value={form.instructions}
            onChange={(event) =>
              setForm((current) => ({
                ...current,

                instructions: event.target.value,
              }))
            }
            maxLength={500}
            rows={4}
            placeholder="Example: Please enter through the front door and ask for your online pickup order."
            className="mt-3 w-full rounded-2xl border border-gray-300 bg-white px-4 py-3 text-sm leading-6 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
          />

          <div className="mt-2 flex justify-end">
            <span className="text-xs font-semibold text-gray-400">
              {form.instructions.length}
              /500
            </span>
          </div>
        </div>

        {/* LOCATION NOTE */}
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
          <div className="flex gap-3">
            <MapPin size={19} className="mt-0.5 shrink-0 text-blue-700" />

            <div>
              <p className="text-sm font-black text-blue-950">
                Pickup location
              </p>

              <p className="mt-1 text-sm leading-6 text-blue-800">
                Pickup will use your shared shop address. Customers who choose
                pickup will eventually see the location needed to collect their
                order, even if your address is hidden from general storefront
                browsing.
              </p>
            </div>
          </div>
        </div>

        {/* TEMPORARY PAUSE */}
        <div className="mt-6 rounded-2xl border border-gray-200 p-4 sm:p-5">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  pickupPaused
                    ? "bg-amber-50 text-amber-700"
                    : "bg-gray-50 text-gray-600"
                }`}
              >
                <PauseCircle size={19} />
              </div>

              <div>
                <p className="font-black text-gray-950">
                  {pickupPaused
                    ? "Pickup Orders Paused"
                    : "Stop Pickup Orders for Today"}
                </p>

                <p className="mt-1 max-w-xl text-sm leading-6 text-gray-500">
                  {pickupPaused
                    ? "Customers cannot place pickup orders for the rest of your shop's local day."
                    : "Temporarily stop accepting new pickup orders without disabling pickup permanently."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePauseToggle}
              disabled={isUpdatingPause}
              className={`inline-flex min-h-11 w-full shrink-0 items-center justify-center rounded-full px-5 py-2.5 text-sm font-black transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto ${
                pickupPaused
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              {isUpdatingPause
                ? "Updating..."
                : pickupPaused
                  ? "Resume Pickup Orders"
                  : "Stop for Today"}
            </button>
          </div>
        </div>

        {/* SAVE */}
        <div className="mt-8 flex justify-end border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-purple-600 px-6 py-3 text-sm font-black text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-500 sm:w-auto"
          >
            <Save size={17} />

            {isSaving ? "Saving..." : "Save Pickup Settings"}
          </button>
        </div>
      </div>
    </section>
  );
}
